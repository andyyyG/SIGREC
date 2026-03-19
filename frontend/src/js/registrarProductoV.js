// Espera a que todo el DOM esté cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const btnEditar = document.getElementById('btnEditar');
    const btnGuardar = document.getElementById('btnGuardar');
    const btnCancelar = document.getElementById('btnCancelar');
    const contenedor = document.getElementById('formularioProductos');
    const msj = document.getElementById('avisoContainer');
    const aviso = document.getElementById('aviso');

    // Obtiene el estado del permiso del vendedor desde localStorage
    const permisoEstado = localStorage.getItem('permisoEstado');

    // Evento: clic en botón "Nueva solicitud"
    btnEditar.addEventListener('click', () => {
        // Si el permiso no está aprobado, no se puede continuar
        if (permisoEstado !== 'Aprobado') {
            alert('Tu permiso no está aprobado, no puedes registrar productos.');
            return;
        }

        // Mostrar el contenedor y botones
        contenedor.innerHTML = ''; // Limpia contenido anterior
        contenedor.style.display = 'block';
        btnGuardar.style.display = 'block';
        btnCancelar.style.display = 'inline-block';
        btnEditar.style.display = 'none';
        msj.style.display = 'none';
        aviso.style.display = 'block';

        // Agrega el primer formulario de producto
        agregarFormularioProducto();

        // Crea y configura el botón "Agregar producto"
        const btnAgregarOtro = document.createElement('button');
        btnAgregarOtro.type = 'button';
        btnAgregarOtro.id = 'agregarOtro';
        btnAgregarOtro.textContent = '+ Agregar producto';
        btnAgregarOtro.style.backgroundColor = 'rgb(146, 64, 9)';
        btnAgregarOtro.style.color = '#fff';
        btnAgregarOtro.style.padding = '6px 11px';
        btnAgregarOtro.style.border = 'none';
        btnAgregarOtro.style.borderRadius = '8px';
        btnAgregarOtro.style.cursor = 'pointer';
        btnAgregarOtro.style.marginBottom = '20px';

        // Evento: agregar otro formulario
        btnAgregarOtro.addEventListener('click', agregarFormularioProducto);
        contenedor.appendChild(btnAgregarOtro);
    });

    // Función para agregar dinámicamente un formulario de producto
    function agregarFormularioProducto() {
        const form = document.createElement('div');
        form.className = 'formulario-producto';
        form.style.marginBottom = '10px';

        // Contenido HTML del formulario de producto
        form.innerHTML = `
            <label >Categoría del producto: <br /> </label>
                <select name="categoriaProducto[]" class="categoria" required>
                    <option value="Comida">Comida</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Dulces">Dulces</option>
                    <option value="Postres">Postres</option>
                    <option value="Papeleria">Papelería</option>
                    <option value="Ropa">Ropa</option>
                    <option value="Otra">Otra</option>
                </select>
            <label>Nombre del producto: <br />
                <input type="text" name="nombreProducto[]" class="nombre" required />
            </label>
            <label>Descripción del producto: <br />
                <textarea name="descripcionProducto[]" rows="2" class="descripcion" required></textarea>
            </label>
            
            <button type="button" class="eliminar-producto" >- Eliminar producto</button>
            <br />
        `;

        // Estilo a las etiquetas
        const labels = form.querySelectorAll('label');
        labels.forEach(label => {
            label.style.display = 'block';
            label.style.fontWeight = '600';
            label.style.marginBottom = '10px';
            label.style.fontSize = '1rem';
        });

        // Estilo a inputs y selects
        const inputs = form.querySelectorAll('select, input[type="text"], textarea');
        inputs.forEach(input => {
            input.style.width = '100%';
            input.style.padding = '8px';
            input.style.marginTop = '4px';
            input.style.marginBottom = '12px';
            input.style.fontSize = '1rem';
            input.style.fontFamily = 'Raleway';
            input.style.border = '1px solid #ccc';
            input.style.borderRadius = '4px';
        });

        // Estilo y funcionalidad del botón "Eliminar producto"
        const eliminarBtn = form.querySelector('.eliminar-producto');
        eliminarBtn.style.backgroundColor = 'rgb(146, 64, 9)';
        eliminarBtn.style.color = '#fff';
        eliminarBtn.style.padding = '7px 13px';
        eliminarBtn.style.border = 'none';
        eliminarBtn.style.borderRadius = '8px';
        eliminarBtn.style.cursor = 'pointer';

        // Evento: eliminar el formulario actual
        eliminarBtn.addEventListener('click', () => {
            form.remove();
        });

        // Inserta el formulario antes del botón "Agregar otro"
        const btnAgregar = document.getElementById('agregarOtro');
        if (btnAgregar) {
            contenedor.insertBefore(form, btnAgregar);
        } else {
            contenedor.appendChild(form);
        }
    }

    // Evento: clic en botón "Guardar"
    btnGuardar.addEventListener('click', async () => {
        const vendedorId = localStorage.getItem('vendedorId');

        if (!vendedorId) {
            alert('No se encontró el ID del vendedor');
            return;
        }

        // Recolecta todos los formularios
        const formularios = document.querySelectorAll('.formulario-producto');
        const productos = [];

        // Extrae la información de cada formulario
        formularios.forEach(form => {
            const categoria = form.querySelector('.categoria').value.trim();
            const nombre = form.querySelector('.nombre').value.trim();
            const descripcion = form.querySelector('.descripcion').value.trim();

            if (categoria && nombre && descripcion) {
                productos.push({ categoria, nombre, descripcion });
            }
        });

        // Validación: al menos un producto válido
        if (productos.length === 0) {
            alert('Agrega al menos un producto válido');
            return;
        }

        // Envía los productos al backend
        try {
            const response = await fetch(`http://localhost:3000/api/vendedores/${vendedorId}/registrar-productos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productos }) // Convierte a JSON
            });

            const resultado = await response.json();

            if (response.ok) {
                alert(resultado.mensaje);

                // Restablece la interfaz tras el envío exitoso
                contenedor.style.display = 'none';
                btnGuardar.style.display = 'none';
                btnEditar.style.display = 'inline-block';
                btnCancelar.style.display = 'none';
                contenedor.innerHTML = '';
                msj.style.display = 'block';
                aviso.style.display = 'none';
            } else {
                alert(`Error: ${resultado.mensaje}`);
            }
        } catch (error) {
            console.error('Error al registrar productos:', error);
            alert('Ocurrió un error al registrar productos');
        }
    });

    // Evento: click en botón "Cancelar"
    btnCancelar.addEventListener('click', () => {
        contenedor.style.display = 'none';
        btnGuardar.style.display = 'none';
        btnEditar.style.display = 'inline-block';
        btnCancelar.style.display = 'none';
        contenedor.innerHTML = '';
        msj.style.display = 'block';
        aviso.style.display = 'none';
    });
});

