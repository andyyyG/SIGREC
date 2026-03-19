//Controlador para todo el modulo de vendedores y las funciones que este debe hacer
const db = require('../db');
const bcrypt = require('bcrypt');

//Funcion para registrar un nuevo vendedor
exports.registrarVendedor = async (req, res) => { 
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction(); // Iniciar transacción

    const usuarioId = req.body.usuarioId;
    const diasVenta = JSON.parse(req.body.dias_venta || '[]');
    const productos = JSON.parse(req.body.productos || '[]');
    const identificacionArchivo = req.file ? req.file.filename : null;

    if (!usuarioId || !identificacionArchivo) {
      await connection.rollback();
      return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
    }

    // Verificar si el usuario ya es un vendedor
    const [vendedorExistente] = await connection.query(
      `SELECT id FROM vendedores WHERE id_usuario = ?`,
      [usuarioId]
    );

    if (vendedorExistente.length > 0) {
      await connection.rollback();
      return res.status(400).json({ mensaje: 'Ya tienes una cuenta de vendedor registrada' });
    }

    // Verificar coincidencias parciales en productosRechazados
    const nombresRechazados = [];
    for (const producto of productos) {
      const nombre = producto.nombre.toLowerCase();
      const [rechazado] = await connection.query(
        `SELECT nombre FROM productosRechazados WHERE LOWER(nombre) LIKE ?`,
        [`%${nombre}%`]
      );
      if (rechazado.length > 0) {
        nombresRechazados.push(producto.nombre);
      }
    }

    if (nombresRechazados.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        mensaje: `No se puede registrar la solicitud. Los siguientes productos fueron rechazados anteriormente o coinciden con uno rechazado: ${nombresRechazados.join(', ')}`
      });
    }

    // Insertar nuevo vendedor
    const [vendedorResult] = await connection.query(
      `INSERT INTO vendedores (id_usuario, identificacion) VALUES (?, ?)`,
      [usuarioId, identificacionArchivo]
    );
    const idVendedor = vendedorResult.insertId;

    // Insertar permiso en revisión
    await connection.query(
      `INSERT INTO permisoVendedor (vendedor_id, estado) VALUES (?, 'En revisión')`,
      [idVendedor]
    );

    // Preparar arrays para columnas adicionales
    const diasVentaJson = JSON.stringify(diasVenta);
    const categoriasArray = productos.map(p => p.categoria);
    const nombresArray = productos.map(p => p.nombre);
    const categoriasJson = JSON.stringify(categoriasArray);
    const nombresJson = JSON.stringify(nombresArray);

    // Crear solicitud con columnas extendidas
    const [solicitudResult] = await connection.query(
      `INSERT INTO solicitudes (vendedor_id, tipo, estado, diasVenta, categoriaProducto, nombreProducto) 
       VALUES (?, 'VendedorNuevo', 'En revisión', ?, ?, ?)`,
      [idVendedor, diasVentaJson, categoriasJson, nombresJson]
    );
    const solicitudId = solicitudResult.insertId;

    // Insertar productos
    if (productos.length > 0) {
      const valuesProductos = productos.map(prod => [
        idVendedor,
        prod.categoria,
        prod.nombre,
        prod.descripcion,
        'En revisión',
        solicitudId
      ]);

      await connection.query(
        `INSERT INTO productos (vendedor_id, categoria, nombre, descripcion, estado, solicitud_id) VALUES ?`,
        [valuesProductos]
      );
    }

    await connection.commit();
    res.json({ mensaje: 'Solicitud enviada correctamente' });

  } catch (error) {
    await connection.rollback();
    console.error('Error al registrar solicitud:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  } finally {
    connection.release();
  }
};

