// Controlador para el login
const db = require('../db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Se maneja el inicio de sesión para un vendedor
exports.loginVendedor = async (req, res) => {
  const { correo, contra } = req.body;
  // Se verifica que ambos campos estén presentes
  if (!correo || !contra) {
    return res.status(400).json({ mensaje: 'Faltan datos para iniciar sesión' });
  }

  // Se consulta si existe un usuario con el correo proporcionado y que sea vendedor
  const sql = `SELECT id, correo, contraseña, nombre, apellidoP, apellidoM, genero 
  FROM usuarios WHERE correo = ? AND tipo = "vendedor"`;

  try {
    const [results] = await db.query(sql, [correo]);
    // Se verifica si se encontró algún resultado
    if (results.length === 0) {
      return res.status(401).json({ mensaje: 'Correo no registrado' });
    }
    const usuario = results[0];
    // Se compara la contraseña ingresada con la almacenada en la base de datos
    const match = await bcrypt.compare(contra, usuario.contraseña);
    if (!match) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }
    // Se consulta si el usuario está registrado como vendedor
    const [vend] = await db.query(
      'SELECT id FROM vendedores WHERE id_usuario = ?',
      [usuario.id]
    );

    const vendedorId = vend.length > 0 ? vend[0].id : null;

    let permisoEstado = null;

    // Se obtiene el estado del permiso del vendedor, si existe
    if (vendedorId) {
      const [permisoRows] = await db.query(
        `SELECT estado FROM permisoVendedor WHERE vendedor_id = ?`,
        [vendedorId]
      );
      permisoEstado = permisoRows.length > 0 ? permisoRows[0].estado : null;
    }
    // Se devuelve la respuesta exitosa con los datos del usuario
    return res.status(200).json({
      mensaje: 'Login exitoso',
      usuarioId: usuario.id,
      vendedorId,
      permisoEstado,
      correo: usuario.correo,
      nombre: usuario.nombre,
      apellidoP: usuario.apellidoP,
      apellidoM: usuario.apellidoM, 
      genero: usuario.genero
    });

  } catch (err) {
    console.error('Error en consulta de login:', err);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// Se maneja el inicio de sesión para un administrador
exports.loginAdmin = async (req, res) => {
  const { correo, contra } = req.body;

  // Se verifica que ambos campos estén presentes
  if (!correo || !contra) {
    return res.status(400).json({ mensaje: 'Faltan datos para iniciar sesión' });
  }

  // Se consulta si existe un usuario con el correo proporcionado y que sea administrador
  const sql = `SELECT id, correo, contraseña, nombre, apellidoP, apellidoM, genero 
  FROM usuarios WHERE correo = ? AND tipo = "administrador"`;

  try {
    const [results] = await db.query(sql, [correo]);

    // Se verifica si se encontró algún resultado
    if (results.length === 0) {
      return res.status(401).json({ mensaje: 'Correo no registrado como administrador' });
    }

    const usuario = results[0];

    // Se compara la contraseña ingresada con la almacenada
    const match = await bcrypt.compare(contra, usuario.contraseña);
    if (!match) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    // Se devuelve la respuesta exitosa con los datos del usuario
    return res.status(200).json({
      mensaje: 'Login exitoso',
      usuarioId: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      apellidoP: usuario.apellidoP,
      apellidoM: usuario.apellidoM,
      genero: usuario.genero
    });

  } catch (err) {
    console.error('Error en login admin:', err);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
};
