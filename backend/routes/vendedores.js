//Rutas para vendedores

const express = require('express');
const router = express.Router();
const vendedoresController = require('../controllers/vendedoresController');
const multer = require('multer');
const path = require('path');

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
//Configuración del tamaño de archivo permitido
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, 
});
//endpoints
router.post('/registrar', upload.single('identificacion'), vendedoresController.registrarVendedor);
router.get('/tienePermiso/:id', vendedoresController.tienePermiso);
router.get('/:id', vendedoresController.obtenerVendedorPorId);
router.put('/:id', vendedoresController.actualizarVendedor);
router.get('/infoComercial/:id', vendedoresController.obtenerInfoComercial);
router.put('/infoComercial/:id', vendedoresController.actualizarInfoComercial);
router.post('/:vendedorId/registrar-productos', vendedoresController.registrarProductosVendedor);
router.post('/:vendedorId/nueva-solicitud', upload.single('identificacion'), vendedoresController.nuevaSolicitudVendedor);
 
//exportación del enrutador
module.exports = router;


