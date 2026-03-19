//Rutas para la parte de cuentas

const express = require('express');
const router = express.Router();
const cuentaController = require('../controllers/cuentaController');

//endpoints
router.get('/:id', cuentaController.obtenerCuenta);
router.put('/actualizar-contrasena/:id', cuentaController.actualizarContrasena);
router.post('/iniciar-cambio-correo/:id', cuentaController.iniciarCambioCorreo);
router.get('/verificar-cambio-correo/:token', cuentaController.verificarCambioCorreo);
router.post('/solicitar', cuentaController.solicitarRecuperacion);
router.post('/restablecer', cuentaController.restablecerContrasena);

module.exports = router;

