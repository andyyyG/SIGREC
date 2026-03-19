// Se ejecuta cuando el DOM ha sido completamente cargado
document.addEventListener('DOMContentLoaded', async () => {
  // Se obtiene la referencia del elemento de bienvenida
  const bienvenida = document.getElementById('bienvenida');
  // Se obtiene el botón para mostrar u ocultar el formulario
  const btnMostrarFormulario = document.getElementById('btnMostrarFormulario');
  // Se obtiene el contenedor del formulario para publicar avisos
  const formularioAviso = document.getElementById('formularioAviso');
  // Se obtiene el botón para publicar un nuevo aviso
  const btnPublicarAviso = document.getElementById('btnPublicarAviso');
  // Se obtiene el contenedor donde se mostrarán los avisos publicados
  const avisosPublicados = document.getElementById('avisosPublicados');

  // Se recupera el nombre y el género del administrador desde localStorage
  const nombreAdmin = localStorage.getItem('nombreAdmin') || 'Administrador';
  const generoAdmin = localStorage.getItem('generoAdmin') || 'otro';

  // Se define el saludo según el género recuperado
  let saludo = 'Bienvenido';
  if (generoAdmin.toLowerCase() === 'Mujer' || generoAdmin.toLowerCase() === 'mujer') {
    saludo = 'Bienvenida';
  }

  // Se inserta el mensaje de bienvenida personalizado
  bienvenida.textContent = `${saludo} al módulo de administradores de SIGREC, desde donde podrás llevar a cabo todas las tareas necesarias para regular y monitorear el comercio de los vendedores.`;

  // Se agrega un listener para mostrar u ocultar el formulario al hacer clic
  btnMostrarFormulario.addEventListener('click', () => {
    // Se muestra u oculta el formulario dependiendo del estado actual
    if (formularioAviso.style.display === 'block') {
      formularioAviso.style.display = 'none';
    } else {
      formularioAviso.style.display = 'block';
    }
  });

  // Se agrega el evento para publicar un aviso al hacer clic en el botón
  btnPublicarAviso.addEventListener('click', async () => {
    // Se obtiene el valor del título y contenido del aviso
    const titulo = document.getElementById('tituloAviso').value.trim();
    const contenido = document.getElementById('contenidoAviso').value.trim();

    // Se valida que ambos campos estén llenos
    if (!titulo || !contenido) {
      alert('Por favor llena todos los campos.');
      return;
    }

    try {
      // Se realiza una petición POST al backend para publicar el aviso
      const res = await fetch('http://localhost:3000/api/admin/avisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, contenido })
      });

      const data = await res.json();

      // Se muestra mensaje según respuesta del servidor
      if (res.ok) {
        alert('Aviso publicado correctamente.');
        // Se limpian los campos del formulario
        document.getElementById('tituloAviso').value = '';
        document.getElementById('contenidoAviso').value = '';
        // Se oculta el formulario nuevamente
        formularioAviso.style.display = 'none';
        // Se recargan los avisos
        cargarAvisos();
      } else {
        alert(data.error || 'Error al publicar aviso.');
      }
    } catch (error) {
      console.error('Error al publicar aviso:', error);
      alert('Ocurrió un error al publicar el aviso.');
    }
  });

  // Se define función para cargar los avisos existentes desde el backend
  async function cargarAvisos() {
    try {
      // Se realiza una petición GET para obtener los avisos
      const res = await fetch('http://localhost:3000/api/admin/avisos');
      if (!res.ok) throw new Error('No se pudieron cargar los avisos');

      const avisos = await res.json();
      // Se limpia el contenedor de avisos antes de insertar nuevos
      avisosPublicados.innerHTML = '';

      // Se valida si no hay avisos disponibles
      if (avisos.length === 0) {
        avisosPublicados.innerHTML = '<p>No hay avisos publicados.</p>';
        return;
      }

      // Se recorren los avisos y se insertan en el DOM
      avisos.forEach(aviso => {
        const div = document.createElement('div');
        div.style.border = '1px solid rgba(163, 124, 47, 0.76)';
        div.style.padding = '10px';
        div.style.marginBottom = '15px';
        div.style.marginTop = '20px';
        div.style.borderRadius = '20px';
        div.style.backgroundColor = '#f1c1468c';
        div.innerHTML = `
          <h4 style="font-size: 30px; font-family: 'Raleway'; ">${aviso.titulo}</h4><br />
          <p style="text-align: center; font-size: 20px; fonrt-family: 'Raleway';">${aviso.contenido}</p><br />
          <small>Publicado: ${aviso.fecha_publicacion ? new Date(aviso.fecha_publicacion).toLocaleString() : 'Fecha no disponible'}</small>
        `;
        avisosPublicados.appendChild(div);
      });

    } catch (error) {
      console.error('Error al cargar avisos:', error);
      // Se muestra mensaje en caso de error
      avisosPublicados.innerHTML = '<p>Error al cargar avisos.</p>';
    }
  }

  // Se llama a la función para cargar avisos al inicio
  cargarAvisos();
});

