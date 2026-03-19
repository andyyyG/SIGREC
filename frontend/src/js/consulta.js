// Convierte la primera letra a mayúscula y el resto a minúsculas
function capitalizar(texto) {
    if (!texto) return ''; // Si el texto está vacío o es null, devuelve cadena vacía
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

async function buscarProductos() {
    // Obtener los valores ingresados en los campos del formulario
    const query = document.getElementById('inputBusqueda').value.trim(); // texto del input
    const categoria = document.getElementById('selectCategoría').value;  // valor del select de categoría
    const dia = document.getElementById('selectDias').value;             // valor del select de día

    // se construyen los parámetros para la URL
    const params = new URLSearchParams();
    if (query) params.append('query', query);           // Agrega el parámetro 'query' si hay texto
    if (categoria) params.append('categoria', categoria); // Agrega el parámetro 'categoria' si fue seleccionado
    if (dia && dia !== 'todos') params.append('dia', dia); // Agrega el parámetro 'dia' si se seleccionó un día específico

    try {
        // se hace la petición GET al servidor con los parámetros
        const res = await fetch(`http://localhost:3000/api/consulta/buscar?${params.toString()}`);
        const data = await res.json(); // se convierte la respuesta a JSON

        const resultados = document.getElementById('resultados');
        resultados.innerHTML = ''; // Limpiamos resultados anteriores

        // Si no se encontraron productos, mostrar mensaje
        if (data.length === 0) {
            resultados.innerHTML = '<p>No se encontraron productos.</p>';
            return;
        }

        // Iteramos por cada producto en los resultados y lo mostramos en pantalla
        data.forEach(prod => {
            const categoriaCap = capitalizar(prod.categoria); // Capitalizamos categoría

            // Capitalizamos días de venta si existen
            const diasCap = prod.dias_venta
                ? prod.dias_venta
                    .split(',')                        // Separar por comas
                    .map(d => capitalizar(d))          // Capitalizar cada día
                    .join(', ')                        // Volver a unir con coma
                : 'No registrados';                    // Si no hay días, mensaje por defecto

            // Se crea un div con clase "card-producto"
            const div = document.createElement('div');
            div.classList.add('card-producto');

            //  estilo directo en JS
            div.style.border = '1px solid rgba(163, 124, 47, 0.76)';
            div.style.padding = '20px';
            div.style.marginBottom = '10px';

            // Se inserta el contenido del producto como HTML
            div.innerHTML = `
                <h4 style="text-align: center;">${prod.nombre_producto}</h4>
                <p><strong>Categoría:</strong> ${categoriaCap}</p>
                <p><strong>Descripción:</strong> ${prod.descripcion}</p>
                <p><strong>Vendedor:</strong> ${prod.nombre_vendedor} ${prod.apellidoP} ${prod.apellidoM}</p>
                <p><strong>Días de venta:</strong> ${diasCap}</p>
            `;

            // Se agrega al contenedor de resultados
            resultados.appendChild(div);
        });

    } catch (error) {
        // En caso de error, lo mostramos en la consola
        console.error('Error en la búsqueda:', error);
    }
}

// Cuando el usuario haga clic en el botón, se ejecuta buscarProductos()
document.getElementById('btnBuscar').addEventListener('click', buscarProductos);

// Ejecutamos la búsqueda automáticamente al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    buscarProductos();
});
