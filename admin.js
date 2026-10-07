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
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3500);
}

const rolUsuario = localStorage.getItem('aspv_rol');
const nombreUsuario = localStorage.getItem('aspv_nombre');

if (!rolUsuario || (rolUsuario !== 'Admin' && rolUsuario !== 'Analista')) {
    window.location.href = 'login.html';
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// ==========================================
// ACCESIBILIDAD Y MEMORIA DE PREFERENCIAS
// ==========================================
function aplicarPreferencias() {
    const temaGuardado = localStorage.getItem('aspv_tema');
    const textoGuardado = localStorage.getItem('aspv_texto');

    if (temaGuardado === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    if (textoGuardado) {
        document.documentElement.setAttribute('data-text', textoGuardado);
    }
}

// Se ejecuta inmediatamente para evitar el "parpadeo blanco" al cambiar de pestaña
aplicarPreferencias();

function cambiarTema(tema) {
    if (tema === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('aspv_tema', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('aspv_tema', 'light');
    }
}

function cambiarTexto(tamano) {
    document.documentElement.setAttribute('data-text', tamano);
    localStorage.setItem('aspv_texto', tamano);
}


async function cargarMetricas() {
    try {
        const res = await fetch('http://localhost:3000/api/dashboard/gerencia');
        if (res.ok) {
            const datos = await res.json();
            document.getElementById('kpiDia').innerText = datos.dia;
            document.getElementById('kpiMes').innerText = datos.mes;
        }
    } catch (error) { console.error("Error al cargar métricas:", error); }
}

async function cargarTablaDetallada() {
    try {
        const res = await fetch('http://localhost:3000/api/lista-expedientes');
        if (res.ok) {
            const expedientes = await res.json();
            const contenedor = document.getElementById('contenedorTablasSiniestros');
            if(!contenedor) return;
            contenedor.innerHTML = '';

            const agrupados = expedientes.reduce((acc, exp) => {
                const ajustador = exp.AjustadorNombre || 'Sin asignar';
                if (!acc[ajustador]) acc[ajustador] = [];
                acc[ajustador].push(exp);
                return acc;
            }, {});

            for (const [ajustador, lista] of Object.entries(agrupados)) {
                let htmlTabla = `
                    <h4 style="margin: 25px 0 10px 0; color: var(--primary-color); border-bottom: 2px solid var(--border-color); padding-bottom: 5px;">
                        📁 Siniestros de: ${ajustador}
                    </h4>
                    <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.9em; margin-bottom: 20px;">
                        <thead>
                        <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                            <th style="padding: 12px 10px;">ID Siniestro</th>
                            <th style="padding: 12px 10px;">Lugar</th>
                            <th style="padding: 12px 10px;">Seguro</th>
                            <th style="padding: 12px 10px;">Kilometraje</th>
                            <th style="padding: 12px 10px;">Fecha</th>
                            <th style="padding: 12px 10px;">Estado</th>
                            <th style="padding: 12px 10px;">Monto</th>
                        </tr>
                        </thead>
                        <tbody>
                `;

                lista.forEach((exp, index) => {
                    const folioPersonal = lista.length - index;
                    const fecha = new Date(exp.FechaOcurrencia).toLocaleDateString('es-MX');
                    let colorEstado = exp.Estado === 'Concluido' ? '#2ecc71' : (exp.Estado === 'En Análisis' ? '#f39c12' : '#3498db');
                    const lugar = exp.Lugar || 'N/A';
                    const seguro = exp.Seguro || 'N/A';
                    const kms = exp.Kilometros ? new Intl.NumberFormat('es-MX').format(exp.Kilometros) + ' km' : 'N/A';
                    const monto = exp.Monto ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(exp.Monto) : '$0.00';

                    htmlTabla += `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px 10px; font-weight: bold;">SIN-${folioPersonal.toString().padStart(3, '0')}</td>
                            <td style="padding: 12px 10px;">${lugar}</td>
                            <td style="padding: 12px 10px;">${seguro}</td>
                            <td style="padding: 12px 10px; color: var(--text-muted);">${kms}</td>
                            <td style="padding: 12px 10px; color: var(--text-muted);">${fecha}</td>
                            <td style="padding: 12px 10px;">
                                <span style="border: 1px solid ${colorEstado}; color: ${colorEstado}; padding: 3px 10px; border-radius: 12px; font-size: 0.85em;">
                                    ${exp.Estado}
                                </span>
                            </td>
                            <td style="padding: 12px 10px; color: #2ecc71; font-weight: bold;">${monto}</td>
                        </tr>
                    `;
                });

                htmlTabla += `</tbody></table>`;
                contenedor.innerHTML += htmlTabla;
            }
        }
    } catch (error) { console.error("Error al cargar la tabla detallada:", error); }
}

// ==========================================
// 2. GESTIÓN DE PERSONAL (Alta y Baja)
// ==========================================
function mostrarFormularioAlta() { document.getElementById('formNuevoUsuario').style.display = 'flex'; }
function ocultarFormularioAlta() { document.getElementById('formNuevoUsuario').style.display = 'none'; }

async function cargarPersonal() {
    try {
        const res = await fetch('http://localhost:3000/api/usuarios');
        if (res.ok) {
            const usuarios = await res.json();
            document.getElementById('kpiPersonal').innerText = usuarios.length;

            const lista = document.getElementById('listaPersonal');
            lista.innerHTML = '';

            usuarios.forEach(u => {
                let colorRol = u.Rol === 'Admin' ? '#e74c3c' : (u.Rol === 'Analista' ? '#f39c12' : '#3498db');

                lista.innerHTML += `
                    <li style="padding: 10px; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="color: var(--text-color); font-size: 0.9em;">${u.Nombre}</strong><br>
                            <span style="font-size: 0.8em; color: var(--text-muted);">${u.Correo}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: ${colorRol}; font-size: 0.8em; font-weight: bold;">${u.Rol}</span>
                            <button onclick="preguntarAccion(${u.UsuarioID}, '${u.Nombre}', 'eliminar')" style="background: transparent; color: #e74c3c; border: none; cursor: pointer; font-size: 1.1em;" title="Eliminar Empleado">🗑️</button>
                        </div>
                    </li>
                `;
            });
        }
    } catch (error) { console.error("Error al cargar lista de personal:", error); }
}

document.getElementById('formNuevoUsuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nombre: document.getElementById('nuevoNombre').value,
        correo: document.getElementById('nuevoCorreo').value,
        password: document.getElementById('nuevoPassword').value,
        rol: document.getElementById('nuevoRol').value
    };

    try {
        const res = await fetch('http://localhost:3000/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            mostrarToast("Empleado registrado exitosamente.", "success");
            document.getElementById('formNuevoUsuario').reset();
            ocultarFormularioAlta();
            cargarPersonal();
        } else {
            const errorData = await res.json().catch(() => ({}));
            mostrarToast(`Error al registrar: ${errorData.error || 'Correo ya registrado.'}`, "error");
        }
    } catch (error) { console.error("Error:", error); mostrarToast("Error de conexión con el servidor.", "error"); }
});

let accionPendiente = null;
let idObjetivo = null;
let datoExtra = null;

function preguntarAccion(id, dato, tipoAccion) {
    accionPendiente = tipoAccion;
    idObjetivo = id;
    datoExtra = dato;

    let texto = "";
    if (tipoAccion === 'eliminar') texto = `¿Estás seguro de que deseas eliminar permanentemente a ${dato} del sistema?`;

    document.getElementById('textoConfirmacion').innerText = texto;
    document.getElementById('modalConfirmacion').style.display = 'flex';
}

function cancelarAccion() {
    document.getElementById('modalConfirmacion').style.display = 'none';
    accionPendiente = null;
}

async function confirmarAccion() {
    document.getElementById('modalConfirmacion').style.display = 'none';

    if (accionPendiente === 'eliminar') {
        try {
            const res = await fetch(`http://localhost:3000/api/usuarios/${idObjetivo}`, { method: 'DELETE' });
            if (res.ok) {
                mostrarToast(`Empleado ${datoExtra} eliminado.`, "success");
                cargarPersonal();
            } else {
                mostrarToast("No se puede eliminar. Este usuario ya tiene expedientes.", "error");
            }
        } catch (error) { console.error("Error eliminando:", error); }
    }
}

// ==========================================
// 3. EXCEL Y GRÁFICAS (NUEVO EXCELJS)
// ==========================================
async function exportarExcel() {
    try {
        mostrarToast("⏳ Generando archivo Excel con diseño...", "info");

        const res = await fetch('http://localhost:3000/api/exportar-excel');

        if (res.ok) {
            // Recibimos el archivo binario (.xlsx)
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `Reporte_Detallado_ASPV_${new Date().toLocaleDateString('es-MX')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();

            window.URL.revokeObjectURL(url);
            mostrarToast("✅ Exportación a Excel completada.", "success");
        } else {
            mostrarToast("❌ Error al generar el Excel en el servidor.", "error");
        }
    } catch (error) {
        console.error("Error exportando a Excel:", error);
        mostrarToast("❌ Error de red al intentar descargar.", "error");
    }
}

async function inicializarGraficas() {
    try {
        const res = await fetch('http://localhost:3000/api/dashboard/grafica');
        if (!res.ok) return;
        const datosBD = await res.json();

        const etiquetas = [];
        const valores = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const fechaStr = `${year}-${month}-${day}`;

            const nombreDia = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
            etiquetas.push(nombreDia);

            const datoEncontrado = datosBD.find(item => item.fecha === fechaStr);
            valores.push(datoEncontrado ? datoEncontrado.total : 0);
        }

        const ctx = document.getElementById('graficaPeriodo').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: etiquetas,
                datasets: [{
                    label: 'Siniestros Registrados',
                    data: valores,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    } catch (error) { console.error("Error al cargar gráfica real:", error); }
}

async function revisarNotificaciones() {
    const rol = localStorage.getItem('aspv_rol');
    const idUsuario = localStorage.getItem('aspv_id') || 0;

    if (!rol) return;

    try {
        const res = await fetch(`http://localhost:3000/api/notificaciones/${rol}/${idUsuario}`);
        if (res.ok) {
            const datos = await res.json();
            const badge = document.getElementById('badgeNotificaciones');
            const listaUI = document.getElementById('listaNotificacionesUI');

            if (badge && listaUI) {
                if (datos.pendientes > 0) {
                    badge.innerText = datos.pendientes;
                    badge.style.display = 'block';

                    listaUI.innerHTML = '';

                    datos.detalle.forEach(noti => {
                        const fecha = new Date(noti.Fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                        const li = document.createElement('li');
                        li.style.cssText = 'padding: 15px; border-bottom: 1px solid var(--border-color); display: flex; gap: 15px; align-items: flex-start; transition: background 0.2s;';
                        li.innerHTML = `
                            <div style="font-size: 1.5em; flex-shrink: 0;">💬</div>
                            <div style="flex-grow: 1;">
                                <p style="margin: 0 0 5px 0; font-size: 0.9em; color: var(--text-color);"><strong>${noti.Remitente}</strong> ${noti.Mensaje}</p>
                                <span style="font-size: 0.75em; color: var(--text-muted);">${fecha}</span>
                            </div>
                            <div class="punto-azul" style="width: 10px; height: 10px; background-color: var(--primary-color); border-radius: 50%; margin-top: 5px; flex-shrink: 0;"></div>
                        `;
                        listaUI.appendChild(li);
                    });
                } else {
                    badge.style.display = 'none';
                    listaUI.innerHTML = `<li style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 0.9em;">No tienes notificaciones nuevas</li>`;
                }
            }
        }
    } catch (error) {
        console.error("Esperando backend...", error);
    }
}

// ==========================================
// 10. INICIALIZACIÓN (Un solo bloque)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('nombreUsuarioUI').innerText = `Hola, ${nombreUsuario}`;

    // Iniciar funciones
    cargarMetricas();
    cargarPersonal();
    cargarTablaDetallada();
    inicializarGraficas();

    // Eventos de la campanita
    const marcarBtn = document.getElementById('marcarLeidasBtn');
    if (marcarBtn) {
        marcarBtn.addEventListener('click', async () => {
            const rol = localStorage.getItem('aspv_rol');
            const idUsuario = localStorage.getItem('aspv_id') || 0;
            try {
                await fetch(`http://localhost:3000/api/notificaciones/leidas/${rol}/${idUsuario}`, { method: 'PUT' });
                document.getElementById('badgeNotificaciones').style.display = 'none';
                document.getElementById('listaNotificacionesUI').innerHTML = `<li style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 0.9em;">No tienes notificaciones nuevas</li>`;
            } catch(e) {}
        });
    }

    revisarNotificaciones();
    setInterval(revisarNotificaciones, 10000);
});