// Ejecutar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos del DOM
  const btnBuscar = document.getElementById('btnBuscar');
  const contenedorResultados = document.getElementById('resultados');

  // Al hacer clic en el botón de búsqueda
  btnBuscar.addEventListener('click', async () => {
    // Obtener valores de los campos de búsqueda
    const query = document.getElementById('inputBusqueda').value.trim(); // texto buscado
    const tipo = document.getElementById('selectTipo').value;           // tipo de solicitud
    const estado = document.getElementById('selectEstado').value;       // estado de la solicitud

    // Construcción de los parámetros de la URL para hacer la búsqueda
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (tipo) params.append('tipo', tipo);
    if (estado) params.append('estado', estado);

    try {
      // Hacer la solicitud al servidor con los filtros seleccionados
      const res = await fetch(`http://localhost:3000/api/solicitudes/busqueda?${params.toString()}`);
      const data = await res.json();

      // Limpiar resultados anteriores
      contenedorResultados.innerHTML = '';

      // Si no hay resultados, mostrar mensaje
      if (data.length === 0) {
        contenedorResultados.innerHTML = '<p>No se encontraron resultados.</p>';
        return;
      }

      // Recorrer cada solicitud devuelta por el servidor
      data.forEach(async solicitud => {
        // Crear la tarjeta para mostrar cada solicitud
        const card = document.createElement('div');
        card.classList.add('solicitud-card');
        card.style.border = '1px solid rgba(163, 124, 47, 0.76)';
        card.style.padding = '10px';
        card.style.marginBottom = '10px';

        // Construir la lista de productos, si existen
        const productosHtml = Array.isArray(solicitud.productos)
          ? solicitud.productos.map(p => `<li><strong>${p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1)}:</strong> ${p.nombre}, ${p.descripcion}</li>`).join('')
          : '<li>No hay productos</li>';

        // Formatear los días de venta
        const diasHtml = Array.isArray(solicitud.diasVenta) && solicitud.diasVenta.length > 0
          ? solicitud.diasVenta.map(d => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()).join(', ')
          : 'No especificado';

        // Datos generales de la solicitud
        let contenido = `<p><strong>Estado:</strong> ${solicitud.estado}</p>`;
        contenido += `<p><strong>Fecha de solicitud:</strong> ${new Date(solicitud.fecha).toLocaleDateString()}</p>`;

        // Si existe una identificación, mostrarla según el tipo de archivo
        const identificacionUrl = solicitud.identificacion ?
          `http://localhost:3000/uploads/${solicitud.identificacion}` : '';

        let identificacionHtml = '';
        if (identificacionUrl) {
          const extension = solicitud.identificacion.split('.').pop().toLowerCase();
          if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
            identificacionHtml = `
              <p><strong>Identificación:</strong></p>
              <img src="${identificacionUrl}" alt="Identificación" style="max-width:200px; max-height:150px;">
              <br>
              <a href="${identificacionUrl}" target="_blank" class="mot">Ver archivo completo</a>`;
          } else if (extension === 'pdf') {
            identificacionHtml = `
              <p><strong>Identificación:</strong></p>
              <embed src="${identificacionUrl}" type="application/pdf" width="100%" height="400px" />
              <br>
              <a href="${identificacionUrl}" target="_blank">Abrir en nueva pestaña</a>`;
          } else {
            identificacionHtml = `<p><strong>Identificación:</strong> <a href="${identificacionUrl}" target="_blank">Ver archivo</a></p>`;
          }
        }

        // Si es solicitud de nuevo vendedor o vendedor existente
        if (solicitud.tipo === 'VendedorNuevo' || solicitud.tipo === 'Vendedor') {
          contenido += `
            <p><strong>Nombre:</strong> ${solicitud.nombre} ${solicitud.apellidoP || ''} ${solicitud.apellidoM || ''}</p>
            <p><strong>Género:</strong> ${solicitud.genero || ''}</p>
            <p><strong>Fecha de nacimiento:</strong> ${new Date(solicitud.fechaNacimiento).toLocaleDateString()}</p>
            <p><strong>Número de celular:</strong> ${solicitud.numCel || ''}</p>
            <p><strong>Correo:</strong> ${solicitud.correo || ''}</p>
            <p><strong>Días de venta:</strong> ${diasHtml}</p>
            <p><strong>Productos propuestos:</strong></p>
            <ul>${productosHtml}</ul>
            ${identificacionHtml}`;
        }
        // Si es una solicitud para agregar productos
        else if (solicitud.tipo === 'Productos') {
          contenido += `
            <p><strong>Nombre del vendedor:</strong> ${solicitud.nombre} ${solicitud.apellidoP || ''} ${solicitud.apellidoM || ''}</p>
            <p><strong>Productos propuestos:</strong></p>
            <ul>${productosHtml}</ul>`;
        }

        // Si la solicitud está en revisión, mostrar botones para aprobar o rechazar
        if (solicitud.estado === 'En revisión') {
          contenido += `
            <div class="acciones" style="margin-top:10px;">
              <button class="btn-aprobar">✅ Aprobar</button>
              <button class="btn-rechazar">❌ Rechazar</button>
              <div class="rechazo-opciones" style="display:none; margin-top:10px;">
                <textarea placeholder="Motivo del rechazo..." style="width:70%; height:60px;" class="mot2"></textarea>
                <div class="seleccion-productos" style="margin-top:10px; margin-bottom:15px;"></div>
                <button class="btn-confirmar-rechazo" style="margin-top:10px;">Enviar rechazo</button>
              </div>
            </div>`;
        }

        // Insertar el contenido generado en la tarjeta
        card.innerHTML = contenido;
        contenedorResultados.appendChild(card);

        // Acción para aprobar solicitud
        const btnAprobar = card.querySelector('.btn-aprobar');
        if (btnAprobar) {
          btnAprobar.addEventListener('click', async () => {
            const endpoint = solicitud.tipo === 'Productos'
              ? 'productos/aceptar'
              : 'nuevo-vendedor/aceptar';
            try {
              const res = await fetch(`http://localhost:3000/api/solicitudes/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ solicitudId: solicitud.solicitudId, vigenciaMeses: 6 })
              });
              if (!res.ok) throw new Error('Error al aprobar');
              alert('Solicitud aprobada');
              card.remove();
            } catch (err) {
              console.error('Error al aprobar solicitud:', err);
              alert('Error al aprobar solicitud');
            }
          });
        }

        // Elementos para rechazo de solicitud
        const btnRechazar = card.querySelector('.btn-rechazar');
        const opcionesRechazo = card.querySelector('.rechazo-opciones');
        const contenedorChecks = card.querySelector('.seleccion-productos');
        const btnConfirmarRechazo = card.querySelector('.btn-confirmar-rechazo');
        const textarea = card.querySelector('textarea');

        // Mostrar opciones de rechazo y cargar productos para seleccionar
        if (btnRechazar) {
          btnRechazar.addEventListener('click', async () => {
            opcionesRechazo.style.display = opcionesRechazo.style.display === 'none' ? 'block' : 'none';
            contenedorChecks.innerHTML = '<p><strong>Selecciona productos a rechazar:</strong></p>';

            try {
              const res = await fetch(`http://localhost:3000/api/solicitudes/productos/${solicitud.solicitudId}`);
              const productos = await res.json();
              productos.forEach(prod => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = 'productosRechazo';
                checkbox.value = prod.id;

                const label = document.createElement('label');
                label.textContent = `${prod.nombre} (${prod.categoria})`;
                label.prepend(checkbox);

                contenedorChecks.appendChild(label);
                contenedorChecks.appendChild(document.createElement('br'));
              });
            } catch (error) {
              contenedorChecks.innerHTML += '<p style="color:red;">Error al cargar productos</p>';
            }
          });
        }

        // Confirmar rechazo con motivo y productos seleccionados
        if (btnConfirmarRechazo) {
          btnConfirmarRechazo.addEventListener('click', async () => {
            const motivo = textarea.value.trim();
            if (!motivo) return alert('Escribe el motivo del rechazo');

            const productosSeleccionados = Array.from(
              card.querySelectorAll('input[name="productosRechazo"]:checked')
            ).map(cb => parseInt(cb.value));

            const endpoint = solicitud.tipo === 'Productos'
              ? 'productos/rechazar'
              : 'nuevo-vendedor/rechazar';

            try {
              const res = await fetch(`http://localhost:3000/api/solicitudes/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  solicitudId: solicitud.solicitudId,
                  motivo,
                  productosRechazados: productosSeleccionados
                })
              });
              if (!res.ok) throw new Error('Error al rechazar');
              alert('Solicitud rechazada');
              card.remove();
            } catch (err) {
              console.error('Error al rechazar solicitud:', err);
              alert('Error al rechazar solicitud');
            }
          });
        }
      });
    } catch (error) {
      // En caso de error con la solicitud principal
      console.error('Error al buscar:', error);
      contenedorResultados.innerHTML = '<p>Error al realizar la búsqueda.</p>';
    }
  });
});
