// Se ejecuta cuando el DOM ha sido completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos del DOM usados para la búsqueda y resultado
  const inputBusqueda = document.getElementById('inputBusqueda');
  const btnBuscar = document.getElementById('btnBuscar');
  const resultadoDiv = document.getElementById('resultadoBusqueda');

  // Listener para el botón de búsqueda
  btnBuscar.addEventListener('click', async () => {
    // Se obtiene el valor ingresado en el input y se elimina espacios extras
    const query = inputBusqueda.value.trim();

    // Validación: si el campo está vacío se alerta y se termina la función
    if (!query) {
      alert('Ingresa un nombre para buscar');
      return;
    }

    try {
      // Se realiza una petición GET al backend con el término de búsqueda
      const res = await fetch(`http://localhost:3000/api/admin/vendedores?query=${encodeURIComponent(query)}`);
      const vendedores = await res.json();

      // Si no se encontraron vendedores, se muestra mensaje en el contenedor
      if (!vendedores.length) {
        resultadoDiv.innerHTML = '<p>No se encontraron vendedores.</p>';
        return;
      }

      // Se toma el primer vendedor encontrado (puede modificarse para mostrar varios)
      const v = vendedores[0];

      // Se muestra la información del vendedor y un botón para generar reporte
      resultadoDiv.innerHTML = `
      <div class="card">
        <p class="text"><strong>Vendedor:</strong> ${v.nombre} ${v.apellidoP} ${v.apellidoM}</p>
        <button id="btnGenerarReporte">Generar reporte</button>
        <div id="formularioReporte" style="display: none; margin-top: 10px;">
          <select id="selectMotivo">
            <option value="">Selecciona motivo</option>
            <option value="Productos">Productos</option>
            <option value="Permiso">Permiso</option>
            <option value="Comportamiento">Comportamiento</option>
            <option value="Otro">Otro</option>
          </select>
          <br>
          <textarea id="inputDescripcion" rows="4" placeholder="Descripción del reporte..." style="width: 100%; margin-top: 5px;"></textarea>
          <br>
          <button id="btnEnviarReporte">Enviar reporte</button>
        </div>
      </div>
      `;

      // Listener para mostrar el formulario de reporte al dar click en el botón
      document.getElementById('btnGenerarReporte').addEventListener('click', () => {
        document.getElementById('formularioReporte').style.display = 'block';
      });

      // Listener para enviar el reporte al backend
      document.getElementById('btnEnviarReporte').addEventListener('click', async () => {
        // Se obtienen los valores del motivo seleccionado y descripción escrita
        const motivo = document.getElementById('selectMotivo').value;
        const descripcion = document.getElementById('inputDescripcion').value.trim();

        // Validación: ambos campos deben estar completos
        if (!motivo || !descripcion) {
          alert('Debes seleccionar un motivo y escribir la descripción');
          return;
        }

        // Se construye el objeto con la información del reporte
        const body = {
          vendedorId: v.vendedorId,
          motivo,
          descripcion
        };

        try {
          // Se envía el reporte al backend usando método POST
          const res = await fetch('http://localhost:3000/api/admin/reportes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          const data = await res.json();

          if (res.ok) {
            // Si todo sale bien, se notifica al usuario y se oculta el formulario
            alert('Reporte enviado correctamente y correo enviado al vendedor');
            document.getElementById('formularioReporte').style.display = 'none';
          } else {
            // Si hubo un error, se muestra el mensaje retornado o uno genérico
            alert(data.error || 'Error al enviar el reporte');
          }
        } catch (error) {
          // Si hay un error en la comunicación, se muestra en consola y alerta
          console.error('Error:', error);
          alert('Error al enviar el reporte');
        }
      });

    } catch (error) {
      // Si falla la búsqueda, se muestra mensaje en consola y en la página
      console.error('Error al buscar vendedor:', error);
      resultadoDiv.innerHTML = '<p>Error al buscar vendedor.</p>';
    }
  });
});

