// Se ejecuta cuando el DOM ha sido completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  // Obtenemos el ID del vendedor desde localStorage
  const vendedorId = localStorage.getItem('vendedorId');

  console.log('VendedorId para fetch:', vendedorId);

  // Si no hay vendedorId, mostramos alerta y terminamos ejecución
  if (!vendedorId) {
    alert('No se encontraron solicitudes.');
    return;
  }

  // Petición fetch para obtener las solicitudes del vendedor desde backend
  fetch(`http://localhost:3000/api/solicitudes/${vendedorId}`)
    .then(res => res.json())
    .then(solicitudes => {
      console.log(solicitudes);
      // Contenedor donde se mostrarán las solicitudes
      const contenedor = document.getElementById('contenedorSolicitudes');

      // Si no hay solicitudes, se muestra mensaje correspondiente
      if (solicitudes.length === 0) {
        contenedor.innerHTML = '<p>No tienes solicitudes registradas.</p>';
        return;
      }

      // Por cada solicitud recibida, creamos un div con su información
      solicitudes.forEach(solicitud => {
        const div = document.createElement('div');
        div.classList.add('solicitud');

        // Mostramos datos básicos: tipo, fecha y estado, además de botón para ver detalles
        div.innerHTML = `
          <p><strong>Tipo:</strong> ${solicitud.tipo}</p>
          <p><strong>Fecha:</strong> ${new Date(solicitud.fecha).toLocaleString()}</p>
          <p><strong>Estado:</strong> ${solicitud.estado}</p>
          <button class="ver-detalles" data-id="${solicitud.id}" data-tipo="${solicitud.tipo}">Ver detalles</button>
        `;

        // Creamos un div para mostrar detalles adicionales, inicialmente oculto
        const detallesDiv = document.createElement('div');
        detallesDiv.classList.add('detalles-solicitud');
        detallesDiv.id = `detalles-${solicitud.id}`;
        detallesDiv.style.display = 'none';
        detallesDiv.style.marginTop = '10px';

        // Insertamos el contenedor de detalles antes del botón "Ver detalles"
        const boton = div.querySelector('.ver-detalles');
        div.insertBefore(detallesDiv, boton);

        // Añadimos el div de la solicitud al contenedor principal
        contenedor.appendChild(div);
      });

      // Añadimos eventos a todos los botones "Ver detalles" creados
      document.querySelectorAll('.ver-detalles').forEach(boton => {
        boton.addEventListener('click', () => {
          // Obtenemos id y tipo de la solicitud desde los atributos data
          const solicitudId = boton.dataset.id;
          const tipo = boton.dataset.tipo;
          const detallesDiv = document.getElementById(`detalles-${solicitudId}`);

          // Si los detalles ya están visibles, los ocultamos y cambiamos el texto del botón
          if (detallesDiv.style.display === 'block') {
            detallesDiv.style.display = 'none';
            boton.textContent = 'Ver detalles';
            return;
          }

          // Si no están visibles, hacemos fetch para obtener los detalles de la solicitud
          fetch(`http://localhost:3000/api/solicitudes/detalle/${solicitudId}`)
            .then(async res => {
              const data = await res.json();

              // Si la respuesta no es ok, mostramos error en consola y alerta
              if (!res.ok) {
                console.error('Error al obtener detalles:', data.mensaje);
                alert(data.mensaje || 'Error al obtener detalles');
                return;
              }

              // Dependiendo del tipo de solicitud, mostramos datos específicos
              if (tipo === 'VendedorNuevo') {
                detallesDiv.innerHTML = `
                  <p><strong>Días de venta:</strong> ${data.dias.map(dia => dia.charAt(0).toUpperCase() + dia.slice(1)).join(', ')}</p>
                  <p><strong>Productos:</strong></p>
                  <ul>${data.productos.map(p => {
                    const categoriaCapitalizada = p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1);
                    return `<li>${categoriaCapitalizada}: ${p.nombre}</li>`;
                  }).join('')}</ul>
                `;

                // Si la solicitud fue rechazada y hay detalles, los mostramos en rojo
                if (data.estado === 'Rechazada' && data.detalles) {
                  detallesDiv.innerHTML += `<p style="color:red;"><strong>Motivo del rechazo:</strong> ${data.detalles}</p>`;
                }
              } else if (tipo === 'Vendedor') {
                detallesDiv.innerHTML = `
                  <p><strong>Días de venta:</strong> ${data.dias.map(dia => dia.charAt(0).toUpperCase() + dia.slice(1)).join(', ')}</p>
                  <p><strong>Productos:</strong></p>
                  <ul>${data.productos.map(p => {
                    const categoriaCapitalizada = p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1);
                    return `<li>${categoriaCapitalizada}: ${p.nombre}</li>`;
                  }).join('')}</ul>
                `;

                if (data.estado === 'Rechazada' && data.detalles) {
                  detallesDiv.innerHTML += `<p style="color:red;"><strong>Motivo del rechazo:</strong> ${data.detalles}</p>`;
                }
              } else if (tipo === 'Productos') {
                detallesDiv.innerHTML = `
                  <p><strong>Productos solicitados:</strong></p>
                  <ul>${data.productos.map(p => {
                    const categoriaCapitalizada = p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1);
                    return `<li>${categoriaCapitalizada}: ${p.nombre}</li>`;
                  }).join('')}</ul>
                `;

                if (data.estado === 'Rechazada' && data.detalles) {
                  detallesDiv.innerHTML += `<p style="color:red;"><strong>Motivo del rechazo:</strong> ${data.detalles}</p>`;
                }
              }

              // Mostramos el contenedor de detalles y cambiamos texto del botón
              detallesDiv.style.display = 'block';
              boton.textContent = 'Ocultar detalles';
            })
            // Manejo de errores en la petición fetch de detalles
            .catch(err => {
              console.error('Error al obtener detalles:', err);
              alert('Error de red o del servidor al obtener detalles');
            });
        });
      });
    })
    // Manejo de errores en la petición fetch de solicitudes
    .catch(err => {
      console.error('Error al obtener solicitudes:', err);
      alert('Error de red o del servidor al obtener solicitudes');
    });
});


