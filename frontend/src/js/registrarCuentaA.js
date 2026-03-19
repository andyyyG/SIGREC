// Se agrega un listener al formulario con clase 'formulario' que se activa al hacer submit
document.querySelector('.formulario').addEventListener('submit', async (e) => {
  e.preventDefault(); // Se previene el comportamiento por defecto del formulario

  // Se construye un objeto con los datos capturados desde los campos del formulario
  const datos = {
    nombre: document.getElementById('nombre').value,
    apellidoP: document.getElementById('apellidoP').value,
    apellidoM: document.getElementById('apellidoM').value,
    genero: document.getElementById('genero').value,
    fechaNacimiento: document.getElementById('fechaNacimiento').value,
    numCel: document.getElementById('numCel').value,
    correo: document.getElementById('correo').value,
    contraseña: document.getElementById('contra').value,
  };

  try {
    // Se realiza una solicitud POST al endpoint del backend para registrar un nuevo administrador temporal
    const response = await fetch('http://localhost:3000/api/registro-temporalA', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos), // Se convierte el objeto datos a JSON para enviarlo en el cuerpo
    });

    // Se obtiene la respuesta como JSON y se muestra un mensaje al usuario
    const resultado = await response.json();
    alert(resultado.message);

  } catch (err) {
    // Se muestra un mensaje de error en caso de que falle la petición
    console.error(err);
    alert('Error al registrar');
  }
});



