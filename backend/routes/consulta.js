const express = require('express');
const router = express.Router();
const consultaController = require('../controllers/consultaController');

//endpoint
router.get('/buscar', consultaController.buscarProductos);

module.exports = router;
