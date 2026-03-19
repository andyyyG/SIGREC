// Se espera a que el DOM esté completamente cargado antes de ejecutar el código
document.addEventListener('DOMContentLoaded', () => {
  // Se obtiene el ID del usuario desde localStorage
  const usuarioId = localStorage.getItem('usuarioId');

  // Se seleccionan los elementos que muestran la información actual
  const nombreText = document.getElementById('nombreText');
  const apellidoPText = document.getElementById('apellidoPText');
  const apellidoMText = document.getElementById('apellidoMText');
  const generoText = document.getElementById('generoText');
  const fechaNacimientoText = document.getElementById('fechaNacimientoText');
  const numCelText = document.getElementById('numCelText');

  // Se seleccionan los inputs que permiten editar la información
  const nombreInput = document.getElementById('nombre');
  const apellidoPInput = document.getElementById('apellidoP');
  const apellidoMInput = document.getElementById('apellidoM');
  const generoSelect = document.getElementById('genero');
  const fechaNacimientoInput = document.getElementById('fechaNacimiento');
  const numCelInput = document.getElementById('numCel');

  // Se seleccionan los botones para editar y guardar
  const btnEditar = document.getElementById('btnEditar');
  const btnGuardar = document.getElementById('btnGuardar');

  // Se define una función para cargar los datos personales del usuario
  async function cargarDatos() {
    try {
      // Se realiza la petición para obtener los datos del usuario
      const res = await fetch(`http://localhost:3000/api/vendedores/${usuarioId}`);
      const data = await res.json();

      // Se muestran los datos recibidos en los elementos correspondientes
      nombreText.textContent = data.nombre || '';
      apellidoPText.textContent = data.apellidoP || '';
      apellidoMText.textContent = data.apellidoM || '';
      generoText.textContent = data.genero || '';
      fechaNacimientoText.textContent = data.fechaNacimiento ? new Date(data.fechaNacimiento).toLocaleDateString() : '';
      numCelText.textContent = data.numCel || '';

      // Se rellenan los inputs con los datos actuales para su edición
      nombreInput.value = data.nombre || '';
      apellidoPInput.value = data.apellidoP || '';
      apellidoMInput.value = data.apellidoM || '';
      generoSelect.value = data.genero || '';

      // Se transforma la fecha de nacimiento a formato YYYY-MM-DD si existe
      if (data.fechaNacimiento) {
        const d = new Date(data.fechaNacimiento);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        fechaNacimientoInput.value = `${yyyy}-${mm}-${dd}`;
      } else {
        fechaNacimientoInput.value = '';
      }

      numCelInput.value = data.numCel || '';
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  }

  // Se define una función para alternar entre modo lectura y edición
  function toggleEdicion(mostrarInputs) {
    // Se ocultan o muestran los elementos de texto e inputs según el modo
    nombreText.style.display = mostrarInputs ? 'none' : 'block';
    apellidoPText.style.display = mostrarInputs ? 'none' : 'block';
    apellidoMText.style.display = mostrarInputs ? 'none' : 'block';
    generoText.style.display = mostrarInputs ? 'none' : 'block';
    fechaNacimientoText.style.display = mostrarInputs ? 'none' : 'block';
    numCelText.style.display = mostrarInputs ? 'none' : 'block';

    nombreInput.style.display = mostrarInputs ? 'block' : 'none';
    apellidoPInput.style.display = mostrarInputs ? 'block' : 'none';
    apellidoMInput.style.display = mostrarInputs ? 'block' : 'none';
    generoSelect.style.display = mostrarInputs ? 'block' : 'none';
    fechaNacimientoInput.style.display = mostrarInputs ? 'block' : 'none';
    numCelInput.style.display = mostrarInputs ? 'block' : 'none';

    btnEditar.style.display = mostrarInputs ? 'none' : 'inline-block';
    btnGuardar.style.display = mostrarInputs ? 'inline-block' : 'none';
  }

  // Se activa el modo edición al hacer clic en el botón "Editar"
  btnEditar.addEventListener('click', () => {
    toggleEdicion(true);
  });

  // Se guarda la información editada al hacer clic en "Guardar"
  btnGuardar.addEventListener('click', async () => {
    // Se construye el objeto con los datos actualizados desde los inputs
    const datosActualizados = {
      nombre: nombreInput.value.trim(),
      apellidoP: apellidoPInput.value.trim(),
      apellidoM: apellidoMInput.value.trim(),
      genero: generoSelect.value,
      fechaNacimiento: fechaNacimientoInput.value,
      numCel: numCelInput.value.trim(),
    };

    try {
      // Se envían los datos actualizados al servidor mediante una petición PUT
      const res = await fetch(`http://localhost:3000/api/vendedores/${usuarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosActualizados),
      });

      const resultado = await res.json();

      // Se notifica al usuario si la actualización fue exitosa
      if (res.ok) {
        alert(resultado.mensaje);
        toggleEdicion(false);
        cargarDatos(); // Se recargan los datos actualizados
      } else {
        alert('Error: ' + resultado.mensaje);
      }
    } catch (error) {
      console.error('Error al guardar datos:', error);
      alert('Error al actualizar datos');
    }
  });

  // Se cargan los datos al iniciar y se establece el modo de solo lectura
  cargarDatos();
  toggleEdicion(false);
});

