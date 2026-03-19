// Esperamos a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

  // Obtenemos el ID del usuario desde el almacenamiento local
  const usuarioId = localStorage.getItem('usuarioId');

  // Si no hay usuario autenticado, redirigimos a la página principal
  if (!usuarioId) {
    alert('No estás autenticado. Por favor inicia sesión.');
    window.location.href = 'Vendedor.html';
    return;
  }

  // Elementos relacionados con el correo
  const correoActual = document.getElementById('correoActual');
  const correoInput = document.getElementById('correoInput');
  const contrasenaActualCorreoInput = document.getElementById('contrasenaActualCorreoInput');
  const btnEditarCorreo = document.getElementById('btnEditarCorreo');
  const btnGuardarCorreo = document.getElementById('btnGuardarCorreo');
  const btnCancelarCorreo = document.getElementById('btnCancelarCorreo');

  // Elementos relacionados con la contraseña
  const contraActual = document.getElementById('contraActual');
  const nuevaContraInput = document.getElementById('nuevaContraInput');
  const confirmarContraInput = document.getElementById('confirmarContraInput');
  const btnEditarContra = document.getElementById('btnEditarContra');
  const btnGuardarContra = document.getElementById('btnGuardarContra');
  const btnCancelarContra = document.getElementById('btnCancelarContra');

  // Función para cargar y mostrar los datos de la cuenta desde el servidor
  async function cargarDatosCuenta() {
    try {
      const response = await fetch(`http://localhost:3000/api/cuenta/${usuarioId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Validamos la respuesta del servidor
      if (!response.ok) {
        alert('Error al cargar la información de la cuenta');
        return;
      }

      // Mostramos los datos del usuario en el DOM
      const data = await response.json();
      correoActual.textContent = data.correo;
      contraActual.textContent = '*********'; // ocultamos la contraseña real
    } catch (error) {
      console.error(error);
      alert('Error al cargar la información de la cuenta');
    }
  }

  // Llamamos a la función de carga inicial de datos
  cargarDatosCuenta();

  // --- EVENTOS DE EDICIÓN DE CORREO ---

  // Al presionar "Editar correo", mostramos el input para cambiarlo
  btnEditarCorreo.addEventListener('click', () => {
    correoInput.value = correoActual.textContent;
    correoActual.style.display = 'none';
    correoInput.style.display = 'inline';
    contrasenaActualCorreoInput.style.display = 'inline';
    btnEditarCorreo.style.display = 'none';
    btnGuardarCorreo.style.display = 'inline';
    btnCancelarCorreo.style.display = 'inline';
  });

  // Al presionar "Cancelar", ocultamos los campos de edición y restauramos
  btnCancelarCorreo.addEventListener('click', () => {
    correoInput.style.display = 'none';
    correoActual.style.display = 'inline';
    contrasenaActualCorreoInput.style.display = 'none';
    btnEditarCorreo.style.display = 'inline';
    btnGuardarCorreo.style.display = 'none';
    btnCancelarCorreo.style.display = 'none';
    contrasenaActualCorreoInput.value = ''; // limpiamos el campo de contraseña
  });

  // Al guardar el nuevo correo
  btnGuardarCorreo.addEventListener('click', async () => {
    const correo = correoInput.value.trim();
    const contrasenaActual = contrasenaActualCorreoInput.value.trim();

    // Validamos que el correo y contraseña estén correctamente ingresados
    if (!correo || !correo.includes('@')) {
      alert('Por favor ingresa un correo válido');
      return;
    }
    if (!contrasenaActual) {
      alert('Por favor ingresa tu contraseña actual');
      return;
    }

    // Enviamos la solicitud al servidor para iniciar el cambio de correo
    try {
      const response = await fetch(`http://localhost:3000/api/cuenta/iniciar-cambio-correo/${usuarioId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nuevoCorreo: correo, contrasenaActual }),
      });

      const data = await response.json();

      // Si la operación fue exitosa, notificamos al usuario
      if (response.ok) {
        alert('Se ha enviado un correo de verificación a tu nuevo correo. Por favor confirma para completar el cambio.');
        contrasenaActualCorreoInput.value = '';
        btnCancelarCorreo.click(); // restauramos la vista
      } else {
        alert(data.mensaje || 'Error al actualizar el correo');
      }
    } catch (error) {
      console.error(error);
      alert('Error en el servidor');
    }
  });

  // --- EVENTOS DE EDICIÓN DE CONTRASEÑA ---

  // Input adicional para la contraseña actual (para cambio de contraseña)
  const contrasenaActualInput = document.getElementById('contrasenaActualInput');

  // Al presionar "Editar contraseña", mostramos los campos necesarios
  btnEditarContra.addEventListener('click', () => {
    nuevaContraInput.value = '';
    confirmarContraInput.value = '';
    contrasenaActualInput.value = '';
    contraActual.style.display = 'none';
    contrasenaActualInput.style.display = 'inline';
    nuevaContraInput.style.display = 'inline';
    confirmarContraInput.style.display = 'inline';
    btnEditarContra.style.display = 'none';
    btnGuardarContra.style.display = 'inline';
    btnCancelarContra.style.display = 'inline';
  });

  // Al cancelar, ocultamos los campos de edición y restauramos
  btnCancelarContra.addEventListener('click', () => {
    nuevaContraInput.style.display = 'none';
    confirmarContraInput.style.display = 'none';
    contrasenaActualInput.style.display = 'none';
    contraActual.style.display = 'inline';
    btnEditarContra.style.display = 'inline';
    btnGuardarContra.style.display = 'none';
    btnCancelarContra.style.display = 'none';
  });

  // Guardar la nueva contraseña
  btnGuardarContra.addEventListener('click', async () => {
    const contrasenaActual = contrasenaActualInput.value.trim();
    const nuevaContra = nuevaContraInput.value.trim();
    const confirmarContra = confirmarContraInput.value.trim();

    // Validaciones
    if (!contrasenaActual) {
      alert('Por favor ingresa tu contraseña actual');
      return;
    }
    if (!nuevaContra || nuevaContra.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (nuevaContra !== confirmarContra) {
      alert('Las contraseñas no coinciden');
      return;
    }

    // Enviamos la solicitud al servidor para actualizar la contraseña
    try {
      const response = await fetch(`http://localhost:3000/api/cuenta/actualizar-contrasena/${usuarioId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contrasenaActual, contrasenaNueva: nuevaContra }),
      });

      const data = await response.json();

      // Si todo salió bien, mostramos mensaje y ocultamos los campos de edición
      if (response.ok) {
        contraActual.textContent = '*'.repeat(nuevaContra.length); // mostramos asteriscos en lugar de la nueva contraseña
        alert('Contraseña actualizada correctamente');
        btnCancelarContra.click(); // restauramos la vista
      } else {
        alert(data.mensaje || 'Error al actualizar la contraseña');
      }
    } catch (error) {
      console.error(error);
      alert('Error en el servidor');
    }
  });
});
