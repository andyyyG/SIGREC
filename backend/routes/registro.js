const express = require('express');
const router = express.Router();
const registroController = require('../controllers/registroController');

//endpoints
router.post('/registro-temporal', registroController.registroTemporal);
router.get('/verificar/:token', registroController.verificarCorreo);
router.post('/registro-temporalA', registroController.registroTemporalA);
router.get('/verificarA/:token', registroController.verificarAdmin);

module.exports = router;
