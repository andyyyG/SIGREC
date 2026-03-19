// Espera a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', async () => {
    // Obtiene el contenedor donde se mostrarán las solicitudes
    const contenedor = document.getElementById('contenedorSolicitudes');

    try {
        // Hace una petición fetch para obtener las solicitudes de nuevos vendedores
        const res = await fetch('http://localhost:3000/api/solicitudes/nuevos-vendedores');
        console.log('Respuesta del backend:', res);

        // Si la respuesta no es exitosa lanza un error
        if (!res.ok) throw new Error('Error al cargar solicitudes');

        // Parsea la respuesta JSON con las solicitudes
        const solicitudes = await res.json();

        // Si no hay solicitudes muestra mensaje correspondiente
        if (solicitudes.length === 0) {
            contenedor.innerHTML = '<p>No hay solicitudes pendientes.</p>';
            return;
        }

        // Itera cada solicitud para crear su tarjeta visual
        solicitudes.forEach(solicitud => {
            console.log(solicitud);

            // Crea un div para la tarjeta de la solicitud y le añade estilos
            const card = document.createElement('div');
            card.classList.add('solicitud-card');
            card.style.border = '1px solid rgba(163, 124, 47, 0.76)';
            card.style.padding = '10px';
            card.style.marginBottom = '10px';

            // Genera el HTML para productos, verificando que sea un arreglo válido
            const productosHtml = Array.isArray(solicitud.productos)
                ? solicitud.productos.map(p =>
                    `<li><strong>${p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1)}:</strong> ${p.nombre}, ${p.descripcion}</li>`
                ).join('')
                : '<li>No hay productos</li>';

            // Genera el texto para los días de venta, verificando que sea arreglo válido
            const diasHtml = Array.isArray(solicitud.diasVenta)
                ? solicitud.diasVenta.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
                : 'No especificado';

            // Construye la URL para el archivo de identificación, si existe
            const identificacionUrl = solicitud.identificacion ?
                `http://localhost:3000/uploads/${solicitud.identificacion}` : '';

            let identificacionHtml = '';
            if (identificacionUrl) {
                // Obtiene la extensión del archivo para determinar cómo mostrarlo
                const extension = solicitud.identificacion.split('.').pop().toLowerCase();

                // Si es imagen, muestra la imagen y un enlace para verla completa
                if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
                    identificacionHtml = `
                    <p><strong>Identificación:</strong></p>
                    <img src="${identificacionUrl}" alt="Identificación" style="max-width:200px; max-height:150px;">
                    <br>
                    <a href="${identificacionUrl}" target="_blank" class='urlId'>Ver archivo completo</a>
                    `;
                }
                // Si es PDF, lo incrusta con etiqueta embed y un enlace para abrir en pestaña nueva
                else if (extension === 'pdf') {
                    identificacionHtml = `
                    <p><strong>Identificación:</strong></p>
                    <embed src="${identificacionUrl}" type="application/pdf" width="100%" height="400px" />
                    <br>
                    <a href="${identificacionUrl}" target="_blank">Abrir en nueva pestaña</a>
                    `;
                }
                // Para otros tipos, solo muestra enlace para ver archivo
                else {
                    identificacionHtml = `
                    <p><strong>Identificación:</strong> <a href="${identificacionUrl}" target="_blank">Ver archivo</a></p>
                    `;
                }
            }

            // ID único para el select de vigencia del permiso, basado en la solicitud
            const vigenciaId = `vigencia-select-${solicitud.solicitudId}`;

            // Inserta el contenido HTML en la tarjeta con toda la información
            card.innerHTML = `
        <p><strong>Fecha de solicitud:</strong> ${new Date(solicitud.fecha).toLocaleDateString()}</p>
        <p><strong>Nombre:</strong> ${solicitud.nombre} ${solicitud.apellidoP} ${solicitud.apellidoM}</p>
        <p><strong>Género:</strong> ${solicitud.genero}</p>
        <p><strong>Fecha de nacimiento:</strong> ${new Date(solicitud.fechaNacimiento).toLocaleDateString()}</p>
        <p><strong>Número de celular:</strong> ${solicitud.numCel}</p>
        <p><strong>Correo:</strong> ${solicitud.correo}</p>
        <p><strong>Días de venta:</strong> ${diasHtml}</p>
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
                <p><strong>Selecciona productos a rechazar:</strong></p>
                <!-- Aquí se llenarán los checkboxes dinámicamente -->
            </div>
            <button class="btn-confirmar-rechazo" style="margin-top:10px;">Enviar rechazo</button>
           </div>

        </div>
      `;

            // Obtiene referencias a los elementos para eventos
            const btnAprobar = card.querySelector('.btn-aprobar');
            const vigenciaContainer = card.querySelector('.vig');
            const btnRechazar = card.querySelector('.btn-rechazar');
            const opcionesRechazo = card.querySelector('.rechazo-opciones');
            const btnConfirmarRechazo = card.querySelector('.btn-confirmar-rechazo');
            const textarea = card.querySelector('textarea');

            // Evento para mostrar/ocultar opciones de rechazo y cargar productos para selección
            btnRechazar.addEventListener('click', async () => {
                opcionesRechazo.style.display = opcionesRechazo.style.display === 'none' ? 'block' : 'none';

                const contenedorChecks = opcionesRechazo.querySelector('.seleccion-productos');
                contenedorChecks.innerHTML = '<p><strong>Selecciona productos a rechazar (si aplica):</strong></p>';

                try {
                    // Fetch para obtener los productos asociados a la solicitud
                    const res = await fetch(`http://localhost:3000/api/solicitudes/productos/${solicitud.solicitudId}`);
                    const productos = await res.json();

                    // Por cada producto, crea un checkbox para selección en rechazo parcial
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
                    // Si hay error al cargar productos, muestra mensaje en rojo
                    console.error('Error al obtener productos:', error);
                    contenedorChecks.innerHTML += '<p style="color:red;">Error al cargar productos</p>';
                }
            });

            // Evento para aprobar la solicitud, mostrando select de vigencia antes de confirmar
            btnAprobar.addEventListener('click', async () => {
                // Si el select de vigencia está oculto, lo muestra para elegir
                if (vigenciaContainer.style.display === 'none') {
                    vigenciaContainer.style.display = 'block';
                    return;
                }

                // Confirmación para aprobar solicitud
                if (confirm('¿Estás seguro de aprobar esta solicitud?')) {
                    const selectVigencia = card.querySelector(`#vigencia-select-${solicitud.solicitudId}`);
                    const mesesVigencia = selectVigencia.value;

                    try {
                        // Envío POST para aprobar solicitud con vigencia seleccionada
                        const res = await fetch('http://localhost:3000/api/solicitudes/nuevo-vendedor/aceptar', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                solicitudId: solicitud.solicitudId,
                                vigenciaMeses: mesesVigencia
                            }),
                        });

                        // Si la respuesta no es OK, lanza error
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

            // Evento para confirmar el rechazo de la solicitud con motivo y productos rechazados
            btnConfirmarRechazo.addEventListener('click', async () => {
                const motivo = textarea.value.trim();

                // Valida que se escriba un motivo para el rechazo
                if (!motivo) return alert('Escribe el motivo del rechazo');

                // Obtiene los IDs de productos seleccionados para rechazo parcial
                const productosSeleccionados = Array.from(
                    card.querySelectorAll('input[name="productosRechazo"]:checked')
                ).map(cb => parseInt(cb.value));

                // Confirmación para rechazar solicitud
                if (!confirm('¿Estás seguro de rechazar esta solicitud?')) return;

                try {
                    // Envío POST para rechazar la solicitud con detalles
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
                    // Remueve la tarjeta de la solicitud rechazada
                    card.remove();
                } catch (error) {
                    alert('Error al rechazar la solicitud');
                    console.error(error);
                }
            });

            // Añade la tarjeta al contenedor principal
            contenedor.appendChild(card);
        });

    } catch (error) {
        // Si ocurre un error en la petición inicial, lo muestra en consola y muestra mensaje al usuario
        console.error(error);
        contenedor.innerHTML = '<p>Error al cargar las solicitudes.</p>';
    }
});
