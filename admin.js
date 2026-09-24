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
                            <th style="padding: 12px 10px;">Acciones</th>
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
                            <td style="padding: 12px 10px;">
                                <button onclick="folioVisualAdmin = ${folioPersonal}; abrirModalRevision(${exp.AjusteID})" style="background-color: var(--primary-color); color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.85em; font-weight: bold;">
                                    Revisar y Cerrar
                                </button>
                            </td>
                        </tr>
                    `;
                });

                htmlTabla += `</tbody></table>`;
                contenedor.innerHTML += htmlTabla;
            }
        }
    } catch (error) { console.error("Error al cargar la tabla detallada:", error); }
}

let folioVisualAdmin = null;

async function abrirModalRevision(ajusteId) {
    const modal = document.getElementById('modalRevision');
    const contenido = document.getElementById('modalRevisionContenido');

    document.getElementById('modalRevId').innerText = folioVisualAdmin ? `SIN-${folioVisualAdmin.toString().padStart(3, '0')}` : `#${ajusteId}`;
    modal.style.display = 'flex';
    contenido.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Cargando información del siniestro...</p>';

    try {
        const resDocs = await fetch(`http://localhost:3000/api/documentos/${ajusteId}`);
        const resInfo = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}`);

        if (resInfo.ok) {
            const info = await resInfo.json();
            const colorAlerta = info.penalizado ? '#e74c3c' : '#2ecc71';

            const montoFormateado = info.monto ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(info.monto) : '$0.00';
            const kmsFormateados = info.kilometros ? new Intl.NumberFormat('es-MX').format(info.kilometros) + ' km' : 'N/A';

            let html = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: var(--panel-bg); padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-color);">
                    <div><span style="font-size: 0.8em; color: var(--text-muted);">Lugar (Ciudad/Zona)</span><br><strong style="color: var(--text-color);">${info.lugar || 'N/A'}</strong></div>
                    <div><span style="font-size: 0.8em; color: var(--text-muted);">Tipo de Seguro</span><br><strong style="color: var(--text-color);">${info.seguro || 'N/A'}</strong></div>
                    <div><span style="font-size: 0.8em; color: var(--text-muted);">Monto Estimado</span><br><strong style="color: #2ecc71;">${montoFormateado}</strong></div>
                    <div><span style="font-size: 0.8em; color: var(--text-muted);">Kilometraje</span><br><strong style="color: var(--text-color);">${kmsFormateados}</strong></div>
                </div>

                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid var(--border-color);">
                    <p style="margin: 0 0 10px 0; font-size: 0.9em; font-weight: bold; color: var(--text-color);">Tiempo y Penalización:</p>
                    <p style="margin: 0 0 15px 0; font-size: 0.85em; color: ${colorAlerta}; font-weight: bold;">${info.alertaUI}</p>
                    
                    <p style="margin: 0 0 5px 0; font-size: 0.85em; font-weight: bold; color: var(--text-color);">Historial del reporte:</p>
                    <div style="background-color: #111; padding: 10px; border-radius: 5px; max-height: 150px; overflow-y: auto; margin-bottom: 15px; border: 1px solid #333;">
                        <p style="margin: 0; font-size: 0.9em; color: #ccc; font-style: italic; white-space: pre-wrap;">"${info.relatoria || 'Sin relatoría'}"</p>
                        ${info.respuestaAnalista ? `
                            <hr style="border: 0; border-top: 1px dashed #444; margin: 10px 0;">
                            <p style="margin: 0; font-size: 0.9em; color: #fff; white-space: pre-wrap;">${info.respuestaAnalista}</p>
                        ` : ''}
                    </div>

                    ${(info.estado !== 'Concluido' && info.turno === 'Analista') ? `
                        <p style="margin: 0 0 5px 0; font-size: 0.85em; font-weight: bold; color: var(--text-color);">Tu respuesta (Turno del Analista):</p>
                        <textarea id="comentarioRevision" rows="2" placeholder="Escribe aquí si faltan documentos o el caso está concluido..." style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--panel-bg); color: var(--text-color); margin-bottom: 10px; font-family: inherit; resize: vertical;"></textarea>
                    ` : ''}

                    ${(info.estado !== 'Concluido' && info.turno === 'Ajustador') ? `
                        <div style="background-color: #f39c1220; border-left: 4px solid #f39c12; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                            <p style="margin: 0; font-size: 0.85em; color: #f39c12; font-weight: bold;">⏳ Esperando que el Ajustador responda o suba archivos...</p>
                        </div>
                    ` : ''}

                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <label style="font-size: 0.85em; font-weight: bold; color: var(--text-color);">Modificar Estado:</label>
                            <select id="estadoRevision" style="padding: 8px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--panel-bg); color: var(--text-color);" ${(info.estado === 'Concluido' || info.turno === 'Ajustador') ? 'disabled' : ''}>
                                <option value="En Análisis" ${info.estado === 'En Análisis' ? 'selected' : ''}>En Análisis</option>
                                <option value="En Ajuste" ${info.estado === 'En Ajuste' ? 'selected' : ''}>En Ajuste</option>
                                <option value="Concluido" ${info.estado === 'Concluido' ? 'selected' : ''}>Concluido</option>
                            </select>
                        </div>
                        <button onclick="guardarRevision(${ajusteId})" style="background-color: ${(info.estado === 'Concluido' || info.turno === 'Ajustador') ? '#95a5a6' : '#2ecc71'}; color: white; border: none; padding: 8px 20px; border-radius: 5px; cursor: ${(info.estado === 'Concluido' || info.turno === 'Ajustador') ? 'not-allowed' : 'pointer'}; font-weight: bold;" ${(info.estado === 'Concluido' || info.turno === 'Ajustador') ? 'disabled' : ''}>
                            Guardar Cambios
                        </button>
                    </div>
                </div>
                
                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 20px 0;">
                <h4 style="margin: 0 0 15px 0; color: var(--text-color);">Documentación Entregada</h4>
                <div id="listaDocsRevision" style="display: flex; flex-direction: column; gap: 12px;">
            `;

            if (resDocs.ok) {
                const datosDocs = await resDocs.json();

                ['DOA', 'ORD', 'PM'].forEach(tipo => {
                    const doc = datosDocs.documentos.find(d => d.TipoDocumento === tipo);

                    if (doc) {
                        const esNoRequerido = doc.RutaArchivo === 'NO_REQUERIDO';
                        const nombreArchivo = esNoRequerido ? '<span style="color: #f39c12; font-style: italic;">No requerido para este siniestro</span>' : doc.RutaArchivo.split('\\').pop().split('/').pop();
                        const botonAccion = esNoRequerido
                            ? `<button onclick="preguntarAccion(${ajusteId}, '${tipo}', 'rechazar')" style="background-color: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.75em; font-weight: bold;">Rechazar N/A (Solicitar)</button>`
                            : `<a href="http://localhost:3000/${doc.RutaArchivo.replace(/\\/g, '/')}" target="_blank" style="background-color: var(--primary-color); color: white; text-decoration: none; padding: 6px 15px; border-radius: 5px; font-size: 0.85em; font-weight: bold;">👁️ Ver archivo</a>`;

                        html += `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: var(--bg-color); border-radius: 8px; border: 1px solid var(--border-color);">
                                <strong style="color: var(--primary-color); font-size: 1.1em; width: 50px;">${tipo}</strong>
                                <span style="color: var(--text-muted); font-size: 0.85em; flex-grow: 1; text-align: center;">${nombreArchivo}</span>
                                <div>${botonAccion}</div>
                            </div>
                        `;
                    } else {
                        html += `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: var(--bg-color); border-radius: 8px; border: 1px dashed #e74c3c;">
                                <strong style="color: #e74c3c; font-size: 1.1em; width: 50px;">${tipo}</strong>
                                <span style="color: #e74c3c; font-size: 0.85em; font-weight: bold;">Faltante (Pendiente por el Ajustador)</span>
                            </div>
                        `;
                    }
                });
            }
            html += `</div>`;
            contenido.innerHTML = html;
        }
    } catch (error) {
        contenido.innerHTML = '<p style="color: #e74c3c; text-align: center;">Error al cargar la información.</p>';
    }
}