exports.tienePermiso = async (req, res) => {
  try {
    const usuarioId = req.params.id; // Aquí usas usuarioId

    const sql = `
      SELECT COUNT(*) AS total
      FROM permisoVendedor pv
      JOIN vendedores v ON pv.vendedor_id = v.id
      WHERE v.id_usuario = ?
      AND pv.estado IN ('En revisión', 'Aprobado', 'Rechazado', 'Vencido', 'Revocado')
    `;

    const [rows] = await db.query(sql, [usuarioId]);

    const tienePermiso = rows[0].total > 0;

    res.json({ tienePermiso });
  } catch (error) {
    console.error('Error al consultar permiso:', error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};

//Funcion para obtener los datos personales del vendedor
exports.obtenerVendedorPorId = async (req, res) => {
  const usuarioId = req.params.id;

  const sql = `
    SELECT nombre, apellidoP, apellidoM, genero, correo,
           fechaNacimiento, numCel
    FROM usuarios 
    WHERE id = ? AND tipo = 'vendedor'
  `;

  try {
    const [resultados] = await db.query(sql, [usuarioId]);

    if (resultados.length === 0) {
      console.log("No se encontró usuario vendedor con ID:", usuarioId);
      return res.status(404).json({ mensaje: 'Vendedor no encontrado' });
    }

    console.log("Vendedor encontrado:", resultados[0]);
    res.json(resultados[0]);
  } catch (err) {
    console.error('Error al obtener datos del vendedor:', err);
    return res.status(500).json({ mensaje: 'Error al obtener datos del vendedor' });
  }
};

//Funcion para actualizar datos personales del vendedor
exports.actualizarVendedor = async (req, res) => {
  const usuarioId = req.params.id;
  const {
    nombre,
    apellidoP,
    apellidoM,
    genero,
    fechaNacimiento,
    numCel
  } = req.body;

  try {
    const sqlUpdateUsuario = `
      UPDATE usuarios 
      SET nombre = ?, apellidoP = ?, apellidoM = ?, genero = ?, fechaNacimiento = ?, numCel = ?
      WHERE id = ? AND tipo = 'vendedor'
    `;

    const [result] = await db.query(sqlUpdateUsuario, [
      nombre,
      apellidoP,
      apellidoM,
      genero,
      fechaNacimiento,
      numCel,
      usuarioId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Usuario vendedor no encontrado' });
    }
    res.json({ mensaje: 'Datos actualizados correctamente' });
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};

//Funcion para obtener los datos comerciales de los vendedores
exports.obtenerInfoComercial = async (req, res) => {
  const vendedorId = req.params.id;

  try {
    // Verifica que exista el vendedor
    const [vendedorResult] = await db.query(
      'SELECT id FROM vendedores WHERE id = ?',
      [vendedorId]
    );

    if (vendedorResult.length === 0) {
      return res.status(404).json({ mensaje: 'No hay información comercial para este vendedor' });
    }

    // Obtener el permiso más reciente
    const sqlPermiso = `
      SELECT estado, vigencia
      FROM permisoVendedor
      WHERE vendedor_id = ?
      ORDER BY fecha_solicitud DESC
      LIMIT 1
    `;
    const [permisoResult] = await db.query(sqlPermiso, [vendedorId]);

    const permiso = permisoResult[0]?.estado || 'Sin permiso';
    const vigencia = permiso === 'En revisión' ? '' : (permisoResult[0]?.vigencia || '');

    // Consulta días de venta
    const sqlDias = 'SELECT dia FROM dias_venta WHERE vendedor_id = ?';
    const [diasResult] = await db.query(sqlDias, [vendedorId]);
    const diasVenta = diasResult.map(row => row.dia);

    // Consulta productos aprobados
    const sqlProductos = 'SELECT id, nombre FROM productos WHERE vendedor_id = ? AND estado = "Aprobado"';
    const [productosResult] = await db.query(sqlProductos, [vendedorId]);

    console.log('Permiso enviado:', permiso);

    return res.json({
      permisoVendedor: {
        estado: permiso,
        vigencia
      },
      diasVenta,
      productos: productosResult
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensaje: 'Error en el servidor' });
  }
}; 

//Funcion para actualizar datos comerciales de vendedores
exports.actualizarInfoComercial = async (req, res) => {
  const vendedorId = req.params.id;
  const { diasVenta, productos } = req.body;

  if (!Array.isArray(diasVenta) || !Array.isArray(productos)) {
    return res.status(400).json({ mensaje: 'Formato de datos inválido' });
  }

  try {
    // Eliminar días de venta existentes
    const sqlBorrarDias = 'DELETE FROM dias_venta WHERE vendedor_id = ?';
    await db.query(sqlBorrarDias, [vendedorId]);

    // Insertar nuevos días de venta si existen
    if (diasVenta.length > 0) {
      const valuesDias = diasVenta.map(dia => [vendedorId, dia]);
      const sqlInsertDias = 'INSERT INTO dias_venta (vendedor_id, dia) VALUES ?';
      await db.query(sqlInsertDias, [valuesDias]);
    }

    // Procesar productos
    const productosIds = productos.map(p => p.id);

    let sqlEliminarProductos;
    let params;

    if (productosIds.length === 0) {
      sqlEliminarProductos = 'DELETE FROM productos WHERE vendedor_id = ?';
      params = [vendedorId];
    } else {
      const placeholders = productosIds.map(() => '?').join(',');
      sqlEliminarProductos = `DELETE FROM productos WHERE vendedor_id = ? AND id NOT IN (${placeholders})`;
      params = [vendedorId, ...productosIds];
    }

    await db.query(sqlEliminarProductos, params);

    return res.json({ mensaje: 'Información comercial actualizada correctamente' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensaje: 'Error en el servidor' });
  }
}; 

//Funcion para registrar productos nuevos
exports.registrarProductosVendedor = async (req, res) => {
  const vendedorId = req.params.vendedorId;
  const productos = req.body.productos;

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ mensaje: 'No se proporcionaron productos para registrar' });
  }

  for (const prod of productos) {
    if (!prod.categoria || !prod.nombre || !prod.descripcion) {
      return res.status(400).json({ mensaje: 'Todos los productos deben tener categoría, nombre y descripción' });
    }
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Verificar permiso actual
    const [permisoRows] = await connection.query(
      'SELECT estado FROM permisoVendedor WHERE vendedor_id = ? FOR UPDATE',
      [vendedorId]
    );

    if (permisoRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ mensaje: 'Permiso de vendedor no encontrado' });
    }

    if (permisoRows[0].estado !== 'Aprobado') {
      await connection.rollback();
      return res.status(403).json({ mensaje: 'Tu permiso de vendedor no ha sido aprobado' });
    }

    // Buscar productos rechazados 
    const nombresLower = productos.map(p => p.nombre.toLowerCase());
    const placeholders = nombresLower.map(() => '?').join(', ');

    const [rechazados] = await connection.query(
      `SELECT nombre FROM productosRechazados WHERE LOWER(nombre) IN (${placeholders})`,
      nombresLower
    );

    if (rechazados.length > 0) {
      await connection.rollback();

      const nombresRechazados = rechazados.map(p => p.nombre).join(', ');
      return res.status(400).json({
        mensaje: `No se puede registrar la solicitud. Los siguientes productos ya fueron rechazados anteriormente: ${nombresRechazados}`
      });
    }

    // Construir arrays para categorías y nombres (para insertar en solicitudes)
    const categoriasArray = productos.map(prod => prod.categoria);
    const nombresArray = productos.map(prod => prod.nombre);
    const categoriasJson = JSON.stringify(categoriasArray);
    const nombresJson = JSON.stringify(nombresArray);

    // Insertar solicitud 
    const [resultSolicitud] = await connection.query(
      `INSERT INTO solicitudes (vendedor_id, tipo, estado, categoriaProducto, nombreProducto) VALUES (?, 'Productos', 'En revisión', ?, ?)`,
      [vendedorId, categoriasJson, nombresJson]
    );
    const solicitudId = resultSolicitud.insertId;

    // Insertar productos completos en tabla productos
    const valuesProductos = productos.map(p => [
      vendedorId,
      p.categoria,
      p.nombre,
      p.descripcion,
      'En revisión',
      solicitudId
    ]);

    await connection.query(
      `INSERT INTO productos (vendedor_id, categoria, nombre, descripcion, estado, solicitud_id) VALUES ?`,
      [valuesProductos]
    );

    await connection.commit();

    return res.status(200).json({
      mensaje: `${productos.length} producto(s) enviados para revisión correctamente`
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al registrar productos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

//Funcion para hacer una nueva solicitud de vendedor
exports.nuevaSolicitudVendedor = async (req, res) => {
  const connection = await db.getConnection();
  const vendedorId = req.params.vendedorId;

  try {
    const {
      diasVenta = '[]',
      productos = '[]',
      detalles = ''
    } = req.body;

    const diasVentaArray = JSON.parse(diasVenta);
    const productosArray = JSON.parse(productos);
    const identificacionArchivo = req.file ? req.file.filename : null;

    if (!identificacionArchivo) {
      return res.status(400).json({ mensaje: 'Falta archivo de identificación' });
    }

    if (!Array.isArray(productosArray) || productosArray.length === 0) {
      return res.status(400).json({ mensaje: 'Debes agregar al menos un producto' });
    }

    // Construir arrays para categorías y nombres (para insertar en solicitudes)
    const categoriasArray = productosArray.map(prod => prod.categoria);
    const nombresArray = productosArray.map(prod => prod.nombre);
    const categoriasJson = JSON.stringify(categoriasArray);
    const nombresJson = JSON.stringify(nombresArray);

    await connection.beginTransaction();

    // Verificar estado del permiso
    const sqlVerificarPermiso = `
      SELECT estado 
      FROM permisoVendedor 
      WHERE vendedor_id = ? 
      FOR UPDATE
    `;
    const [permisoResult] = await connection.query(sqlVerificarPermiso, [vendedorId]);

    if (permisoResult.length === 0) {
      await connection.rollback();
      return res.status(404).json({ mensaje: 'Permiso de vendedor no encontrado' });
    }

    const estadoPermiso = permisoResult[0].estado;

    if (!['Rechazado', 'Revocado', 'Vencido'].includes(estadoPermiso)) {
      await connection.rollback();
      return res.status(403).json({
        mensaje: 'No puedes crear una nueva solicitud hasta que tu permiso sea Rechazado, Revocado o Vencido'
      });
    }

    // Verificar productos rechazados
    const nombresLower = productosArray.map(p => p.nombre.toLowerCase());
    if (nombresLower.length > 0) {
      const placeholders = nombresLower.map(() => '?').join(', ');
      const [rechazados] = await connection.query(
        `SELECT nombre FROM productosRechazados WHERE LOWER(nombre) IN (${placeholders})`,
        nombresLower
      );

      if (rechazados.length > 0) {
        await connection.rollback();
        const nombresRechazados = rechazados.map(p => p.nombre).join(', ');
        return res.status(400).json({
          mensaje: `No se puede registrar la solicitud. Los siguientes productos ya fueron rechazados anteriormente: ${nombresRechazados}`
        });
      }
    }

    // Actualizar estado permiso a "En revisión"
    await connection.query(
      `UPDATE permisoVendedor SET estado = 'En revisión' WHERE vendedor_id = ?`,
      [vendedorId]
    );

    // Crear solicitud con las nuevas columnas de productos
    const diasVentaJson = JSON.stringify(diasVentaArray);
    const sqlCrearSolicitud = `
      INSERT INTO solicitudes 
        (vendedor_id, tipo, estado, detalles, identificacion, diasVenta, categoriaProducto, nombreProducto) 
      VALUES (?, 'Vendedor', 'En revisión', ?, ?, ?, ?, ?)
    `;
    const [resultSolicitud] = await connection.query(sqlCrearSolicitud, [
      vendedorId,
      detalles,
      identificacionArchivo,
      diasVentaJson,
      categoriasJson,
      nombresJson
    ]);
    const solicitudId = resultSolicitud.insertId;

    // Insertar productos completos en tabla productos
    const valuesProductos = productosArray.map(prod => [
      vendedorId,
      prod.categoria,
      prod.nombre,
      prod.descripcion,
      'En revisión',
      solicitudId
    ]);
    await connection.query(
      `INSERT INTO productos 
        (vendedor_id, categoria, nombre, descripcion, estado, solicitud_id) 
      VALUES ?`,
      [valuesProductos]
    );

    await connection.commit();
    res.json({ mensaje: 'Solicitud de vendedor creada y datos actualizados correctamente' });

  } catch (error) {
    console.error('Error en nueva solicitud vendedor:', error);
    await connection.rollback();
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

