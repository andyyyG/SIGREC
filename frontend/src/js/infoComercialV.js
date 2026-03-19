// Se ejecuta cuando el contenido del DOM ha sido completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'http://localhost:3000/api';

    // Se obtienen referencias a elementos del DOM
    const permisoDiv = document.getElementById('permisoVText');
    const vigenciaDiv = document.getElementById('vigenciaText');
    const diasDiv = document.getElementById('diasVText');
    const productosDiv = document.querySelector('.productos');
    const btnEditar = document.getElementById('btnEditar');
    const btnGuardar = document.getElementById('btnGuardar');
    const avisoDiv = document.querySelector('.aviso');

    // Se definen los días posibles de venta
    const diasPosibles = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // Se obtiene el ID del vendedor desde localStorage
    let vendedorId = localStorage.getItem('vendedorId');

    if (!vendedorId) {
        // Si no hay vendedorId, se indica que el usuario no tiene permiso aún
        permisoDiv.textContent = 'Sin permiso';
        vigenciaDiv.textContent = '';
        diasDiv.textContent = '';
        productosDiv.innerHTML = '';
        avisoDiv.style.display = 'block';
        alert("No hay información comercial por el momento.")
        return; // Se detiene la ejecución porque no hay ID
    }

    // Se inicializan variables para los datos comerciales
    let permisoEstado = '';
    let vigencia = '';
    let diasVenta = [];
    let productos = [];

    // Se formatea una fecha ISO a formato DD/MM/AAAA
    function formatearFecha(fechaISO) {
        const fecha = new Date(fechaISO);
        const dia = fecha.getDate().toString().padStart(2, '0');
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const año = fecha.getFullYear();
        return `${dia}/${mes}/${año}`;
    }

    // Se cargan los datos comerciales desde el backend
    function cargarDatos() {
        fetch(`${API_BASE}/vendedores/infoComercial/${vendedorId}`)
            .then(async res => {
                if (!res.ok) {
                    if (res.status === 404) {
                        // Si no hay información, se limpia la interfaz
                        alert('No hay información comercial por el momento.');
                        permisoDiv.textContent = '';
                        diasDiv.textContent = '';
                        productosDiv.innerHTML = '';
                        vigenciaDiv.textContent = '';
                        return;
                    } else {
                        throw new Error('Error al cargar información comercial');
                    }
                }

                const data = await res.json();
                console.log('Datos recibidos:', data);

                // Se asigna el estado del permiso y su vigencia
                permisoEstado = data.permisoVendedor?.estado || 'Desconocido';
                vigencia = data.permisoVendedor?.vigencia || '';

                permisoDiv.style.display = 'block'; // Se asegura visibilidad

                if (permisoEstado === 'Sin permiso') {
                    // Se muestra estado sin permiso
                    permisoDiv.textContent = 'Sin permiso';
                    vigenciaDiv.textContent = '';
                    diasDiv.textContent = '';
                    productosDiv.innerHTML = '';
                    avisoDiv.style.display = 'block';
                } else {
                    // Se muestran los datos si hay permiso
                    permisoDiv.textContent = permisoEstado;
                    vigenciaDiv.textContent = (permisoEstado !== 'En revisión' && vigencia)
                        ? `Vigente hasta: ${formatearFecha(vigencia)}`
                        : '';

                    diasVenta = data.diasVenta || [];
                    productos = data.productos || [];

                    diasDiv.textContent = diasVenta.join(', ');

                    // Se listan los productos
                    productosDiv.innerHTML = '<strong>Productos:</strong><ul id="listaProductosTexto"></ul>';
                    const ul = document.getElementById('listaProductosTexto');
                    productos.forEach(p => {
                        const li = document.createElement('li');
                        li.textContent = p.nombre;
                        ul.appendChild(li);
                    });

                    avisoDiv.style.display = 'block';
                }
            })
            .catch(err => {
                // Se maneja error al cargar datos
                console.error('Error al cargar datos comerciales:', err);
                permisoDiv.textContent = '';
                diasDiv.textContent = '';
                productosDiv.innerHTML = '';
                vigenciaDiv.textContent = '';
                avisoDiv.style.display = 'block';
            });
    }

    // Se eliminan acentos de un string para comparar
    function quitarAcentos(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // Se activa el modo edición de los datos comerciales
    function activarEdicion() {
        if (permisoEstado !== 'Aprobado') {
            alert('Tu permiso no está aprobado. No puedes modificar tu información por ahora.');
            return;
        }

        avisoDiv.style.display = 'none';
        btnEditar.style.display = 'none';
        btnGuardar.style.display = 'inline-block';

        permisoDiv.textContent = permisoEstado;
        vigenciaDiv.textContent = (permisoEstado !== 'En revisión' && vigencia)
            ? `Vigente hasta: ${formatearFecha(vigencia)}`
            : '';

        // Se genera el formulario para seleccionar días
        diasDiv.innerHTML = '';
        const diasVentaNormalizados = diasVenta.map(d => quitarAcentos(d.toLowerCase()));

        diasPosibles.forEach(dia => {
            const label = document.createElement('label');
            label.style.marginRight = '10px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = dia;
            checkbox.name = 'diasVenta';

            const diaNormalizado = quitarAcentos(dia.toLowerCase());
            checkbox.checked = diasVentaNormalizados.includes(diaNormalizado);

            label.appendChild(checkbox);
            label.append(' ' + dia);
            diasDiv.appendChild(label);
        });

        // Se genera la lista de productos con opción de eliminar
        productosDiv.innerHTML = '<strong>Productos:</strong><ul id="listaProductosEdit"></ul>';
        const ul = document.getElementById('listaProductosEdit');

        productos.forEach((p, idx) => {
            const li = document.createElement('li');
            li.textContent = p.nombre;

            const btnEliminar = document.createElement('button');
            btnEliminar.textContent = 'Eliminar';
            btnEliminar.classList.add('btnEliminar');
            btnEliminar.type = 'button';

            // Se aplica estilo al botón de eliminar
            Object.assign(btnEliminar.style, {
                backgroundColor: 'rgb(146, 64, 9)',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginLeft: '20px'
            });

            // Se elimina producto del array y del DOM
            btnEliminar.onclick = () => {
                productos.splice(idx, 1);
                li.remove();
            };

            li.appendChild(btnEliminar);
            ul.appendChild(li);
        });
    }

    // Se guardan los cambios realizados en los datos comerciales
    function guardarCambios() {
        btnGuardar.style.display = 'none';
        btnEditar.style.display = 'inline-block';
        avisoDiv.style.display = 'block';

        const checkboxes = diasDiv.querySelectorAll('input[name="diasVenta"]:checked');
        diasVenta = Array.from(checkboxes).map(cb => cb.value);

        // Se envían los cambios al backend mediante PUT
        fetch(`${API_BASE}/vendedores/infoComercial/${vendedorId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diasVenta, productos })
        })
            .then(res => res.json())
            .then(respuesta => {
                if (respuesta.mensaje) alert(respuesta.mensaje);
                cargarDatos(); // Se recargan los datos actualizados
            })
            .catch(err => {
                console.error('Error al guardar cambios:', err);
                alert('Error al guardar cambios');
            });
    }

    // Se asignan eventos a los botones
    btnEditar.addEventListener('click', activarEdicion);
    btnGuardar.addEventListener('click', guardarCambios);

    // Se cargan los datos al iniciar
    cargarDatos();
});


