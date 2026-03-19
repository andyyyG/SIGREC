// Espera a que el DOM esté completamente cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', () => {

  // Selecciona el botón de búsqueda y el contenedor donde se mostrarán los resultados
  const btnBuscar = document.getElementById('btnBuscar');
  const contenedorResultados = document.getElementById('resultados');

  // Evento al hacer clic en el botón "Buscar"
  btnBuscar.addEventListener('click', async () => {
    // Obtiene los valores de los campos de entrada
    const query = document.getElementById('inputBusqueda').value.trim();       // Texto libre (por nombre)
    const categoria = document.getElementById('selectCategoría').value;        // Categoría seleccionada
    const estado = document.getElementById('selectEstado').value;              // Estado del producto (aprobado, rechazado, etc.)

    // Construye los parámetros de búsqueda
    const params = new URLSearchParams();
    if (query) params.append('query', query);          // Agrega texto de búsqueda si existe
    if (categoria) params.append('categoria', categoria); // Agrega categoría si fue seleccionada
    if (estado) params.append('estado', estado);          // Agrega estado si fue seleccionado

    try {
      // Realiza una petición GET con los parámetros
      const res = await fetch(`http://localhost:3000/api/admin/productos?${params.toString()}`);
      const data = await res.json();

      // Limpia los resultados anteriores
      contenedorResultados.innerHTML = '';

      // Si no se encontraron productos, muestra un mensaje
      if (data.length === 0) {
        contenedorResultados.innerHTML = '<p>No se encontraron productos.</p>';
        return;
      }

      // Recorre los productos encontrados y los muestra en tarjetas
      data.forEach(producto => {
        const card = document.createElement('div');
        card.classList.add('producto-card');

        // Estilo manual para la tarjeta 
        card.style.border = '1px solid rgba(163, 124, 47, 0.76)';
        card.style.padding = '10px';
        card.style.marginBottom = '10px';

        // Formatea el nombre de la categoría (primera letra mayúscula)
        const categoriaFormateada = producto.categoria.charAt(0).toUpperCase() + producto.categoria.slice(1);

        // Contenido HTML de la tarjeta del producto
        card.innerHTML = `
          <div class="pro">
            <p><strong>Nombre del producto:</strong> ${producto.nombre}</p>
            <p><strong>Categoría:</strong> ${categoriaFormateada}</p>
            <p><strong>Descripción:</strong> ${producto.descripcion}</p>
          </div>
        `;

        // Agrega la tarjeta al contenedor de resultados
        contenedorResultados.appendChild(card);
      });

    } catch (error) {
      // Si hay error en la petición, se muestra mensaje de error
      console.error('Error al buscar productos:', error);
      contenedorResultados.innerHTML = '<p>Error al realizar la búsqueda.</p>';
    }
  });
});

