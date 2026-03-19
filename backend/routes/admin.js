const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

//endpoints
router.get('/vendedores', adminController.obtenerVendedores);
router.post('/vendedores/:id/revocar', adminController.revocarPermiso);
router.get('/vendedores/:id', adminController.obtenerVendedorDetalle);
router.get('/productos', adminController.buscarProductos);
router.get('/estadisticas', adminController.obtenerEstadisticas);
router.post('/reportes', adminController.crearReporte);
router.post('/avisos', adminController.crearAviso);
router.get('/avisos', adminController.obtenerAvisos);

module.exports = router;

