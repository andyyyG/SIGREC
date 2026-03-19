//Rutas para solicitudes

const express = require('express');
const router = express.Router();
const solicitudesController = require('../controllers/solicitudesController');

//endpoints
router.get('/detalle/:id', solicitudesController.obtenerDetalleSolicitud);
router.get('/nuevos-vendedores', solicitudesController.obtenerSolicitudesNuevosVendedores);
router.get('/vendedores', solicitudesController.obtenerSolicitudesVendedores);
router.get('/productosV', solicitudesController.obtenerSolicitudesProductos);
router.get('/busqueda', solicitudesController.buscarSolicitudes);
router.get('/:vendedorId', solicitudesController.obtenerSolicitudesVendedor);
router.post('/nuevo-vendedor/aceptar', solicitudesController.aprobarSolicitudNuevoVendedor);
router.post('/nuevo-vendedor/rechazar', solicitudesController.rechazarSolicitudNuevoVendedor);
router.post('/productos/aceptar', solicitudesController.aprobarSolicitudProductos);
router.post('/productos/rechazar', solicitudesController.rechazarSolicitudProductos);
router.get('/productos/:solicitudId', solicitudesController.obtenerProductosPorSolicitud);

module.exports = router;
