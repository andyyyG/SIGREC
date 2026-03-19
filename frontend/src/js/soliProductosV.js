// Espera a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', async () => {
    // Obtiene el contenedor donde se mostrarán las solicitudes
    const contenedor = document.getElementById('contenedorSolicitudes');

    try {
        // Realiza una petición para obtener las solicitudes de productos
        const res = await fetch('http://localhost:3000/api/solicitudes/productosV');
        console.log('Respuesta del backend:', res);

        // Si la respuesta no es exitosa, lanza un error
        if (!res.ok) throw new Error('Error al cargar solicitudes');

        // Convierte la respuesta a formato JSON
        const solicitudes = await res.json();

        // Si no hay solicitudes, muestra mensaje y termina
        if (solicitudes.length === 0) {
            contenedor.innerHTML = '<p>No hay solicitudes pendientes.</p>';
            return;
        }

        // Recorre cada solicitud para crear su tarjeta en el DOM
        solicitudes.forEach(solicitud => {
            console.log(solicitud);

            // Crea un div para la tarjeta y le aplica estilos
            const card = document.createElement('div');
            card.classList.add('solicitud-card');
            card.style.border = '1px solid rgba(163, 124, 47, 0.76)';
            card.style.padding = '10px';
            card.style.marginBottom = '10px';

            // Genera el HTML para la lista de productos, si existen
            const productosHtml = Array.isArray(solicitud.productos)
                ? solicitud.productos.map(p =>
                    `<li><strong>${p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1)}:</strong> ${p.nombre}, ${p.descripcion}</li>`
                ).join('')
                : '<li>No hay productos</li>';

            // Inserta el contenido de la tarjeta con la información de la solicitud
            card.innerHTML = `
        <p><strong>Fecha de solicitud:</strong> ${new Date(solicitud.fecha).toLocaleDateString()}</p>
        <p><strong>Nombre del vendedor:</strong> ${solicitud.nombre} ${solicitud.apellidoP} ${solicitud.apellidoM}</p>
        <p><strong>Productos propuestos:</strong></p>
        <ul>${productosHtml}</ul>
        <div class="acciones" style="margin-top:10px;">
          <button class="btn-aprobar">✅ Aprobar</button>
          <button class="btn-rechazar">❌ Rechazar</button>
          <div class="rechazo-opciones" style="display:none; margin-top:10px;">
            <textarea placeholder="Motivo del rechazo..." style="width:70%; height:60px;" class="mot"></textarea>
            <div class="seleccion-productos" style="margin-top:10px; margin-bottom:15px;">
                <p><strong>Selecciona productos a rechazar:</strong></p>
                <!-- Aquí se llenarán los checkboxes dinámicamente -->
            </div>
            <button class="btn-confirmar-rechazo" style="margin-top:10px;">Enviar rechazo</button>
           </div>
        </div>
      `;

            // Obtiene referencias a los botones y áreas para interactuar
            const btnAprobar = card.querySelector('.btn-aprobar');
            const btnRechazar = card.querySelector('.btn-rechazar');
            const opcionesRechazo = card.querySelector('.rechazo-opciones');
            const btnConfirmarRechazo = card.querySelector('.btn-confirmar-rechazo');
            const textarea = card.querySelector('textarea');

            // Evento para mostrar/ocultar el formulario de rechazo y cargar productos
            btnRechazar.addEventListener('click', async () => {
                // Alterna visibilidad del formulario de rechazo
                opcionesRechazo.style.display = opcionesRechazo.style.display === 'none' ? 'block' : 'none';

                // Contenedor donde se colocarán los checkboxes de productos
                const contenedorChecks = opcionesRechazo.querySelector('.seleccion-productos');
                contenedorChecks.innerHTML = '<p><strong>Selecciona productos a rechazar:</strong></p>';

                try {
                    // Obtiene los productos relacionados a la solicitud para el rechazo parcial
                    const res = await fetch(`http://localhost:3000/api/solicitudes/productos/${solicitud.solicitudId}`);
                    const productos = await res.json();

                    // Por cada producto crea un checkbox para seleccionar si se quiere rechazar
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
                    // Si hay error al obtener productos, muestra mensaje
                    console.error('Error al obtener productos:', error);
                    contenedorChecks.innerHTML += '<p style="color:red;">Error al cargar productos</p>';
                }
            });

            // Evento para aprobar la solicitud
            btnAprobar.addEventListener('click', async () => {
                if (confirm('¿Estás seguro de aprobar esta solicitud?')) {
                    try {
                        // Envía la petición para aprobar la solicitud
                        const res = await fetch('http://localhost:3000/api/solicitudes/productos/aceptar', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                solicitudId: solicitud.solicitudId
                            }),
                        });
                        if (!res.ok) throw new Error('Error al aprobar');

                        alert('Solicitud aprobada');
                        // Remueve la tarjeta de la solicitud aprobada
                        card.remove();
                    } catch (error) {
                        alert('Error al aprobar la solicitud');
                        console.error(error);
                    }
                }
            });

            // Evento para enviar el rechazo con motivo y productos seleccionados
            btnConfirmarRechazo.addEventListener('click', async () => {
                const motivo = textarea.value.trim();
                if (!motivo) return alert('Escribe el motivo del rechazo');

                // Obtiene los productos seleccionados para rechazo parcial
                const productosSeleccionados = Array.from(
                    card.querySelectorAll('input[name="productosRechazo"]:checked')
                ).map(cb => parseInt(cb.value));

                if (!confirm('¿Estás seguro de rechazar esta solicitud?')) return;

                try {
                    // Envía la petición para rechazar la solicitud con detalles
                    const res = await fetch('http://localhost:3000/api/solicitudes/productos/rechazar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            solicitudId: solicitud.solicitudId,
                            motivo,
                            productosRechazados: productosSeleccionados
                        }),
                    });
                    if (!res.ok) throw new Error('Error al rechazar');

                    alert('Solicitud rechazada');
                    // Remueve la tarjeta de la solicitud rechazada
                    card.remove();
                } catch (error) {
                    alert('Error al rechazar la solicitud');
                    console.error(error);
                }
            });

            // Añade la tarjeta creada al contenedor principal
            contenedor.appendChild(card);
        });

    } catch (error) {
        // En caso de error general al cargar solicitudes, lo muestra en consola y en pantalla
        console.error(error);
        contenedor.innerHTML = '<p>Error al cargar las solicitudes.</p>';
    }
});
