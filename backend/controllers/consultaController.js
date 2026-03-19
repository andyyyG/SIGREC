//Controlador para consulta pública
const db = require('../db');

exports.buscarProductos = async (req, res) => {
    // Se extraen los parámetros de consulta desde la URL: texto de búsqueda, categoría y día
    const { query, categoria, dia } = req.query;

    // Se define la consulta base SQL para obtener productos aprobados junto con los datos del vendedor y los días de venta
    let sql = `
    SELECT p.id, p.nombre AS nombre_producto, p.categoria, p.descripcion,
           u.nombre AS nombre_vendedor, u.apellidoP, u.apellidoM,
           GROUP_CONCAT(dv.dia) AS dias_venta
    FROM productos p
    JOIN vendedores v ON p.vendedor_id = v.id
    JOIN usuarios u ON v.id_usuario = u.id
    LEFT JOIN dias_venta dv ON dv.vendedor_id = v.id
    WHERE p.estado = 'Aprobado'
  `;

    // Se inicializa un arreglo para almacenar los parámetros que serán utilizados en la consulta preparada
    const params = [];

    // Si se proporciona un texto de búsqueda (query), se agregan condiciones para buscar por nombre de producto o nombre/apellidos del vendedor
    if (query) {
        sql += ` AND (p.nombre LIKE ? OR u.nombre LIKE ? OR u.apellidoP LIKE ? OR u.apellidoM LIKE ?)`;
        const q = `%${query}%`;
        params.push(q, q, q, q);
    }

    // Si se proporciona una categoría, se filtran los productos por dicha categoría
    if (categoria) {
        sql += ` AND p.categoria = ?`;
        params.push(categoria);
    }

    // Si se especifica un día y no es "todos", se filtran los resultados por ese día específico
    if (dia && dia !== 'todos') {
        sql += ` AND dv.dia = ?`;
        params.push(dia);
    }

    // Se agrupan los resultados por producto y se ordenan alfabéticamente por nombre
    sql += ` GROUP BY p.id
           ORDER BY p.nombre ASC`;

    try {
        // Se ejecuta la consulta SQL con los parámetros correspondientes
        const [rows] = await db.query(sql, params);

        // Se envía el resultado en formato JSON como respuesta al cliente
        res.json(rows);
    } catch (error) {
        // En caso de error durante la consulta, se muestra el error en consola y se responde con un estado 500
        console.error('Error al buscar productos:', error);
        res.status(500).json({ error: 'Error al buscar productos' });
    }
};
