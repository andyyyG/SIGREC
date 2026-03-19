// Controlador para manejar la configuración de la cuenta: cambiar correo y contraseña
const db = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Se configura el transporte para envío de correos mediante Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'verificacion.sigrec@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Se obtiene el correo del usuario dado su ID
exports.obtenerCuenta = async (req, res) => {
  const usuarioId = req.params.id;
  if (!usuarioId) {
    return res.status(401).json({ mensaje: 'No autorizado' });
  }

  try {
    // Se consulta el correo del usuario
    const [result] = await db.query(
      `SELECT correo FROM usuarios WHERE id = ?`,
      [usuarioId]
    );

    // Se verifica si el usuario existe
    if (result.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Se retorna el correo encontrado
    res.json({
      correo: result[0].correo
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};

// Se inicia el proceso de cambio de correo
exports.iniciarCambioCorreo = async (req, res) => {
  const usuarioId = req.params.id;
  const { nuevoCorreo, contrasenaActual } = req.body;

  try {
    // Se consulta la contraseña del usuario
    const [userResult] = await db.query('SELECT contraseña FROM usuarios WHERE id = ?', [usuarioId]);
    if (userResult.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    // Se compara la contraseña actual
    const match = await bcrypt.compare(contrasenaActual, userResult[0].contraseña);
    if (!match) return res.status(403).json({ mensaje: 'Contraseña incorrecta' });

    // Se genera un token y se inserta en la tabla temporal
    const token = crypto.randomBytes(32).toString('hex');
    await db.query(
      'INSERT INTO cambio_correo_temporal (usuario_id, nuevo_correo, token) VALUES (?, ?, ?)',
      [usuarioId, nuevoCorreo, token]
    );

    // Se genera el enlace de verificación
    const enlace = `http://localhost:3000/api/cuenta/verificar-cambio-correo/${token}`;

    // Se envía el correo de verificación
    await transporter.sendMail({
      from: '"SIGREC" <no-reply@sigrec.com>',
      to: nuevoCorreo,
      subject: 'Verifica tu nuevo correo',
      html: `<p>Haz clic en el siguiente enlace para confirmar el cambio de correo:</p>
             <a href="${enlace}">${enlace}</a>`
    });

    // Se responde al cliente
    res.json({ mensaje: 'Correo de verificación enviado al nuevo correo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// Se verifica el token para confirmar el cambio de correo
exports.verificarCambioCorreo = async (req, res) => {
  console.log('Verificando token...');
  const { token } = req.params;

  try {
    // Se busca el token en la tabla temporal
    const [result] = await db.query(
      'SELECT * FROM cambio_correo_temporal WHERE token = ?',
      [token]
    );

    console.log('Resultado del token:', result);

    // Se valida el token
    if (result.length === 0) {
      return res.status(400).send('Token inválido o expirado');
    }

    const { usuario_id, nuevo_correo } = result[0];
    console.log('usuario_id:', usuario_id);

    // Se verifica que el usuario exista
    const [userCheck] = await db.query('SELECT * FROM usuarios WHERE id = ?', [usuario_id]);
    console.log('Resultado de búsqueda en usuarios:', userCheck);

    if (userCheck.length === 0) {
      return res.status(404).send('Usuario no encontrado');
    }

    // Se actualiza el correo del usuario
    await db.query('UPDATE usuarios SET correo = ? WHERE id = ?', [nuevo_correo, usuario_id]);

    // Se elimina el token usado
    await db.query('DELETE FROM cambio_correo_temporal WHERE token = ?', [token]);

    // Se envía respuesta
    res.send('Correo actualizado exitosamente');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al verificar el cambio de correo');
  }
};

// Se actualiza la contraseña del usuario
exports.actualizarContrasena = async (req, res) => {
  const { contrasenaActual, contrasenaNueva } = req.body; // Recibe ambas contraseñas
  const id = req.params.id;

  // Se validan los datos de entrada
  if (!id) {
    return res.status(401).json({ mensaje: 'No autorizado' });
  }

  if (!contrasenaNueva || contrasenaNueva.length < 6) {
    return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });
  }

  if (!contrasenaActual) {
    return res.status(400).json({ mensaje: 'Debes ingresar tu contraseña actual' });
  }

  try {
    // Se obtiene la contraseña actual
    const [userResult] = await db.query(`SELECT contraseña FROM usuarios WHERE id = ?`, [id]);

    // Se valida existencia del usuario
    if (userResult.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Se compara la contraseña actual
    const match = await bcrypt.compare(contrasenaActual, userResult[0].contraseña);
    if (!match) {
      return res.status(403).json({ mensaje: 'Contraseña actual incorrecta' });
    }

    // Se hashea la nueva contraseña y se actualiza
    const hashNueva = await bcrypt.hash(contrasenaNueva, 10);
    await db.query(`UPDATE usuarios SET contraseña = ? WHERE id = ?`, [hashNueva, id]);

    // Se responde al cliente
    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};

// Se solicita recuperación de contraseña enviando un token al correo
exports.solicitarRecuperacion = async (req, res) => {
  const { correo } = req.body;

  try {
    // Se busca el ID del usuario asociado al correo
    const [usuarios] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (usuarios.length === 0) return res.status(404).json({ mensaje: 'Correo no registrado' });

    // Se genera y almacena un token de recuperación
    const token = crypto.randomBytes(32).toString('hex');
    await db.query('INSERT INTO tokens_recuperacion (usuario_id, token) VALUES (?, ?)', [usuarios[0].id, token]);

    // Se envía correo con el enlace de recuperación
    const link = `http://localhost:5173/restablecerContrasena.html?token=${token}`;
    await transporter.sendMail({
      from: '"SIGREC" <no-reply@sigrec.com>',
      to: correo,
      subject: 'Recuperación de contraseña',
      html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
             <a href="${link}">${link}</a>`,
    });

    // Se informa al cliente
    res.json({ mensaje: 'Correo de recuperación enviado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// Se restablece la contraseña con un token válido
exports.restablecerContrasena = async (req, res) => {
  const { token, nueva } = req.body;

  try {
    // Se valida el token recibido
    const [result] = await db.query('SELECT usuario_id FROM tokens_recuperacion WHERE token = ?', [token]);
    if (result.length === 0) return res.status(400).json({ error: 'Token inválido o expirado' });

    // Se hashea y actualiza la nueva contraseña
    const hash = await bcrypt.hash(nueva, 10);
    await db.query('UPDATE usuarios SET contraseña = ? WHERE id = ?', [hash, result[0].usuario_id]);

    // Se elimina el token usado
    await db.query('DELETE FROM tokens_recuperacion WHERE token = ?', [token]);

    // Se responde al cliente
    res.json({ mensaje: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

