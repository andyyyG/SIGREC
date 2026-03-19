const db = require('../db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'verificacion.sigrec@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Buscar resumen de vendedores
exports.obtenerVendedores = async (req, res) => {
  const { query, estado } = req.query;

  let sql = `
    SELECT v.id AS vendedorId, 
           u.nombre, u.apellidoP, u.apellidoM, 
           pv.estado AS estado_permiso, pv.vigencia,
           GROUP_CONCAT(p.nombre SEPARATOR ', ') AS productos,
           GROUP_CONCAT(p.categoria SEPARATOR ', ') AS categorias
    FROM vendedores v
    JOIN usuarios u ON v.id_usuario = u.id
    LEFT JOIN permisovendedor pv ON pv.vendedor_id = v.id
    LEFT JOIN productos p ON p.vendedor_id = v.id
    WHERE 1 = 1
  `;

  const params = [];

  if (query) {
    sql += ` AND (
      u.nombre LIKE ? OR u.apellidoP LIKE ? OR u.apellidoM LIKE ? OR 
      p.nombre LIKE ? OR p.categoria LIKE ?
    )`;
    const q = `%${query}%`;
    params.push(q, q, q, q, q);
  }

  if (estado) {
    sql += ` AND pv.estado = ?`;
    params.push(estado);
  }

  sql += ` GROUP BY v.id ORDER BY u.nombre ASC`;

  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener vendedores:', error);
    res.status(500).json({ error: 'Error al obtener vendedores' });
  }
};

// Obtener detalle completo de un vendedor
exports.obtenerVendedorDetalle = async (req, res) => {
  const vendedorId = req.params.id;

  try {
    // Info general
    const [vendedorRows] = await db.query(`
      SELECT v.id AS vendedorId, v.identificacion, u.*, pv.estado AS estado_permiso, pv.vigencia
      FROM vendedores v
      JOIN usuarios u ON v.id_usuario = u.id
      LEFT JOIN permisovendedor pv ON pv.vendedor_id = v.id
      WHERE v.id = ?
    `, [vendedorId]);

    if (vendedorRows.length === 0) {
      return res.status(404).json({ error: 'Vendedor no encontrado' });
    }

    // Obtener días de venta
    const [diasRows] = await db.query(`
      SELECT dia
      FROM dias_venta
      WHERE vendedor_id = ?
    `, [vendedorId]);

    const diasVenta = diasRows.map(row => row.dia);

    // Productos
    const [productos] = await db.query(`
      SELECT id, nombre, categoria, descripcion
      FROM productos
      WHERE vendedor_id = ?
    `, [vendedorId]);

    // Reportes
    const [reportes] = await db.query(`
      SELECT motivo, descripcion
      FROM reportes
      WHERE vendedor_id = ?
    `, [vendedorId]);

    res.json({
      ...vendedorRows[0],
      diasVenta,
      productos,
      reportes
    });
  } catch (error) {
    console.error('Error al obtener detalle vendedor:', error);
    res.status(500).json({ error: 'Error al obtener detalle del vendedor' });
  }
};

//Buscar productos
exports.buscarProductos = async (req, res) => {
  const { query, categoria, estado } = req.query;

  // Seleccionar la tabla correcta
  let tabla = 'productos';
  if (estado === 'Aceptado') {
    tabla = 'productosaprobados';
  } else if (estado === 'Rechazado') {
    tabla = 'productosrechazados';
  }

  // Armar SQL base
  let sql = `
    SELECT id, nombre, categoria, descripcion
    FROM ${tabla}
    WHERE 1 = 1
  `;
  const params = [];

  // Filtrar por nombre
  if (query) {
    sql += ` AND nombre LIKE ?`;
    params.push(`%${query}%`);
  }

  // Filtrar por categoría
  if (categoria) {
    sql += ` AND categoria = ?`;
    params.push(categoria);
  }

  sql += ` ORDER BY nombre ASC`;

  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Error al buscar productos:', error);
    res.status(500).json({ error: 'Error al buscar productos' });
  }
};