async function guardarRevision(ajusteId) {
    const nuevoEstado = document.getElementById('estadoRevision').value;
    const comentarioObj = document.getElementById('comentarioRevision');
    const comentario = comentarioObj ? comentarioObj.value.trim() : null;

    try {
        const res = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nuevoEstado: nuevoEstado,
                respuestaAnalista: comentario || null,
                remitente: nombreUsuario
            })
        });

        if (res.ok) {
            mostrarToast("Cambios guardados correctamente.", "success");
            cerrarModalRevision();
            cargarTablaDetallada();
            revisarNotificaciones();
        }
    } catch (error) { console.error("Error guardando revisión:", error); }
}

function cerrarModalRevision() {
    document.getElementById('modalRevision').style.display = 'none';
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
    if (tipoAccion === 'rechazar') texto = `¿Estás seguro de que quieres rechazar el documento ${dato}? El Ajustador tendrá que subirlo obligatoriamente.`;

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
            } else { mostrarToast("No se puede eliminar. Este usuario ya tiene expedientes.", "error"); }
        } catch (error) { console.error("Error eliminando:", error); }
    }
    else if (accionPendiente === 'rechazar') {
        try {
            const res = await fetch(`http://localhost:3000/api/documentos/rechazar/${idObjetivo}/${datoExtra}`, { method: 'DELETE' });
            if(res.ok) {
                mostrarToast(`Documento ${datoExtra} rechazado.`, "success");
                abrirModalRevision(idObjetivo);
                revisarNotificaciones();
            }
        } catch(error) { console.error("Error rechazando doc:", error); }
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

// ==========================================
// 4. ACCESIBILIDAD Y NOTIFICACIONES
// ==========================================
function cambiarTema(tema) { document.documentElement.setAttribute('data-theme', tema === 'dark' ? 'dark' : ''); }
function cambiarTexto(tamano) { document.documentElement.setAttribute('data-text', tamano); }

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
                    badge.innerText = datos.pendientes; badge.style.display = 'block'; listaUI.innerHTML = '';
                    datos.detalle.forEach(noti => {
                        const fecha = new Date(noti.Fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        const li = document.createElement('li');
                        li.style.cssText = 'padding: 15px; border-bottom: 1px solid var(--border-color); display: flex; gap: 15px; align-items: flex-start; transition: background 0.2s;';
                        li.innerHTML = `<div style="font-size: 1.5em; flex-shrink: 0;">💬</div><div style="flex-grow: 1;"><p style="margin: 0 0 5px 0; font-size: 0.9em; color: var(--text-color);"><strong>${noti.Remitente}</strong> ${noti.Mensaje}</p><span style="font-size: 0.75em; color: var(--text-muted);">${fecha}</span></div><div class="punto-azul" style="width: 10px; height: 10px; background-color: var(--primary-color); border-radius: 50%; margin-top: 5px; flex-shrink: 0;"></div>`;
                        listaUI.appendChild(li);
                    });
                } else {
                    badge.style.display = 'none';
                    listaUI.innerHTML = `<li style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 0.9em;">No tienes notificaciones nuevas</li>`;
                }
            }
        }
    } catch (error) {}
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('nombreUsuarioUI').innerText = `Hola, ${nombreUsuario}`;
    cargarMetricas();
    cargarPersonal();
    cargarTablaDetallada();
    inicializarGraficas();

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