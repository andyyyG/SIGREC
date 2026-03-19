document.addEventListener('DOMContentLoaded', () => {
    // Se define la base de la URL para las peticiones a la API
    const API_BASE = 'http://localhost:3000/api'; 

    // Se obtienen los elementos del DOM necesarios para la funcionalidad
    const btnNuevaSolicitud = document.getElementById('btnNuevaSolicitud');
    const btnCancelar = document.getElementById('btnCancelar');
    const avisoContainer = document.getElementById('avisoContainer');
    const formulario = document.getElementById('formularioNuevaSolicitud');
    const productosContainer = document.getElementById('productos-container');
    const btnAgregarProducto = document.getElementById('agregarProducto');
    const aviso = document.getElementById('aviso');

    // Se obtiene el ID del vendedor desde localStorage
    let vendedorId = localStorage.getItem('vendedorId');

    // Se agrega el evento al botón de nueva solicitud
    btnNuevaSolicitud.addEventListener('click', async () => {
        try {
            // Se solicita la información comercial del vendedor
            const response = await fetch(`${API_BASE}/vendedores/infoComercial/${vendedorId}`);
            const data = await response.json();

            // Se obtiene el estado del permiso del vendedor
            const permisoEstado = data.permisoVendedor?.estado || 'Desconocido';

            // Se verifica si el permiso actual permite enviar nueva solicitud
            if (!['Rechazado', 'Revocado', 'Vencido'].includes(permisoEstado)) {
                alert(`No puedes enviar una nueva solicitud porque tu permiso está ${permisoEstado}`);
                return;
            }

            // Si el permiso lo permite, se muestra el formulario
            avisoContainer.style.display = 'none';
            btnNuevaSolicitud.style.display = 'none';
            btnCancelar.style.display = 'inline-block';
            formulario.style.display = 'block';
            aviso.style.display = 'block';
        } catch (error) {
            // Se muestra un error si falla la petición
            console.error('Error al verificar el estado del permiso:', error);
            alert('Error al verificar el estado del permiso. Intenta más tarde.');
        }
    });

    // Se agrega producto al formulario al hacer clic en el botón correspondiente
    btnAgregarProducto.addEventListener('click', () => {
        // Se crea un nuevo contenedor para un producto
        const nuevoProducto = document.createElement('div');
        nuevoProducto.classList.add('producto-item');

        // Se inserta el HTML del nuevo producto
        nuevoProducto.innerHTML = `
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
            </label> <br />
            <label class="labeL">Nombre del producto: <br />
                <input type="text" name="nombreProducto[]" class="f" required />
            </label> <br /> 
            <label class="labeL">Descripción del producto:<br />
                <textarea name="descripcionProducto[]" rows="1" class="f" required></textarea>
            </label> <br />
            <button type="button" class="eliminarProducto">- Eliminar producto</button>
            <br />
        `;

        // Se agrega el nuevo producto al contenedor de productos
        productosContainer.appendChild(nuevoProducto);
    });

    // Se permite eliminar productos agregados al hacer clic en su botón correspondiente
    productosContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('eliminarProducto')) {
            // Se elimina el contenedor del producto seleccionado
            e.target.parentElement.remove();
        }
    });

    // Se gestiona el envío del formulario de solicitud
    formulario.addEventListener('submit', async (e) => {
        e.preventDefault(); // Se evita el comportamiento por defecto

        // Se crea un objeto FormData para almacenar la información del formulario
        const formData = new FormData();

        // Se agrega el archivo de identificación
        formData.append('identificacion', formulario.identificacion.files[0]);

        // Se obtienen los días seleccionados de venta
        const diasSeleccionados = Array.from(formulario.querySelectorAll('input[name="diasVenta[]"]:checked')).map(el => el.value);
        formData.append('diasVenta', JSON.stringify(diasSeleccionados));

        // Se construye un arreglo con los productos ingresados
        const productos = [];
        const nombres = formulario.querySelectorAll('input[name="nombreProducto[]"]');
        const categorias = formulario.querySelectorAll('select[name="categoriaProducto[]"]');
        const descripciones = formulario.querySelectorAll('textarea[name="descripcionProducto[]"]');

        for (let i = 0; i < nombres.length; i++) {
            productos.push({
                nombre: nombres[i].value,
                categoria: categorias[i].value,
                descripcion: descripciones[i].value,
            });
        }

        // Se agrega la información de productos al FormData
        formData.append('productos', JSON.stringify(productos));

        try {
            // Se envía la solicitud al servidor
            const response = await fetch(`${API_BASE}/vendedores/${vendedorId}/nueva-solicitud`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            // Se muestra mensaje según el resultado
            if (response.ok) {
                alert('Solicitud enviada correctamente');
                // Se limpia y oculta el formulario tras el envío exitoso
                formulario.reset();
                formulario.style.display = 'none';
                avisoContainer.style.display = 'block';
                btnNuevaSolicitud.style.display = 'inline-block';
                btnCancelar.style.display = 'none';
                aviso.style.display = 'none';
                productosContainer.innerHTML = '';
            } else {
                alert('Error: ' + data.mensaje);
            }
        } catch (error) {
            // Se muestra un error si ocurre algún problema durante el envío
            console.error('Error al enviar la solicitud:', error);
            alert('Error al enviar la solicitud');
        }
    });

    // Se cancela la creación de nueva solicitud y se restablece el estado inicial
    btnCancelar.addEventListener('click', () => {
        formulario.style.display = 'none';
        avisoContainer.style.display = 'block';
        btnNuevaSolicitud.style.display = 'inline-block';
        btnCancelar.style.display = 'none';
        aviso.style.display = 'none';
        productosContainer.innerHTML = '';
    });

});
