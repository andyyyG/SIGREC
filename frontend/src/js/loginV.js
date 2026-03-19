/*document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.formulario');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const correo = form.correo.value.trim();
    const contra = form.contra.value.trim();

    try {
      const response = await fetch('http://localhost:3000/api/loginV', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ correo, contra })
      });

      const data = await response.json();

      if (response.ok) {

        localStorage.setItem('vendedorId', data.vendedorId);
        localStorage.setItem('correo', data.correo);
        localStorage.setItem('nombreCompleto', data.nombreCompleto);
        localStorage.setItem('permisoEstado', data.permisoEstado);
        // Login exitoso, redirige
        window.location.href = 'inicioVendedor.html';
      } else {
        alert('Error: ' + data.mensaje);
      }

    } catch (error) {
      alert('Error en la conexión con el servidor.');
      console.error(error);
    }
  });
});*/
