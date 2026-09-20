// ==========================================
// 0. SEGURIDAD Y CONTROL DE ACCESO
// ==========================================
const rolUsuario = localStorage.getItem('aspv_rol');
const nombreUsuario = localStorage.getItem('aspv_nombre');

if (!rolUsuario) {
    alert("⛔ Acceso denegado. Inicia sesión.");
    window.location.href = 'login.html';
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('nombreUsuarioUI').innerText = `Hola, ${nombreUsuario}`;
    inicializarCalendario();
});

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// ==========================================
// 1. LÓGICA DEL CALENDARIO
// ==========================================
function inicializarCalendario() {
    const calendarEl = document.getElementById('calendar');

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es', // Lo ponemos en español
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek' // Vistas de Mes y Semana
        },
        buttonText: {
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana'
        },
        // Aquí le decimos que vaya a buscar los datos a tu servidor
        events: async function(info, successCallback, failureCallback) {
            try {
                const respuesta = await fetch('http://localhost:3000/api/lista-expedientes');
                const expedientes = await respuesta.json();

                // Mapeamos los datos de SQL para que el calendario los entienda
                const eventosVisuales = expedientes.map(exp => {
                    // Colores por estado
                    let colorEvento = '#3498db'; // Azul (En Ajuste por defecto)
                    if (exp.Estado === 'Concluido') colorEvento = '#2ecc71'; // Verde
                    if (exp.Estado === 'En Análisis') colorEvento = '#f39c12'; // Naranja

                    return {
                        title: `Exp #${exp.AjusteID} - ${exp.Estado}`,
                        start: exp.FechaOcurrencia.split('T')[0], // Cortamos la hora para que agarre solo la fecha
                        backgroundColor: colorEvento
                    };
                });

                successCallback(eventosVisuales);
            } catch (error) {
                console.error("Error al cargar eventos:", error);
                failureCallback(error);
            }
        }
    });

    calendar.render();
}

// ==========================================
// 2. ACCESIBILIDAD
// ==========================================
function cambiarTema(tema) {
    if (tema === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function cambiarTexto(tamano) {
    document.documentElement.setAttribute('data-text', tamano);
}