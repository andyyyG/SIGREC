const pool = require('../db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

// Se configura el servicio de correo para verificación
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'verificacion.sigrec@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Se registra temporalmente un usuario (vendedor) y se envía correo de verificación
exports.registroTemporal = async (req, res) => {
  try {
    const {
      correo,
      contraseña,
      nombre,
      apellidoP,
      apellidoM,
      genero,
      fechaNacimiento,
      numCel,
    } = req.body;

    // Se verifica si el correo ya está registrado en la tabla usuarios
    const [usuariosExistentes] = await pool.query(
      'SELECT id FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado en una cuenta activa.' });
    }

    // Se verifica si ya hay un registro temporal sin confirmar
    const [temporalExistente] = await pool.query(
      'SELECT id FROM usuario_temporal WHERE correo = ?',
      [correo]
    );

    if (temporalExistente.length > 0) {
      return res.status(400).json({ error: 'Ya se ha iniciado el registro con este correo. Verifica tu email.' });
    }

    // Se hashea la contraseña y se genera un token único
    const hashedPassword = await bcrypt.hash(contraseña, 10);
    const token = uuidv4();

    // Se inserta el registro temporal del usuario
    const insertTempQuery = `
      INSERT INTO usuario_temporal 
      (correo, contraseña, token_verificacion, nombre, apellidoP, apellidoM, genero, fechaNacimiento, numCel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(insertTempQuery, [
      correo,
      hashedPassword,
      token,
      nombre,
      apellidoP,
      apellidoM,
      genero,
      fechaNacimiento,
      numCel,
    ]);

    // Se crea el enlace de verificación y se envía por correo
    const urlVerificacion = `http://localhost:3000/api/verificar/${token}`;

    const mailOptions = {
      from: 'verificacion.sigrec@gmail.com',
      to: correo,
      subject: 'Verifica tu cuenta SIGREC',
      html: `
        <h1>Gracias por registrarte</h1>
        <p>Para activar tu cuenta, haz clic en el siguiente enlace:</p>
        <a href="${urlVerificacion}">Verificar cuenta</a>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Se responde al cliente
    res.status(200).json({ message: 'Usuario registrado. Revisa tu correo para verificar la cuenta.' });
  } catch (error) {
    console.error('Error en registro temporal:', error);
    res.status(500).json({ error: 'Error al registrar usuario temporalmente' });
  }
};

// Se registra temporalmente un administrador y se envía correo de verificación
exports.registroTemporalA = async (req, res) => {
  try {
    const {
      correo,
      contraseña,
      nombre,
      apellidoP,
      apellidoM,
      genero,
      fechaNacimiento,
      numCel,
    } = req.body;

    // Se hashea la contraseña y se genera un token
    const hashedPassword = await bcrypt.hash(contraseña, 10);
    const token = uuidv4();

    // Se inserta en tabla de usuario_temporal
    const insertTempQuery = `
      INSERT INTO usuario_temporal 
      (correo, contraseña, token_verificacion, nombre, apellidoP, apellidoM, genero, fechaNacimiento, numCel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(insertTempQuery, [
      correo,
      hashedPassword,
      token,
      nombre,
      apellidoP,
      apellidoM,
      genero,
      fechaNacimiento,
      numCel,
    ]);

    // Se genera enlace de verificación y se envía por correo
    const urlVerificacion = `http://localhost:3000/api/verificarA/${token}`;

    const mailOptions = {
      from: 'verificacion.sigrec@gmail.com',
      to: correo,
      subject: 'Verifica tu cuenta SIGREC',
      html: `
        <h1>Gracias por registrarte</h1>
        <p>Para activar tu cuenta, haz clic en el siguiente enlace:</p>
        <a href="${urlVerificacion}">${urlVerificacion}</a>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Se responde al cliente
    res.status(200).json({ message: 'Aministrador registrado. Revisa tu correo para verificar la cuenta.' });
  } catch (error) {
    console.error('Error en registro temporal:', error);
    res.status(500).json({ error: 'Error al registrar usuario temporalmente' });
  }
};

// Se verifica el correo de un usuario tipo vendedor
exports.verificarCorreo = async (req, res) => {
  try {
    const { token } = req.params;

    // Se busca el token en la tabla usuario_temporal
    const [rows] = await pool.query(
      'SELECT * FROM usuario_temporal WHERE token_verificacion = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).send('Token inválido o expirado.');
    }

    const usuario = rows[0];

    // Se inserta en la tabla usuarios con tipo vendedor
    const insertUserQuery = `
      INSERT INTO usuarios 
      (correo, contraseña, tipo, nombre, apellidoP, apellidoM, genero, fechaNacimiento, numCel)
      VALUES (?, ?, 'vendedor', ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(insertUserQuery, [
      usuario.correo,
      usuario.contraseña,
      usuario.nombre,
      usuario.apellidoP,
      usuario.apellidoM,
      usuario.genero,
      usuario.fechaNacimiento,
      usuario.numCel,
    ]);

    // Se elimina el registro temporal
    await pool.query(
      'DELETE FROM usuario_temporal WHERE token_verificacion = ?',
      [token]
    );

    // Se envía respuesta
    res.send('Cuenta verificada con éxito. Ya puedes iniciar sesión.');
  } catch (error) {
    console.error('Error en verificación:', error);
    res.status(500).send('Error en la verificación del correo');
  }
};

// Se verifica el correo de un usuario tipo administrador
exports.verificarAdmin = async (req, res) => {
  try {
    const { token } = req.params;

    // Se busca el token en la tabla usuario_temporal
    const [rows] = await pool.query(
      'SELECT * FROM usuario_temporal WHERE token_verificacion = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).send('Token inválido o expirado.');
    }

    const usuario = rows[0];

    // Se inserta en la tabla usuarios con tipo administrador
    const insertUserQuery = `
      INSERT INTO usuarios 
      (correo, contraseña, tipo, nombre, apellidoP, apellidoM, genero, fechaNacimiento, numCel)
      VALUES (?, ?, 'administrador', ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(insertUserQuery, [
      usuario.correo,
      usuario.contraseña,
      usuario.nombre,
      usuario.apellidoP,
      usuario.apellidoM,
      usuario.genero,
      usuario.fechaNacimiento,
      usuario.numCel,
    ]);

    // Se elimina el registro temporal
    await pool.query(
      'DELETE FROM usuario_temporal WHERE token_verificacion = ?',
      [token]
    );

    // Se responde al cliente
    res.send('Cuenta verificada con éxito. Ya puedes iniciar sesión.');
  } catch (error) {
    console.error('Error en verificación:', error);
    res.status(500).send('Error en la verificación del correo');
  }
};