//Obtener estadísticas
exports.obtenerEstadisticas = async (req, res) => {
  try {
    // Total vendedores
    const [totalRows] = await db.query(`SELECT COUNT(*) AS total FROM vendedores`);
    const total = totalRows[0].total || 1;

    // Por género
    const [generoRows] = await db.query(`
      SELECT u.genero, COUNT(*) AS cantidad
      FROM vendedores v
      JOIN usuarios u ON v.id_usuario = u.id
      GROUP BY u.genero
    `);

    // Por día de venta
    const [diasRows] = await db.query(`
      SELECT dia, COUNT(DISTINCT vendedor_id) AS cantidad
      FROM dias_venta
      GROUP BY dia
    `);

    // Por estado de permiso
    const [permisoRows] = await db.query(`
      SELECT estado, COUNT(*) AS cantidad
      FROM permisovendedor
      GROUP BY estado
    `);

    // Productos por categoría (de tabla productos)
    const [categoriasRows] = await db.query(`
      SELECT categoria, COUNT(*) AS cantidad
      FROM productos
      GROUP BY categoria
    `);

    // Estado de productos (en revisión, aprobados, rechazados)
    const [aprobadosRows] = await db.query(`SELECT COUNT(*) AS cantidad FROM productosaprobados`);
    const [rechazadosRows] = await db.query(`SELECT COUNT(*) AS cantidad FROM productosrechazados`);
    const [revisionRows] = await db.query(`SELECT COUNT(*) AS cantidad FROM productos`);

    // Convertir arrays a objetos para frontend
    const genero = { hombres: 0, mujeres: 0 };
    generoRows.forEach(row => {
      if (row.genero.toLowerCase() === 'hombre') genero.hombres = row.cantidad;
      else if (row.genero.toLowerCase() === 'mujer') genero.mujeres = row.cantidad;
    });

    const diasVenta = {};
    diasRows.forEach(row => {
      diasVenta[row.dia.toLowerCase()] = row.cantidad;
    });

    const permisos = {};
    permisoRows.forEach(row => {
      permisos[row.estado.toLowerCase()] = row.cantidad;
    });

    const categoriasProductos = {};
    categoriasRows.forEach(row => {
      categoriasProductos[row.categoria.toLowerCase()] = row.cantidad;
    });

    // Enviar JSON con estructura correcta para frontend
    res.json({
      totalVendedores: total,
      hombres: genero.hombres,
      mujeres: genero.mujeres,
      diasVenta,
      permisos,
      categoriasProductos,
      productosAprobados: aprobadosRows[0].cantidad,
      productosRechazados: rechazadosRows[0].cantidad,
      productosRevision: revisionRows[0].cantidad
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

//Crear reportes a vendedores
exports.crearReporte = async (req, res) => {
  const { vendedorId, motivo, descripcion } = req.body;

  if (!vendedorId || !motivo || !descripcion) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  try {
    // Insertar el reporte en la tabla
    await db.query(
      `INSERT INTO reportes (vendedor_id, motivo, descripcion) VALUES (?, ?, ?)`,
      [vendedorId, motivo, descripcion]
    );

    // Obtener correo del vendedor
    const [vendedorRows] = await db.query(
      `SELECT u.correo, u.nombre 
       FROM vendedores v
       JOIN usuarios u ON v.id_usuario = u.id
       WHERE v.id = ?`,
      [vendedorId]
    );

    if (vendedorRows.length === 0) {
      return res.status(404).json({ error: 'Vendedor no encontrado' });
    }

    const correoVendedor = vendedorRows[0].correo;
    const nombreVendedor = vendedorRows[0].nombre;

    // Configurar correo
    const mailOptions = {
      from: `"SIGREC" <${process.env.CORREO_APP}>`,
      to: correoVendedor,
      subject: 'Notificación de nuevo reporte',
      html: `
        <p>Hola <strong>${nombreVendedor}</strong>,</p>
        <p>Se ha generado un nuevo reporte en tu cuenta.</p><br />
        <p><strong>Motivo:</strong> ${motivo}</p><br />
        <p><strong>Descripción:</strong> ${descripcion}</p><br />
        <p>Por favor revisa tu perfil o comunícate a verificacion.sigrec@gmail.com si necesitas aclarar el reporte.</p><br />
        <p>Saludos,</p>
        <p><em>Equipo SIGREC</em></p>
      `
    };

    // Enviar correo
    await transporter.sendMail(mailOptions);

    res.json({ mensaje: 'Reporte creado y correo enviado correctamente' });
  } catch (error) {
    console.error('Error al crear reporte:', error);
    res.status(500).json({ error: 'Error al crear el reporte' });
  }
};

//Crear avisos
exports.crearAviso = async (req, res) => {
  const { titulo, contenido } = req.body;

  if (!titulo || !contenido) {
    return res.status(400).json({ error: 'Título y contenido son requeridos' });
  }

  try {
    // Insertar en la base de datos
    await db.query(`
      INSERT INTO avisos (titulo, contenido)
      VALUES (?, ?)
    `, [titulo, contenido]);

    // Obtener correos de vendedores
    const [vendedores] = await db.query(`
      SELECT u.correo
      FROM vendedores v
      JOIN usuarios u ON v.id_usuario = u.id
    `);

    // Enviar correo a cada vendedor
    for (const vendedor of vendedores) {
      const mailOptions = {
        from: `"SIGREC" <${process.env.CORREO_APP}>`,
        to: vendedor.correo,
        subject: `Nuevo aviso: ${titulo}`,
        html: `
          <h2>${titulo}</h2>
          <p>${contenido}</p>
          <p>Este es un aviso enviado por SIGREC.</p>
        `
      };

      await transporter.sendMail(mailOptions);
    }

    res.status(201).json({ message: 'Aviso creado y correos enviados correctamente' });
  } catch (error) {
    console.error('Error al crear aviso y enviar correos:', error);
    res.status(500).json({ error: 'Error al crear aviso o enviar correos' });
  }
};

// Obtener todos los avisos
exports.obtenerAvisos = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, titulo, contenido, fecha_publicacion
      FROM avisos
      ORDER BY fecha_publicacion DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener avisos:', error);
    res.status(500).json({ error: 'Error al obtener avisos' });
  }
};

//Revocación de permiso
exports.revocarPermiso = async (req, res) => {
  const vendedorId = req.params.id;
  const { motivo } = req.body;

  if (!motivo) {
    return res.status(400).json({ error: 'El motivo es requerido' });
  }

  try {
    // Actualizar estado
    await db.query(
      `UPDATE permisovendedor SET estado = 'Revocado', vigencia = NULL WHERE vendedor_id = ?`,
      [vendedorId]
    );

    // Obtener correo del vendedor
    const [vendedorRows] = await db.query(`
      SELECT u.correo, u.nombre
      FROM vendedores v
      JOIN usuarios u ON v.id_usuario = u.id
      WHERE v.id = ?
    `, [vendedorId]);

    if (vendedorRows.length === 0) {
      return res.status(404).json({ error: 'Vendedor no encontrado' });
    }

    const correo = vendedorRows[0].correo;
    const nombre = vendedorRows[0].nombre;

    const mailOptions = {
      from: `"SIGREC" <${process.env.CORREO_APP}>`,
      to: correo,
      subject: 'Tu permiso ha sido revocado',
      html: `
        <p>Hola ${nombre},</p>
        <p>Tu permiso ha sido revocado por el siguiente motivo:</p>
        <blockquote>${motivo}</blockquote>
        <p>Si tienes dudas, por favor comunícate con la administración.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Permiso revocado y correo enviado' });

  } catch (error) {
    console.error('Error al revocar permiso:', error);
    res.status(500).json({ error: 'Error al revocar permiso' });
  }
};
