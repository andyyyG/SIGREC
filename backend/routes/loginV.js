//Rutas para login

const express = require('express');
const router = express.Router();
const loginVController = require('../controllers/loginVController');

//endpoints
router.post('/', loginVController.loginVendedor);
router.post('/admin', loginVController.loginAdmin);

module.exports = router;
