// Se importan los módulos necesarios
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;
require('dotenv').config();            // Se cargan las variables de entorno desde el archivo .env

// Middlewares

// Se permite el uso de CORS para aceptar peticiones de diferentes orígenes
app.use(cors());
// Se habilita el análisis de solicitudes JSON
app.use(express.json());
// Se sirve de manera estática la carpeta 'uploads' desde la ruta '/uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas API

// Se importan las rutas definidas en archivos separados
const registroRoutes = require('./routes/registro');
const vendedoresRoutes = require('./routes/vendedores');
const loginVRoutes = require('./routes/loginV');
const solicitudesRoutes = require('./routes/solicitudes');
const cuentaRoutes = require('./routes/cuenta');
const adminRoutes = require('./routes/admin');
const consultaRoutes = require('./routes/consulta');

// Se asigna un prefijo a cada grupo de rutas
app.use('/api', registroRoutes);
app.use('/api/loginV', loginVRoutes);
app.use('/api/vendedores', vendedoresRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/cuenta', cuentaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/consulta', consultaRoutes);

// Servir el frontend

// Se sirve el contenido estático de la carpeta del proyecto frontend
app.use(express.static(path.join(__dirname, '../Proyecto')));

// Ruta de prueba

// Se define una ruta raíz para comprobar si el servidor está activo
app.get('/', (req, res) => {
  res.send('Servidor backend funcionando');
});

// Manejador de rutas 404

// Se devuelve un mensaje de error si no se encuentra una ruta API válida
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ error: 'Recurso no encontrado' });
  }
  // Para rutas no API, se devuelve un mensaje simple
  res.status(404).send('Recurso no encontrado');
});

// Manejador de errores generales

// Se captura cualquier error no manejado previamente
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Error del servidor');
});

// Inicio del servidor

// Se inicia el servidor y se muestra un mensaje en consola indicando el puerto
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
