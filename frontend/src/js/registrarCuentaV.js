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
    correo: document.getElementById('correoVendedor').value,
    contraseña: document.getElementById('contraVendedor').value,
  };

  try {
    // Se realiza una solicitud POST al endpoint del backend para registrar un nuevo vendedor temporal
    const res = await fetch('http://localhost:3000/api/registro-temporal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos), // Se convierte el objeto datos a JSON para enviarlo en el cuerpo
    });

    const resultado = await res.json();

    if (!res.ok) {
      // Si la respuesta no es exitosa, se lanza un error con el mensaje del backend o uno genérico
      throw new Error(resultado.error || 'Error desconocido');
    }

    // Si todo sale bien, se muestra un mensaje y se redirige al login del vendedor
    alert(resultado.message);
    window.location.href = 'Vendedor.html';

  } catch (err) {
    // Se muestra el mensaje de error en caso de fallo
    console.error(err);
    alert(err.message); 
  }

});
