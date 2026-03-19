document.addEventListener('DOMContentLoaded', async () => {
    // Se obtiene el elemento que mostrará el mensaje de bienvenida
    const bienvenida = document.getElementById('bienvenida');
    // Se obtiene el contenedor donde se mostrarán los avisos publicados
    const avisosPublicados = document.getElementById('avisosPublicados');

    // Se recupera el género del vendedor almacenado en localStorage
    const generoV = localStorage.getItem('genero') || 'otro';

    // Se establece el saludo según el género recuperado
    let saludo = 'bienvenido';
    if (generoV.toLowerCase() === 'Mujer' || generoV.toLowerCase() === 'mujer') {
        saludo = 'bienvenida';
    }

    // Se recupera el nombre del vendedor almacenado en localStorage
    const nombreVendedor = localStorage.getItem('nombre') || 'vendedor';

    // Se muestra el mensaje de bienvenida personalizado en el elemento correspondiente
    bienvenida.textContent = `${nombreVendedor}, ${saludo} al módulo de vendedores de SIGREC, desde donde podrás llevar a cabo todas las tareas necesarias para gestionar tus productos y permisos`;

    // Se define una función asincrónica para cargar los avisos desde el backend
    async function cargarAvisos() {
        try {
            // Se hace una petición GET al servidor para obtener los avisos
            const res = await fetch('http://localhost:3000/api/admin/avisos');
            // Se lanza un error si la respuesta no es exitosa
            if (!res.ok) throw new Error('No se pudieron cargar los avisos');

            // Se transforma la respuesta a formato JSON
            const avisos = await res.json();
            // Se limpia el contenido actual del contenedor de avisos
            avisosPublicados.innerHTML = '';

            // Se verifica si no hay avisos
            if (avisos.length === 0) {
                // Se muestra un mensaje indicando que no hay avisos
                avisosPublicados.innerHTML = '<p>No hay avisos publicados.</p>';
                return;
            }

            // Se recorre el arreglo de avisos y se crean elementos visuales para cada uno
            avisos.forEach(aviso => {
                // Se crea un div para cada aviso
                const div = document.createElement('div');
                // Se aplica estilo al div del aviso
                div.style.border = '1px solid rgba(163, 124, 47, 0.76)';
                div.style.padding = '10px';
                div.style.marginBottom = '15px';
                div.style.marginTop = '20px';
                div.style.borderRadius = '20px';
                div.style.backgroundColor = '#f1c1468c';

                // Se define el contenido HTML del aviso
                div.innerHTML = `
          <h4 style="font-size: 30px; fonrt-family: 'Raleway'; ">${aviso.titulo}</h4><br />
          <p style="text-align: center; font-size: 20px; fonrt-family: 'Raleway';">${aviso.contenido}</p><br />
          <small>Publicado: ${aviso.fecha_publicacion ? new Date(aviso.fecha_publicacion).toLocaleString() : 'Fecha no disponible'}</small>
        `;
                // Se agrega el div del aviso al contenedor
                avisosPublicados.appendChild(div);
            });

        } catch (error) {
            // Se muestra el error en la consola en caso de fallo
            console.error('Error al cargar avisos:', error);
            // Se muestra un mensaje de error en el contenedor de avisos
            avisosPublicados.innerHTML = '<p>Error al cargar avisos.</p>';
        }
    }

    // Se llama a la función para cargar los avisos cuando se carga el DOM
    cargarAvisos();
});
