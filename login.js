// ==========================================
// FUNCIÓN GLOBAL: TOASTS ANIMADOS
// ==========================================
function mostrarToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;

    let icono = 'ℹ️';
    if (tipo === 'success') icono = '✅';
    if (tipo === 'error') icono = '❌';
    if (tipo === 'warning') icono = '⚠️';

    toast.innerHTML = `<span>${icono}</span> <span>${mensaje}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3500);
}

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

            // EL ENRUTADOR INTELIGENTE (Redirección fluida sin alertas):
            if (datos.usuario.Rol === 'Admin') {
                window.location.href = 'admin.html'; // Gerencia va al panel general
            } else if (datos.usuario.Rol === 'Analista') {
                window.location.href = 'resumen.html'; // Analistas van directo a la revisión
            } else {
                window.location.href = 'index.html'; // Los ajustadores van a subir siniestros
            }
        } else {
            mostrarToast(datos.error || "Credenciales incorrectas", "error");
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        mostrarToast("Error al conectar con el servidor. Verifica que node server.js esté corriendo.", "error");
    }
});