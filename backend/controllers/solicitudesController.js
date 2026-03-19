// Controlador para obtener las solicitudes
const db = require('../db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

// Se configura el transporte de correo para enviar notificaciones por Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'verificacion.sigrec@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Se obtiene la lista de solicitudes de un vendedor específico
exports.obtenerSolicitudesVendedor = async (req, res) => {
  const vendedorId = req.params.vendedorId;
  const sql = 'SELECT id, tipo, fecha, estado FROM solicitudes WHERE vendedor_id = ? ORDER BY fecha DESC';

  try {
    const [results] = await db.query(sql, [vendedorId]);
    res.json(results); // Se devuelve la lista de solicitudes ordenadas por fecha
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// Se obtiene el detalle de una solicitud específica
exports.obtenerDetalleSolicitud = async (req, res) => {
  const solicitudId = req.params.id;

  try {
    // Se busca la solicitud por ID
    const [results] = await db.query(`SELECT * FROM solicitudes WHERE id = ?`, [solicitudId]);

    if (results.length === 0) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    const solicitud = results[0];
    const { tipo, vendedor_id: vendedorId, estado, detalles, diasVenta, categoriaProducto, nombreProducto } = solicitud;

    const datosGenerales = {
      estado,
      detalles,
      tipo,
      vendedorId
    };

    // Se convierte el campo de días de venta desde JSON a array
    let dias = [];
    try {
      dias = JSON.parse(diasVenta || '[]');
    } catch (error) {
      console.error('Error al parsear días de venta:', error);
    }

    // Se convierte el nombre y categoría de productos desde JSON a array
    let categorias = [];
    let nombres = [];
    try {
      categorias = JSON.parse(categoriaProducto || '[]');
      nombres = JSON.parse(nombreProducto || '[]');
    } catch (error) {
      console.error('Error al parsear productos:', error);
    }

    // Se combinan los nombres y categorías en una lista de objetos producto
    const productos = nombres.map((nombre, index) => ({
      nombre,
      categoria: categorias[index] || null,
      descripcion: '' // No se incluye descripción en este contexto
    }));

    return res.json({
      ...datosGenerales,
      dias,
      productos
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// Se obtiene la lista de solicitudes de nuevos vendedores en estado "En revisión"
exports.obtenerSolicitudesNuevosVendedores = async (req, res) => {
  try {
    // Se consultan las solicitudes de tipo "VendedorNuevo" con estado "En revisión"
    const [solicitudes] = await db.query(`
      SELECT s.id AS solicitudId, s.fecha, s.estado, s.detalles, s.diasVenta,
             v.id AS vendedorId, v.identificacion, 
             u.id AS usuarioId, u.nombre, u.apellidoP, u.apellidoM, u.correo, u.fechaNacimiento, u.genero, u.numCel
      FROM solicitudes s
      JOIN vendedores v ON s.vendedor_id = v.id
      JOIN usuarios u ON v.id_usuario = u.id
      WHERE s.tipo = 'VendedorNuevo' AND s.estado = 'En revisión'
      ORDER BY s.fecha DESC
    `);

    // Se recorren las solicitudes para agregar productos y días de venta
    for (const solicitud of solicitudes) {
      // Se obtiene la lista de productos en estado "En revisión" para el vendedor
      const [productos] = await db.query(
        `SELECT nombre, categoria, descripcion FROM productos WHERE vendedor_id = ? AND estado = 'En revisión'`,
        [solicitud.vendedorId]
      );
      solicitud.productos = productos;

      // Se intenta convertir el campo diasVenta a array
      try {
        solicitud.diasVenta = JSON.parse(solicitud.diasVenta || '[]');
      } catch (error) {
        console.error(`Error al parsear diasVenta de solicitud ${solicitud.solicitudId}:`, error);
        solicitud.diasVenta = [];
      }
    }

    res.json(solicitudes); // Se devuelve la lista completa con productos y días incluidos

  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

// Se aprueba la solicitud de un nuevo vendedor
exports.aprobarSolicitudNuevoVendedor = async (req, res) => {
  const { solicitudId, vigenciaMeses } = req.body;

  // Se valida que existan los datos necesarios
  if (!solicitudId || !vigenciaMeses) {
    return res.status(400).json({ mensaje: 'Faltan datos requeridos.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction(); // Se inicia la transacción

    // Se obtiene la información relacionada con la solicitud
    const [solicitudRows] = await connection.query(`
      SELECT s.vendedor_id AS vendedorId, s.diasVenta, u.correo
      FROM solicitudes s
      JOIN vendedores v ON s.vendedor_id = v.id
      JOIN usuarios u ON v.id_usuario = u.id
      WHERE s.id = ?
    `, [solicitudId]);

    // Se valida que la solicitud exista
    if (solicitudRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    const solicitud = solicitudRows[0];
    const vendedorId = solicitud.vendedorId;

    // Se insertan productos en la tabla productosAprobados si aún no existen
    await connection.query(`
      INSERT INTO productosAprobados (categoria, nombre, descripcion)
      SELECT p.categoria, p.nombre, p.descripcion
      FROM productos p
      WHERE p.vendedor_id = ? 
        AND p.estado = 'En revisión' 
        AND p.solicitud_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM productosAprobados pa 
          WHERE pa.nombre = p.nombre
        )
      `, [vendedorId, solicitudId]);

    // Se actualiza el estado de los productos como aprobados
    await connection.query(`
      UPDATE productos
      SET estado = 'Aprobado'
      WHERE vendedor_id = ? AND estado = 'En revisión' AND solicitud_id = ?
    `, [vendedorId, solicitudId]);

    // Se convierte el campo diasVenta en un arreglo
    let diasVenta = [];
    try {
      diasVenta = JSON.parse(solicitud.diasVenta || '[]');
    } catch (error) {
      console.error('Error al parsear días de venta:', error);
    }

    // Se insertan los días de venta en la tabla correspondiente
    if (diasVenta.length > 0) {
      const valuesDias = diasVenta.map(dia => [vendedorId, dia]);
      await connection.query(
        `INSERT INTO dias_venta (vendedor_id, dia) VALUES ?`,
        [valuesDias]
      );
    }

    // Se calcula la fecha de vigencia del permiso
    const hoy = new Date();
    const vigencia = new Date(hoy.setMonth(hoy.getMonth() + parseInt(vigenciaMeses)));

    // Se inserta o actualiza el permiso del vendedor
    await connection.query(`
      INSERT INTO permisoVendedor (vendedor_id, estado, vigencia)
      VALUES (?, 'Aprobado', ?)
      ON DUPLICATE KEY UPDATE estado = 'Aprobado', vigencia = ?
    `, [vendedorId, vigencia, vigencia]);

    // Se actualiza el estado de la solicitud como aprobada
    await connection.query(`
      UPDATE solicitudes SET estado = 'Aprobada' WHERE id = ?
    `, [solicitudId]);

    await connection.commit(); // Se confirma la transacción
    connection.release();

    // Se envía una notificación por correo al vendedor
    await transporter.sendMail({
      from: `"SIGREC" <${process.env.CORREO_APP}>`,
      to: solicitud.correo,
      subject: 'Solicitud Aprobada',
      text: `Tu solicitud como vendedor ha sido aprobada. Puedes ver los detalles en tu cuenta.`,
    });

    res.status(200).json({ mensaje: 'Solicitud aprobada correctamente' });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error al aprobar solicitud:', error);
    res.status(500).json({ mensaje: 'Error del servidor al aprobar' });
  }
};

// Se rechaza la solicitud de un nuevo vendedor
exports.rechazarSolicitudNuevoVendedor = async (req, res) => {
  const { solicitudId, motivo, productosRechazados } = req.body;

  // Se valida que se hayan enviado los datos mínimos requeridos
  if (!solicitudId || !motivo) {
    return res.status(400).json({ mensaje: 'Faltan datos para procesar el rechazo' });
  }

  // Se valida que el formato de productos rechazados sea correcto
  if (productosRechazados && !Array.isArray(productosRechazados)) {
    return res.status(400).json({ mensaje: 'El formato de productos rechazados es inválido' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction(); // Se inicia la transacción

    // Se obtiene la información de la solicitud
    const [solicitudRows] = await connection.query(
      `SELECT vendedor_id, correo
       FROM solicitudes s
       JOIN vendedores v ON s.vendedor_id = v.id
       JOIN usuarios u ON v.id_usuario = u.id
       WHERE s.id = ?`,
      [solicitudId]
    );

    // Se valida la existencia de la solicitud
    if (solicitudRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    const solicitud = solicitudRows[0];
    const vendedorId = solicitud.vendedor_id;

    // Se actualiza el permiso del vendedor a estado rechazado
    await connection.query(
      'UPDATE permisoVendedor SET estado = ? WHERE vendedor_id = ?',
      ['Rechazado', vendedorId]
    );

    // Se actualiza la solicitud con el estado y motivo del rechazo
    await connection.query(
      'UPDATE solicitudes SET estado = ?, detalles = ? WHERE id = ?',
      ['Rechazada', motivo, solicitudId]
    );

    // Se procesan los productos rechazados si existen
    if (Array.isArray(productosRechazados) && productosRechazados.length > 0) {
      // Se obtiene la información de los productos a rechazar
      const [productos] = await connection.query(
        'SELECT * FROM productos WHERE id IN (?) AND estado = "En revisión"',
        [productosRechazados]
      );

      // Se insertan los productos en la tabla productosRechazados
      for (const prod of productos) {
        await connection.query(
          `INSERT INTO productosRechazados (categoria, nombre, descripcion)
           VALUES (?, ?, ?)`,
          [prod.categoria, prod.nombre, prod.descripcion]
        );
      }

      // Se eliminan los productos rechazados de la tabla original
      await connection.query(
        'UPDATE productos SET estado = ? WHERE id IN (?)',
        ['Rechazado', productosRechazados]
      );
    }

    await connection.commit(); // Se confirma la transacción
    connection.release();

    // Se envía una notificación por correo al vendedor
    await transporter.sendMail({
      from: `"SIGREC" <${process.env.CORREO_APP}>`,
      to: solicitud.correo,
      subject: 'Solicitud Rechazada',
      text: `Tu solicitud como vendedor ha sido rechazada. Puedes revisar los detalles desde tu cuenta.`,
    });

    return res.status(200).json({ mensaje: 'Solicitud rechazada correctamente' });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error al rechazar la solicitud:', error);
    return res.status(500).json({ mensaje: 'Error del servidor al procesar el rechazo' });
  }
};

// Controlador para obtener productos asociados a una solicitud específica
exports.obtenerProductosPorSolicitud = async (req, res) => {
  // Se extrae el ID de la solicitud desde los parámetros de la petición
  const { solicitudId } = req.params;

  try {
    // Se realiza una consulta para obtener los productos en estado "En revisión" asociados a la solicitud
    const [productos] = await db.query(
      'SELECT id, nombre, categoria FROM productos WHERE solicitud_id = ? AND estado = "En revisión"',
      [solicitudId]
    );
    // Se responde con los productos obtenidos en formato JSON
    res.json(productos);
  } catch (err) {
    // Se imprime el error en consola y se responde con un error 500
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener productos' });
  }
};

// Controlador para obtener solicitudes de tipo "Vendedor" que se encuentren en estado "En revisión"
exports.obtenerSolicitudesVendedores = async (req, res) => {
  try {
    // Se realiza la consulta principal para obtener solicitudes con información del vendedor y del usuario
    const [solicitudes] = await db.query(`
      SELECT s.id AS solicitudId, s.fecha, s.estado, s.detalles, s.diasVenta,
             v.id AS vendedorId, v.identificacion, 
             u.id AS usuarioId, u.nombre, u.apellidoP, u.apellidoM, u.correo, u.fechaNacimiento, u.genero, u.numCel
      FROM solicitudes s
      JOIN vendedores v ON s.vendedor_id = v.id
      JOIN usuarios u ON v.id_usuario = u.id
      WHERE s.tipo = 'Vendedor' AND s.estado = 'En revisión'
      ORDER BY s.fecha DESC
    `);

    // Se itera sobre cada solicitud para completar la información adicional
    for (const solicitud of solicitudes) {
      // Se obtienen los productos en estado "En revisión" relacionados con la solicitud
      const [productos] = await db.query(
        `SELECT categoria, nombre, descripcion FROM productos WHERE solicitud_id = ? AND estado = 'En revisión'`,
        [solicitud.solicitudId]
      );
      // Se asignan los productos a la solicitud actual
      solicitud.productos = productos;

      // Se intenta convertir el campo JSON de días de venta en un arreglo
      try {
        solicitud.diasVenta = JSON.parse(solicitud.diasVenta || '[]');
      } catch (error) {
        // Si ocurre un error en el parseo, se muestra en consola y se asigna un arreglo vacío
        console.error(`Error al parsear diasVenta de solicitud ${solicitud.solicitudId}:`, error);
        solicitud.diasVenta = [];
      }
    }

    // Se responde con la lista de solicitudes completas en formato JSON
    res.json(solicitudes);

  } catch (error) {
    // Se imprime el error en consola y se responde con un error 500
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

// Controlador para obtener solicitudes de tipo "Productos" que se encuentren en estado "En revisión"
exports.obtenerSolicitudesProductos = async (req, res) => {
  try {
    // Se realiza la consulta principal para obtener solicitudes con información básica del vendedor y del usuario
    const [solicitudes] = await db.query(`
      SELECT s.id AS solicitudId, s.fecha, s.estado, s.detalles,
             v.id AS vendedorId,
             u.id AS usuarioId, u.nombre, u.apellidoP, u.apellidoM
      FROM solicitudes s
      JOIN vendedores v ON s.vendedor_id = v.id
      JOIN usuarios u ON v.id_usuario = u.id
      WHERE s.tipo = 'Productos' AND s.estado = 'En revisión'
      ORDER BY s.fecha DESC
    `);

    // Se itera sobre cada solicitud para agregar los productos relacionados
    for (const solicitud of solicitudes) {
      // Se obtienen los productos en estado "En revisión" relacionados con la solicitud
      const [productos] = await db.query(
        `SELECT categoria, nombre, descripcion FROM productos WHERE solicitud_id = ? AND estado = 'En revisión'`,
        [solicitud.solicitudId]
      );
      // Se asignan los productos a la solicitud actual
      solicitud.productos = productos;
    }

    // Se responde con la lista de solicitudes completas en formato JSON
    res.json(solicitudes);

  } catch (error) {
    // Se imprime el error en consola y se responde con un error 500
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

// Controlador para aprobar una solicitud de productos
exports.aprobarSolicitudProductos = async (req, res) => {
  // Se obtiene la conexión a la base de datos
  const connection = await db.getConnection();
  const { solicitudId } = req.body;

  try {
    // Se inicia la transacción
    await connection.beginTransaction();

    // Se obtiene la información del vendedor y correo del usuario relacionado con la solicitud
    const [solicitudRows] = await connection.query(`
      SELECT s.vendedor_id AS vendedorId, u.correo
      FROM solicitudes s
      JOIN vendedores v ON s.vendedor_id = v.id
      JOIN usuarios u ON v.id_usuario = u.id
      WHERE s.id = ?
    `, [solicitudId]);

    // Se verifica si la solicitud existe
    if (solicitudRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    const solicitud = solicitudRows[0];
    const vendedorId = solicitud.vendedorId;

    // Se insertan los productos aprobados en la tabla productosAprobados si no existen previamente
    await connection.query(`
      INSERT INTO productosAprobados (categoria, nombre, descripcion)
      SELECT p.categoria, p.nombre, p.descripcion
      FROM productos p
      WHERE p.vendedor_id = ? 
        AND p.estado = 'En revisión' 
        AND p.solicitud_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM productosAprobados pa 
          WHERE pa.nombre = p.nombre
        )
    `, [vendedorId, solicitudId]);

    // Se actualiza el estado de los productos a "Aprobado"
    await connection.query(`
      UPDATE productos
      SET estado = 'Aprobado'
      WHERE vendedor_id = ? AND estado = 'En revisión' AND solicitud_id = ?
    `, [vendedorId, solicitudId]);

    // Se actualiza el estado de la solicitud a "Aprobada"
    await connection.query(`
      UPDATE solicitudes SET estado = 'Aprobada' WHERE id = ?
    `, [solicitudId]);

    // Se confirma la transacción
    await connection.commit();
    connection.release();

    // Se envía una notificación por correo al usuario
    await transporter.sendMail({
      from: `"SIGREC" <${process.env.CORREO_APP}>`,
      to: solicitud.correo,
      subject: 'Solicitud Aprobada',
      text: `Tu solicitud de productos ha sido aprobada. Puedes ver los detalles en tu cuenta.`,
    });

    // Se devuelve una respuesta exitosa
    res.status(200).json({ mensaje: 'Solicitud aprobada correctamente' });

  } catch (error) {
    // En caso de error, se revierte la transacción y se libera la conexión
    await connection.rollback();
    connection.release();
    console.error('Error al aprobar solicitud:', error);
    res.status(500).json({ mensaje: 'Error del servidor al aprobar' });
  }
};

// Controlador para rechazar una solicitud de productos
exports.rechazarSolicitudProductos = async (req, res) => {
  const { solicitudId, motivo, productosRechazados } = req.body;

  // Se valida que se hayan recibido el ID de la solicitud y el motivo
  if (!solicitudId || !motivo) {
    return res.status(400).json({ mensaje: 'Faltan datos para procesar el rechazo' });
  }

  // Se valida que productosRechazados, si existe, sea un arreglo
  if (productosRechazados && !Array.isArray(productosRechazados)) {
    return res.status(400).json({ mensaje: 'El formato de productos rechazados es inválido' });
  }

  const connection = await db.getConnection();  // Se obtiene conexión para iniciar la transacción
  try {
    await connection.beginTransaction(); // Se inicia la transacción

    // Se obtiene el vendedor y correo asociados a la solicitud
    const [solicitudRows] = await connection.query(
      `SELECT vendedor_id AS vendedorId, u.correo
       FROM solicitudes s
       JOIN vendedores v ON s.vendedor_id = v.id
       JOIN usuarios u ON v.id_usuario = u.id
       WHERE s.id = ?`,
      [solicitudId]
    );

    // Se valida que la solicitud exista
    if (solicitudRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    const solicitud = solicitudRows[0];
    const vendedorId = solicitud.vendedor_id;

    // Se actualiza el estado de la solicitud a "Rechazada" y se guarda el motivo en detalles
    await connection.query(
      'UPDATE solicitudes SET estado = ?, detalles = ? WHERE id = ?',
      ['Rechazada', motivo, solicitudId]
    );

    // Si se especificaron productos rechazados, se procesan
    if (Array.isArray(productosRechazados) && productosRechazados.length > 0) {
      // Se obtienen los productos en estado "En revisión" cuyo ID está en la lista de rechazo
      const [productos] = await connection.query(
        'SELECT * FROM productos WHERE id IN (?) AND estado = "En revisión"',
        [productosRechazados]
      );

      // Se insertan los productos en la tabla productosRechazados
      for (const prod of productos) {
        await connection.query(
          `INSERT INTO productosRechazados (categoria, nombre, descripcion)
           VALUES (?, ?, ?)`,
          [prod.categoria, prod.nombre, prod.descripcion]
        );
      }

      // Se cambia el estado de los productos rechazados de la tabla productos
      await connection.query(
        'UPDATE productos SET estado = ? WHERE id IN (?)',
        ['Rechazado', productosRechazados]
      );
    }

    // Se confirma la transacción
    await connection.commit();
    connection.release();

    // Se envía un correo notificando el rechazo al usuario
    await transporter.sendMail({
      from: `"SIGREC" <${process.env.CORREO_APP}>`,
      to: solicitud.correo,
      subject: 'Solicitud rechazada',
      text: `Tu solicitud de productos ha sido rechazada. Puedes revisar los detalles desde tu cuenta.`,
    });

    return res.status(200).json({ mensaje: 'Solicitud rechazada correctamente' });

  } catch (error) {
    // En caso de error, se revierte la transacción y se libera la conexión
    await connection.rollback();
    connection.release();
    console.error('Error al rechazar la solicitud:', error);
    return res.status(500).json({ mensaje: 'Error del servidor al procesar el rechazo' });
  }
};

// Controlador para buscar una solicitud 
exports.buscarSolicitudes = async (req, res) => {
  const { query, tipo, estado } = req.query;

  // Consulta base para obtener la información de una solicitud y su producto asociado
  let sql = `
    SELECT s.id AS solicitudId, s.fecha, s.estado, s.tipo, s.detalles,
           s.diasVenta, s.categoriaProducto, s.nombreProducto,
           u.nombre AS nombre, u.apellidoP, u.apellidoM, u.correo, u.genero,
           u.fechaNacimiento, u.numCel, v.identificacion,
           p.id AS productoId, p.nombre AS producto, p.categoria, p.descripcion
    FROM solicitudes s
    JOIN vendedores v ON s.vendedor_id = v.id
    JOIN usuarios u ON v.id_usuario = u.id
    LEFT JOIN productos p ON p.solicitud_id = s.id
    WHERE 1 = 1
  `;

  const params = [];

  // Se agrega condición de búsqueda general si existe un query
  if (query) {
    sql += ` AND (
      u.nombre LIKE ? OR u.apellidoP LIKE ? OR u.apellidoM LIKE ? OR
      p.nombre LIKE ? OR p.categoria LIKE ?
    )`;
    const q = `%${query}%`;
    params.push(q, q, q, q, q);
  }

  // Se filtra por tipo si se proporciona
  if (tipo) {
    sql += ` AND s.tipo = ?`;
    params.push(tipo);
  }

  // Se filtra por estado si se proporciona
  if (estado) {
    sql += ` AND s.estado = ?`;
    params.push(estado);
  }

  // Se ordenan los resultados por fecha más reciente
  sql += ` ORDER BY s.fecha DESC`;

  try {
    const [rows] = await db.query(sql, params);

    // Se agrupan los productos por cada solicitud única
    const solicitudesMap = new Map();

    rows.forEach(row => {
      // Si aún no se ha registrado la solicitud, se inicializa
      if (!solicitudesMap.has(row.solicitudId)) {
        solicitudesMap.set(row.solicitudId, {
          solicitudId: row.solicitudId,
          fecha: row.fecha,
          estado: row.estado,
          tipo: row.tipo,
          detalles: row.detalles,
          diasVenta: row.diasVenta ? JSON.parse(row.diasVenta) : [],
          nombre: row.nombre,
          apellidoP: row.apellidoP,
          apellidoM: row.apellidoM,
          correo: row.correo,
          genero: row.genero,
          fechaNacimiento: row.fechaNacimiento,
          numCel: row.numCel,
          identificacion: row.identificacion,
          productos: [],
        });
      }

      // Se agrega un producto a la solicitud correspondiente si existe
      if (row.productoId) {
        solicitudesMap.get(row.solicitudId).productos.push({
          id: row.productoId,
          nombre: row.producto,
          categoria: row.categoria,
          descripcion: row.descripcion
        });
      }
    });

    // Se responde con la lista de solicitudes agrupadas
    res.json(Array.from(solicitudesMap.values()));
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ error: 'Error al buscar la solicitud' });
  }
};

