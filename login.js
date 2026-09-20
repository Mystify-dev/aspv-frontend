document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();

    const correo = document.getElementById('loginCorreo').value;
    const password = document.getElementById('loginPassword').value;

    try {
        // Hacemos la petición a tu servidor Node.js
        const respuesta = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });

        const datos = await respuesta.json();

        if (respuesta.ok && datos.exito) {
            // Guardamos el nombre y rol en la memoria del navegador
            localStorage.setItem('aspv_nombre', datos.usuario.Nombre);
            localStorage.setItem('aspv_rol', datos.usuario.Rol);
            localStorage.setItem('aspv_id', datos.usuario.UsuarioID);

            alert(`✅ Bienvenido, ${datos.usuario.Nombre}`);

            // EL ENRUTADOR INTELIGENTE:
            if (datos.usuario.Rol === 'Admin') {
                window.location.href = 'admin.html'; // Gerencia va al panel general
            } else if (datos.usuario.Rol === 'Analista') {
                window.location.href = 'resumen.html'; // Analistas van directo a la revisión
            } else {
                window.location.href = 'index.html'; // Los ajustadores van a subir siniestros
            }
        } else {
            alert(`❌ ${datos.error}`);
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        alert("🚨 Error al conectar con el servidor. Verifica que node server.js esté corriendo.");
    }
});
