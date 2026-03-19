// Espera que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

  // Selección de elementos del DOM necesarios
  const btnAgregar = document.getElementById('agregarProducto');
  const contenedorProductos = document.getElementById('productos-container');
  const form = document.querySelector('.formulario');
  const btnNuevaSolicitud = document.getElementById('btnNuevaSolicitud');
  const btnCancelar = document.getElementById('btnCancelar');
  const mensajeInicial = document.getElementById('mensajeInicial');
  const aviso = document.getElementById('aviso');

  let permisoBloqueado = false; // Controla si el usuario ya tiene permiso

  // Estado inicial de visibilidad
  form.style.display = 'none';
  mensajeInicial.style.display = 'block';
  btnCancelar.style.display = 'none';
  aviso.style.display = 'none';

  // Evento al dar clic en "Nueva solicitud"
  btnNuevaSolicitud.addEventListener('click', async () => {
    const usuarioId = localStorage.getItem('usuarioId');

    if (!usuarioId) {
      alert('Debes iniciar sesión primero.');
      return;
    }

    try {
      // Verifica si el usuario ya tiene permiso
      const res = await fetch(`http://localhost:3000/api/vendedores/tienePermiso/${usuarioId}`);
      const data = await res.json();

      if (data.tienePermiso) {
        // Si ya tiene permiso, bloquea el acceso al formulario
        permisoBloqueado = true;
        form.style.display = 'none';
        mensajeInicial.style.display = 'block';
        btnCancelar.style.display = 'none';
        aviso.style.display = 'none';
        alert('Ya tienes un permiso registrado. No puedes hacer otra solicitud.');
        return;
      }

      // Mostrar formulario si no tiene permiso
      permisoBloqueado = false;
      form.style.display = 'block';
      btnNuevaSolicitud.style.display = 'none';
      btnCancelar.style.display = 'block';
      mensajeInicial.style.display = 'none';
      aviso.style.display = 'block';

    } catch (error) {
      console.error('Error al verificar permiso:', error);
      alert('Error al verificar permiso. Intenta más tarde.');
    }
  });

  // Evento al enviar el formulario
  form.addEventListener('submit', async (e) => {
    // Bloquea si ya hay permiso
    if (permisoBloqueado) {
      e.preventDefault();
      alert('No puedes enviar esta solicitud porque ya tienes un permiso registrado.');
      return;
    }

    e.preventDefault(); // Previene recarga

    const usuarioId = localStorage.getItem('usuarioId');
    if (!usuarioId) {
      alert('Debes iniciar sesión primero.');
      return;
    }

    // Construye FormData para enviar archivos y datos
    const formData = new FormData(form);
    formData.append('usuarioId', usuarioId);

    // Extrae los días seleccionados
    const diasSeleccionados = Array.from(
      form.querySelectorAll('input[name="diasVenta[]"]:checked')
    ).map(cb => cb.value);

    // Recolecta los productos
    const productos = Array.from(document.querySelectorAll('.producto')).map(div => {
      return {
        categoria: div.querySelector('select[name="categoriaProducto[]"]').value,
        nombre: div.querySelector('input[name="nombreProducto[]"]').value,
        descripcion: div.querySelector('textarea[name="descripcionProducto[]"]').value
      };
    });

    // Validación: al menos un producto
    if (productos.length === 0) {
      alert('Debes agregar al menos un producto.');
      return;
    }

    // Agrega campos JSON al FormData
    formData.append('dias_venta', JSON.stringify(diasSeleccionados));
    formData.append('productos', JSON.stringify(productos));

    try {
      // Envío al backend
      const response = await fetch('http://localhost:3000/api/vendedores/registrar', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        alert('Solicitud enviada con éxito, reinicia sesión para cargar tus datos');

        // Guarda el ID del vendedor tras registrarse correctamente
        const resV = await fetch(`http://localhost:3000/api/vendedores/obtenerVendedorId/${usuarioId}`);
        const dataV = await resV.json();

        if (resV.ok && dataV.vendedorId) {
          localStorage.setItem('vendedorId', dataV.vendedorId);
        }

        // Redirige a la pantalla principal del vendedor
        window.location.href = 'Vendedor.html';
      } else {
        alert('Error: ' + data.mensaje);
      }

    } catch (error) {
      console.error('Error al enviar la solicitud:', error);
      alert('Error al conectar con el servidor');
    }
  });

  // Evento: agregar nuevo bloque de producto
  if (btnAgregar) {
    btnAgregar.addEventListener('click', () => {
      const productoDiv = document.createElement('div');
      productoDiv.classList.add('producto');

      // HTML del formulario de producto
      productoDiv.innerHTML = `
        <label class="labeL">Categoría del producto: <br />
          <select name="categoriaProducto[]" class="f" required>
            <option value="">Selecciona una categoría</option>
            <option value="comida">Comida</option>
            <option value="bebidas">Bebidas</option>
            <option value="dulces">Dulces</option>
            <option value="postres">Postres</option>
            <option value="papeleria">Papelería</option>
            <option value="ropa">Ropa</option>
            <option value="otra">Otra</option>
          </select>
        </label><br />
        <label class="labeL">Nombre del producto: <br />
          <input type="text" name="nombreProducto[]" class="f" required />
        </label><br />
        <label class="labeL">Descripción del producto:<br />
          <textarea name="descripcionProducto[]" rows="1" class="f" required></textarea>
        </label><br />
        <button type="button" class="eliminarProducto" id="btnEliminar">- Eliminar producto</button><br />
      `;

      contenedorProductos.appendChild(productoDiv);

      // Evento: eliminar este producto
      const btnEliminar = productoDiv.querySelector('.eliminarProducto');
      btnEliminar.addEventListener('click', () => {
        contenedorProductos.removeChild(productoDiv);
      });
    });
  }

  // Evento: cancelar formulario
  btnCancelar.addEventListener('click', () => {
    form.style.display = 'none';
    contenedorProductos.innerHTML = ''; // Elimina productos
    form.reset(); // Limpia el formulario base
    mensajeInicial.style.display = 'block';
    aviso.style.display = 'none';
    btnNuevaSolicitud.style.display = 'inline-block';
    btnCancelar.style.display = 'none';
  });
});




