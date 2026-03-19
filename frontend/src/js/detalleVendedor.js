// Se espera a que el DOM esté completamente cargado antes de ejecutar el código
document.addEventListener('DOMContentLoaded', async () => {

  // Se obtiene el contenedor donde se mostrará la información del vendedor
  const contenedorDetalle = document.getElementById('detalleVendedor');

  // Se extrae el ID del vendedor desde los parámetros de la URL
  const params = new URLSearchParams(window.location.search);
  const vendedorId = params.get('id');

  // Si no se proporciona un ID en la URL, se muestra un mensaje y se detiene la ejecución
  if (!vendedorId) {
    contenedorDetalle.innerHTML = '<p>ID de vendedor no especificado.</p>';
    return;
  }

  // Función auxiliar para capitalizar la primera letra de un texto
  function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  }

  try {
    // Se solicita al servidor la información del vendedor
    const res = await fetch(`http://localhost:3000/api/admin/vendedores/${vendedorId}`);
    if (!res.ok) throw new Error('No se pudo obtener el vendedor');
    const vendedor = await res.json();

    // Se construye el nombre completo del vendedor
    const nombreCompleto = `${vendedor.nombre} ${vendedor.apellidoP || ''} ${vendedor.apellidoM || ''}`;

    // Se genera la lista de productos si existen
    let productosHtml = '<li>No tiene productos registrados</li>';
    if (vendedor.productos && vendedor.productos.length > 0) {
      productosHtml = vendedor.productos
        .map(p => `<li><strong>${capitalizar(p.categoria)}:</strong> ${p.nombre}, ${p.descripcion}</li>`)
        .join('');
    }

    // Se genera la lista de reportes si existen
    let reportesHtml = '<li>No tiene reportes</li>';
    if (vendedor.reportes && vendedor.reportes.length > 0) {
      reportesHtml = vendedor.reportes
        .map(r => `<li><strong>Motivo:</strong> ${r.motivo}<br><strong>Descripción:</strong> ${r.descripcion}</li>`)
        .join('');
    }

    // Se genera el contenido HTML para mostrar la identificación si existe
    let identificacionHtml = '';
    if (vendedor.identificacion) {
      const identificacionUrl = `http://localhost:3000/uploads/${vendedor.identificacion}`;
      const extension = vendedor.identificacion.split('.').pop().toLowerCase();

      // Se muestra como imagen si la extensión es de tipo imagen
      if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        identificacionHtml = `
          <p class="tit"><strong>Identificación:</strong></p>
          <img class="id" src="${identificacionUrl}" alt="Identificación" style="max-width:200px; max-height:150px;">
          <br>
          <a href="${identificacionUrl}" target="_blank">Ver archivo completo</a>
        `;
      }
      // Se muestra como PDF embebido si es un archivo PDF
      else if (extension === 'pdf') {
        identificacionHtml = `
          <p class="tit"><strong>Identificación:</strong></p>
          <embed class="id" src="${identificacionUrl}" type="application/pdf" width="100%" height="400px" />
          <br>
          <a href="${identificacionUrl}" target="_blank">Abrir en nueva pestaña</a>
        `;
      }
      // En caso de otro tipo de archivo, se muestra un enlace
      else {
        identificacionHtml = `<p><strong>Identificación:</strong> <a href="${identificacionUrl}" target="_blank">Ver archivo</a></p>`;
      }
    }

    // Se formatea la lista de días de venta si está disponible
    let diasVentaFormateados = 'No especificado';
    if (Array.isArray(vendedor.diasVenta) && vendedor.diasVenta.length > 0) {
      diasVentaFormateados = vendedor.diasVenta.map(dia => capitalizar(dia)).join(', ');
    }

    // Se construye el contenido HTML con todos los datos del vendedor
    contenedorDetalle.innerHTML = `
    <div class="cont">
      <div class="texto">
        <h2 class="title">Detalles del vendedor</h2>
        <p class="tit"><strong>Nombre:</strong> ${nombreCompleto}</p>
        <p class="tit"><strong>Correo:</strong> ${vendedor.correo}</p>
        <p class="tit"><strong>Género:</strong> ${vendedor.genero}</p>
        <p class="tit"><strong>Fecha de nacimiento:</strong> ${new Date(vendedor.fechaNacimiento).toLocaleDateString()}</p>
        <p class="tit"><strong>Número de celular:</strong> ${vendedor.numCel}</p>
        <p class="tit"><strong>Estado del permiso:</strong> ${vendedor.estado_permiso}</p>
        <p class="tit"><strong>Vigencia:</strong> ${vendedor.vigencia ? new Date(vendedor.vigencia).toLocaleDateString() : 'Sin definir'}</p>
        <p class="tit"><strong>Días de venta:</strong> ${diasVentaFormateados}</p>
        ${identificacionHtml}
        <p class="tit"><strong>Productos:</strong></p>
        <ul class="id">${productosHtml}</ul>
        <p class="tit"><strong>Reportes:</strong></p>
        <ul class="id">${reportesHtml}</ul>

        <div style="margin-top: 20px;">
          <button id="btnRevocar">
            Revocar permiso
          </button>
          <div id="motivoContainer" style="margin-top: 10px; display: none;">
            <textarea id="motivoRevocar" placeholder="Especifica el motivo" rows="4" style="width: 100%;"></textarea>
            <button id="btnConfirmarRevocar">
              Confirmar revocación
            </button>
          </div>
        </div>
      </div>
    </div>
    `;

    // Se obtiene referencia al botón de revocación y su contenedor de motivo
    const btnRevocar = document.getElementById('btnRevocar');
    const motivoContainer = document.getElementById('motivoContainer');
    const btnConfirmarRevocar = document.getElementById('btnConfirmarRevocar');

    // Se define el evento para mostrar/ocultar el área de revocación
    btnRevocar.addEventListener('click', () => {
      if (vendedor.estado_permiso === 'Revocado') {
        alert('No se puede revocar el permiso porque ya se encuentra revocado.');
        return;
      }
      motivoContainer.style.display = motivoContainer.style.display === 'none' ? 'block' : 'none';
    });

    // Se define el evento para enviar la solicitud de revocación
    btnConfirmarRevocar.addEventListener('click', async () => {
      const motivo = document.getElementById('motivoRevocar').value.trim();
      if (!motivo) {
        alert('Por favor ingresa el motivo para revocar el permiso.');
        return;
      }

      if (!confirm('¿Estás seguro de que deseas revocar el permiso?')) {
        return;
      }

      try {
        const res = await fetch(`http://localhost:3000/api/admin/vendedores/${vendedorId}/revocar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motivo })
        });

        const data = await res.json();
        if (res.ok) {
          alert('Permiso revocado y correo enviado.');
          window.location.reload();
        } else {
          alert(data.error || 'Error al revocar permiso.');
        }
      } catch (error) {
        console.error('Error al revocar permiso:', error);
        alert('Error al revocar permiso.');
      }
    });

  } catch (error) {
    console.error('Error al cargar detalle:', error);
    contenedorDetalle.innerHTML = '<p>Error al cargar detalles del vendedor.</p>';
  }
});
