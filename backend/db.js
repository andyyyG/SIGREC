// Se importa el módulo mysql2 con soporte para promesas
const mysql = require('mysql2/promise');
// Se cargan las variables de entorno desde el archivo .env
require('dotenv').config();

// Se crea un pool de conexiones para reutilizar conexiones a la base de datos
const pool = mysql.createPool({
  host: process.env.DB_HOST,       // Se define el host de la base de datos (desde .env)
  user: process.env.DB_USER,       // Se define el usuario de la base de datos (desde .env)
  password: process.env.DB_PASSWORD, // Se define la contraseña (desde .env)
  database: process.env.DB_NAME,   // Se define el nombre de la base de datos (desde .env)
  waitForConnections: true,        // Se espera si no hay conexiones disponibles
  connectionLimit: 10,             // Se define el número máximo de conexiones activas
  queueLimit: 0                    // No se limita la cantidad de solicitudes en cola
});

// Verificación de conexión inicial
(async () => {
  try {
    // Se intenta obtener una conexión del pool
    const connection = await pool.getConnection();

    // Se muestra un mensaje en consola si la conexión fue exitosa
    console.log('Conectado a la base de datos MySQL');

    // Se libera la conexión de vuelta al pool
    connection.release();
  } catch (error) {
    // Se muestra un mensaje de error y se detiene la ejecución en caso de fallo
    console.error('Error conectando a la base de datos:', error);
    process.exit(1); // Finaliza el proceso con un código de error
  }
})();

// Se exporta el pool para poder ser utilizado en otros módulos del proyecto
module.exports = pool;


