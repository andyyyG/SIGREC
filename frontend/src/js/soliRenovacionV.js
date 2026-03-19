document.addEventListener('DOMContentLoaded', async () => {
    // Obtiene el contenedor donde se mostrarán las solicitudes de vendedores
    const contenedor = document.getElementById('contenedorSolicitudes');

    try {
        // Hace una petición GET al backend para obtener las solicitudes de vendedores
        const res = await fetch('http://localhost:3000/api/solicitudes/vendedores');
        console.log('Respuesta del backend:', res);

        // Si la respuesta no es exitosa, lanza un error
        if (!res.ok) throw new Error('Error al cargar solicitudes');

        // Convierte la respuesta en JSON
        const solicitudes = await res.json();

        // Si no hay solicitudes, muestra un mensaje y termina
        if (solicitudes.length === 0) {
            contenedor.innerHTML = '<p>No hay solicitudes pendientes.</p>';
            return;
        }

        // Por cada solicitud crea una "tarjeta" con la información y controles
        solicitudes.forEach(solicitud => {
            console.log(solicitud);

            // Crea un div para la tarjeta y le da estilos básicos
            const card = document.createElement('div');
            card.classList.add('solicitud-card');
            card.style.border = '1px solid rgba(163, 124, 47, 0.76)';
            card.style.padding = '10px';
            card.style.marginBottom = '10px';

            // Prepara el HTML de productos si existen
            const productosHtml = Array.isArray(solicitud.productos)
                ? solicitud.productos.map(p =>
                    `<li><strong>${p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1)}:</strong> ${p.nombre}, ${p.descripcion}</li>`
                ).join('')
                : '<li>No hay productos</li>';

            // Prepara la URL y el HTML para mostrar la identificación si existe
            const identificacionUrl = solicitud.identificacion ?
                `http://localhost:3000/uploads/${solicitud.identificacion}` : '';

            let identificacionHtml = '';
            if (identificacionUrl) {
                const extension = solicitud.identificacion.split('.').pop().toLowerCase();

                // Si es imagen, mostrar imagen con enlace para abrir completo
                if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
                    identificacionHtml = `
                    <p><strong>Identificación:</strong></p>
                    <img src="${identificacionUrl}" alt="Identificación" style="max-width:200px; max-height:150px;">
                    <br>
                    <a href="${identificacionUrl}" target="_blank" class='urlId'>Ver archivo completo</a>
                    `;
                } 
                // Si es PDF, mostrar embed con visor y enlace para abrir en nueva pestaña
                else if (extension === 'pdf') {
                    identificacionHtml = `
                    <p><strong>Identificación:</strong></p>
                    <embed src="${identificacionUrl}" type="application/pdf" width="100%" height="400px" />
                    <br>
                    <a href="${identificacionUrl}" target="_blank">Abrir en nueva pestaña</a>
                    `;
                } 
                // Para otros formatos solo mostrar enlace para abrir
                else {
                    identificacionHtml = `
                    <p><strong>Identificación:</strong> <a href="${identificacionUrl}" target="_blank">Ver archivo</a></p>
                    `;
                }
            }

            // ID dinámico para el select de vigencia (para que cada solicitud tenga su propio)
            const vigenciaId = `vigencia-select-${solicitud.solicitudId}`;

            // Insertar el contenido de la tarjeta con toda la info y botones
            card.innerHTML = `
        <p><strong>Fecha de solicitud:</strong> ${new Date(solicitud.fecha).toLocaleDateString()}</p>
        <p><strong>Nombre:</strong> ${solicitud.nombre} ${solicitud.apellidoP} ${solicitud.apellidoM}</p>
        <p><strong>Género:</strong> ${solicitud.genero}</p>
        <p><strong>Fecha de nacimiento:</strong> ${new Date(solicitud.fechaNacimiento).toLocaleDateString()}</p>
        <p><strong>Número de celular:</strong> ${solicitud.numCel}</p>
        <p><strong>Correo:</strong> ${solicitud.correo}</p>
        <p><strong>Días de venta:</strong> ${Array.isArray(solicitud.diasVenta) ? solicitud.diasVenta.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') : 'No especificado'}</p>
        <p><strong>Productos propuestos:</strong></p>
        <ul>${productosHtml}</ul>
        ${identificacionHtml} 
        <div class="vig" style="margin-top: 10px; display: none;">
            <br /><label for="${vigenciaId}" class='vigT'><strong>Vigencia del permiso:</strong></label>
            <select id="${vigenciaId}">
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">1 año</option>
            </select>
        </div>
        <div class="acciones" style="margin-top:10px;">
          <button class="btn-aprobar">✅ Aprobar</button>
          <button class="btn-rechazar">❌ Rechazar</button>
          <div class="rechazo-opciones" style="display:none; margin-top:10px;">
            <textarea placeholder="Motivo del rechazo..." style="width:70%; height:60px;" class="mot"></textarea>
            <div class="seleccion-productos" style="margin-top:10px; margin-bottom:15px;">
                <p><strong>Selecciona productos a rechazar (si aplica):</strong></p>
                <!-- Aquí se llenarán los checkboxes dinámicamente -->
            </div>
            <button class="btn-confirmar-rechazo" style="margin-top:10px;">Enviar rechazo</button>
           </div>
        </div>
      `;

            // Obtiene referencias a los elementos para los eventos
            const btnAprobar = card.querySelector('.btn-aprobar');
            const vigenciaContainer = card.querySelector('.vig');
            const btnRechazar = card.querySelector('.btn-rechazar');
            const opcionesRechazo = card.querySelector('.rechazo-opciones');
            const btnConfirmarRechazo = card.querySelector('.btn-confirmar-rechazo');
            const textarea = card.querySelector('textarea');

            // Evento para mostrar/ocultar el formulario de rechazo y cargar productos
            btnRechazar.addEventListener('click', async () => {
                opcionesRechazo.style.display = opcionesRechazo.style.display === 'none' ? 'block' : 'none';

                const contenedorChecks = opcionesRechazo.querySelector('.seleccion-productos');
                contenedorChecks.innerHTML = '<p><strong>Selecciona productos a rechazar (si aplica):</strong></p>';

                try {
                    // Obtener productos de la solicitud para mostrar checkbox de rechazo parcial
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
                    console.error('Error al obtener productos:', error);
                    contenedorChecks.innerHTML += '<p style="color:red;">Error al cargar productos</p>';
                }
            });

            // Evento para aprobar la solicitud
            btnAprobar.addEventListener('click', async () => {
                // Primero mostrar selector de vigencia si no visible
                if (vigenciaContainer.style.display === 'none') {
                    vigenciaContainer.style.display = 'block';
                    return;
                }

                // Confirmar aprobación y enviar datos al backend
                if (confirm('¿Estás seguro de aprobar esta solicitud?')) {
                    const selectVigencia = card.querySelector(`#vigencia-select-${solicitud.solicitudId}`);
                    const mesesVigencia = selectVigencia.value;
                    try {
                        const res = await fetch('http://localhost:3000/api/solicitudes/nuevo-vendedor/aceptar', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                solicitudId: solicitud.solicitudId,
                                vigenciaMeses: mesesVigencia
                            }),
                        });
                        if (!res.ok) throw new Error('Error al aprobar');
                        alert('Solicitud aprobada');
                        card.remove();
                    } catch (error) {
                        alert('Error al aprobar la solicitud');
                        console.error(error);
                    }
                }
            });

            // Evento para enviar el rechazo
            btnConfirmarRechazo.addEventListener('click', async () => {
                const motivo = textarea.value.trim();
                if (!motivo) return alert('Escribe el motivo del rechazo');

                // Obtiene los productos marcados para rechazo parcial
                const productosSeleccionados = Array.from(
                    card.querySelectorAll('input[name="productosRechazo"]:checked')
                ).map(cb => parseInt(cb.value));

                if (!confirm('¿Estás seguro de rechazar esta solicitud?')) return;

                try {
                    // Envía datos al backend para registrar rechazo
                    const res = await fetch('http://localhost:3000/api/solicitudes/nuevo-vendedor/rechazar', {
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
                    card.remove();
                } catch (error) {
                    alert('Error al rechazar la solicitud');
                    console.error(error);
                }
            });

            // Finalmente añade la tarjeta al contenedor en la página
            contenedor.appendChild(card);
        });

    } catch (error) {
        // Si ocurre un error general en la carga de solicitudes, mostrar mensaje
        console.error(error);
        contenedor.innerHTML = '<p>Error al cargar las solicitudes.</p>';
    }
});
