// Espera a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

  // Referencias a elementos del DOM
  const btnBuscar = document.getElementById('btnBuscar');                 // Botón de búsqueda
  const contenedorResultados = document.getElementById('resultados');     // Contenedor donde se mostrarán los resultados

  // Evento que se ejecuta al hacer clic en el botón "Buscar"
  btnBuscar.addEventListener('click', async () => {

    // Obtiene los valores ingresados por el usuario
    const query = document.getElementById('inputBusqueda').value.trim();  // Nombre o cualquier texto libre
    const estado = document.getElementById('selectEstado').value;         // Estado del permiso 

    // Construcción de los parámetros de búsqueda para la URL
    const params = new URLSearchParams();
    if (query) params.append('query', query);       // Agrega 'query' solo si no está vacío
    if (estado) params.append('estado', estado);    // Agrega 'estado' solo si no está vacío

    try {
      // Llama a la API del backend para obtener los vendedores
      const res = await fetch(`http://localhost:3000/api/admin/vendedores?${params.toString()}`);
      const data = await res.json();

      // Limpia los resultados anteriores
      contenedorResultados.innerHTML = '';

      // Si no hay resultados o la respuesta no es un array válido
      if (!Array.isArray(data) || data.length === 0) {
        contenedorResultados.innerHTML = '<p>No se encontraron vendedores.</p>';
        return;
      }

      // Por cada vendedor encontrado, crea una "tarjeta"
      data.forEach(vendedor => {
        const card = document.createElement('div');
        card.classList.add('vendedor-card');

        // Estilos
        card.style.border = '1px solid rgba(163, 124, 47, 0.76)';
        card.style.padding = '10px';
        card.style.marginBottom = '10px';

        // Arma el nombre completo, considerando que algunos campos podrían estar vacíos
        const nombreCompleto = `${vendedor.nombre} ${vendedor.apellidoP || ''} ${vendedor.apellidoM || ''}`;

        // HTML del contenido de cada tarjeta
        let contenido = `
          <div class="cont"> 
            <p><strong>Estado del permiso:</strong> ${vendedor.estado_permiso || 'Sin definir'}</p>
            <p><strong>Vigencia:</strong> ${vendedor.vigencia ? new Date(vendedor.vigencia).toLocaleDateString() : 'Sin definir'}</p>
            <p><strong>Nombre:</strong> ${nombreCompleto}</p>
            <button class="btnVerDetalle" data-id="${vendedor.vendedorId}">Ver todo</button>
          </div>
        `;

        // Inserta el contenido y añade la tarjeta al DOM
        card.innerHTML = contenido;
        contenedorResultados.appendChild(card);
      });

      // Una vez renderizadas las tarjetas, se asignan eventos a los botones "Ver todo"
      const botonesVerDetalle = document.querySelectorAll('.btnVerDetalle');
      botonesVerDetalle.forEach(boton => {
        boton.addEventListener('click', () => {
          const vendedorId = boton.getAttribute('data-id'); // Obtiene el ID desde el atributo del botón
          // Abre una nueva pestaña con los detalles del vendedor
          window.open(`detalleVendedor.html?id=${vendedorId}`, '_blank');
        });
      });

    } catch (error) {
      // Si hay error en la petición, se muestra un mensaje de error
      console.error('Error al buscar vendedores:', error);
      contenedorResultados.innerHTML = '<p>Error al realizar la búsqueda.</p>';
    }
  });

});


