// ==========================================
// 0. SEGURIDAD Y CONTROL DE ACCESO
// ==========================================
const rolUsuario = localStorage.getItem('aspv_rol');
const nombreUsuario = localStorage.getItem('aspv_nombre');

if (!rolUsuario || (rolUsuario !== 'Admin' && rolUsuario !== 'Analista')) {
    alert("⛔ Acceso denegado. Privilegios de administrador o analista requeridos.");
    window.location.href = 'login.html';
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('nombreUsuarioUI').innerText = `Hola, ${nombreUsuario}`;
});

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// ==========================================
// 1. CARGA DE KPIs GLOBALES
// ==========================================
async function cargarDashboardAdmin() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/dashboard/resumen');
        if (respuesta.ok) {
            const datos = await respuesta.json();
            document.getElementById('kpiActivos').innerText = datos.expedientesActivos;
            document.getElementById('kpiDocs').innerText = datos.documentosPendientes;
        }

        const resTabla = await fetch('http://localhost:3000/api/lista-expedientes');
        if (resTabla.ok) {
            const expedientes = await resTabla.json();
            const concluidos = expedientes.filter(exp => exp.Estado === 'Concluido').length;
            document.getElementById('kpiConcluidos').innerText = concluidos;
        }
    } catch (error) {
        console.error("Error al cargar KPIs:", error);
    }
}

// ==========================================
// 2. TABLA DE REVISIÓN (AGRUPADA POR AJUSTADOR)
// ==========================================
async function cargarTablaAdmin() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/lista-expedientes');
        if (respuesta.ok) {
            const expedientes = await respuesta.json();
            const contenedor = document.getElementById('contenedorTablasSiniestros');
            if(!contenedor) return;
            contenedor.innerHTML = '';

            // Agrupamos los expedientes por ajustador
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
                    <table style="width: 100%; text-align: left; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                        <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                            <th style="padding: 12px 10px;">ID Ajuste</th>
                            <th style="padding: 12px 10px;">Fecha del Accidente</th>
                            <th style="padding: 12px 10px;">Estado actual</th>
                            <th style="padding: 12px 10px;">Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                `;

                lista.forEach(exp => {
                    const fechaOcurrencia = new Date(exp.FechaOcurrencia).toLocaleDateString('es-MX');
                    const colorEstado = exp.Estado === 'Concluido' ? '#2ecc71' : '#f39c12';

                    htmlTabla += `
                        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.3s;">
                            <td style="padding: 15px 10px; font-weight: bold;"># ${exp.AjusteID}</td>
                            <td style="padding: 15px 10px; color: var(--text-muted);">${fechaOcurrencia}</td>
                            <td style="padding: 15px 10px;">
                                <span style="background-color: ${colorEstado}20; color: ${colorEstado}; padding: 5px 10px; border-radius: 20px; font-size: 0.85em; font-weight: bold;">
                                    ${exp.Estado}
                                </span>
                            </td>
                            <td style="padding: 15px 10px;">
                                <button onclick="evaluarExpediente(${exp.AjusteID})" style="background: var(--primary-color); color: white; border: none; padding: 6px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">
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
    } catch (error) {
        console.error("Error al cargar tabla:", error);
    }
}

// ==========================================
// 3. MODAL DEL ADMINISTRADOR (REVISIÓN Y FEEDBACK)
// ==========================================
async function evaluarExpediente(ajusteId, borradorTexto = '') {
    const modal = document.getElementById('modalAdmin');
    const modalContenido = document.getElementById('modalAdminContenido');

    document.getElementById('modalAdminExpId').innerText = `#${ajusteId}`;
    modal.style.display = 'flex';
    modalContenido.innerHTML = '<p style="text-align: center;">Cargando expediente...</p>';

    try {
        const resDocs = await fetch(`http://localhost:3000/api/documentos/${ajusteId}`);
        const resInfo = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}`);

        let htmlContenido = '';
        let esConcluido = false;

        if (resInfo.ok) {
            const info = await resInfo.json();
            const colorAlerta = info.penalizado ? '#e74c3c' : '#2ecc71';
            esConcluido = info.estado === 'Concluido';

            htmlContenido += `
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-color);">
                    <p style="margin: 0 0 10px 0; font-size: 0.9em;"><strong>Tiempo y Penalización:</strong></p>
                    <p style="margin: 0 0 15px 0; font-size: 0.85em; color: ${colorAlerta}; font-weight: bold;">${info.alertaUI}</p>
                    
                    <p style="margin: 0 0 5px 0; font-size: 0.85em; font-weight: bold;">Historial de Reportes:</p>
                    <div style="background: var(--panel-bg); padding: 10px; border-radius: 5px; margin-bottom: 15px; max-height: 150px; overflow-y: auto; border: 1px solid var(--border-color);">
                        <p style="margin: 0; font-size: 0.9em; color: var(--text-muted); font-style: italic; white-space: pre-wrap;">"Ajustador: ${info.relatoria || 'Sin relatoría'}"</p>
                        ${info.respuestaAnalista ? `
                            <hr style="border: 0; border-top: 1px dashed var(--border-color); margin: 10px 0;">
                            <p style="margin: 0; font-size: 0.9em; color: var(--text-color); white-space: pre-wrap;">Analista: ${info.respuestaAnalista}</p>
                        ` : ''}
                    </div>

                    ${esConcluido ? `
                        <div style="background-color: #2ecc7120; border-left: 4px solid #2ecc71; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                            <p style="margin: 0; font-size: 0.85em; color: #2ecc71; font-weight: bold;">✅ Expediente terminado. Ya no se pueden enviar mensajes.</p>
                        </div>
                        <input type="hidden" id="textoRespuestaAdmin" value="">
                    ` : (info.turno === 'Analista' ? `
                        <label style="font-size: 0.85em; font-weight: bold;">Tu respuesta al Ajustador (Nuevo mensaje):</label>
                        <textarea id="textoRespuestaAdmin" rows="2" placeholder="Ej. Falta la firma en el documento ORD..." style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color); margin-bottom: 15px; box-sizing: border-box;">${borradorTexto}</textarea>
                    ` : `
                        <div style="background-color: #f39c1220; border-left: 4px solid #f39c12; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                            <p style="margin: 0; font-size: 0.85em; color: #f39c12; font-weight: bold;">⏳ Bloqueado: Esperando que el Ajustador responda o suba archivos.</p>
                        </div>
                        <input type="hidden" id="textoRespuestaAdmin" value="">
                    `)}

                    <div style="display: flex; gap: 10px; align-items: center;">
                        <label style="font-size: 0.85em; font-weight: bold;">Modificar Estado:</label>
                        <select id="selectEstadoAdmin" style="padding: 8px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--panel-bg); color: var(--text-color); flex: 1;" ${(esConcluido || info.turno === 'Ajustador') ? 'disabled' : ''}>
                            <option value="En Análisis" ${info.estado === 'En Análisis' ? 'selected' : ''}>En Análisis</option>
                            <option value="En Ajuste" ${info.estado === 'En Ajuste' ? 'selected' : ''}>En Ajuste</option>
                            <option value="Concluido" ${info.estado === 'Concluido' ? 'selected' : ''}>Concluido</option>
                        </select>
                        <button onclick="guardarEstadoAdmin(${ajusteId})" style="background: ${(esConcluido || info.turno === 'Ajustador') ? '#95a5a6' : '#2ecc71'}; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: ${(esConcluido || info.turno === 'Ajustador') ? 'not-allowed' : 'pointer'}; font-weight: bold;" ${(esConcluido || info.turno === 'Ajustador') ? 'disabled' : ''}>
                            Guardar
                        </button>
                    </div>
                </div>
                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;">
                <h4 style="margin: 0 0 10px 0;">Documentación Entregada</h4>
            `;
        }

        if (resDocs.ok) {
            const datosDocs = await resDocs.json();

            ['DOA', 'ORD', 'PM'].forEach(tipo => {
                const doc = datosDocs.documentos.find(d => d.TipoDocumento === tipo);

                if (doc) {
                    if (doc.RutaArchivo === 'NO_REQUERIDO') {
                        htmlContenido += `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-color); border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                                <strong style="color: var(--primary-color); width: 50px;">${doc.TipoDocumento}</strong>
                                <span style="color: #f39c12; font-style: italic; font-size: 0.85em; flex-grow: 1; text-align: center;">
                                    No requerido para este siniestro
                                </span>
                                ${esConcluido ? '' : `
                                <button onclick="rechazarDocumento(${ajusteId}, '${tipo}')" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8em; font-weight: bold;" title="Solicitar este documento al ajustador">
                                    Rechazar (Pedir)
                                </button>
                                `}
                            </div>
                        `;
                    } else {
                        const nombreArchivo = doc.RutaArchivo.split('\\').pop().split('/').pop();
                        const rutaWeb = doc.RutaArchivo.replace(/\\/g, '/');
                        const urlArchivo = `http://localhost:3000/${rutaWeb}`;

                        htmlContenido += `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-color); border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                                <strong style="color: var(--primary-color); width: 50px;">${doc.TipoDocumento}</strong>
                                <span style="color: var(--text-muted); font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; flex-grow: 1; text-align: center;">
                                    ${nombreArchivo}
                                </span>
                                <div style="display: flex; gap: 8px;">
                                    <a href="${urlArchivo}" target="_blank" style="background: var(--primary-color); color: white; padding: 5px 12px; border-radius: 5px; text-decoration: none; font-size: 0.8em; font-weight: bold; white-space: nowrap;">
                                        👁️ Ver
                                    </a>
                                    ${esConcluido ? '' : `
                                    <button onclick="rechazarDocumento(${ajusteId}, '${tipo}')" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8em; font-weight: bold;" title="Rechazar archivo y pedirlo de nuevo">
                                        ✖ Rechazar
                                    </button>
                                    `}
                                </div>
                            </div>
                        `;
                    }
                } else {
                    htmlContenido += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-color); border-radius: 8px; border: 1px dashed #e74c3c; margin-bottom: 10px;">
                            <strong style="color: #e74c3c; width: 50px;">${tipo}</strong>
                            <span style="color: #e74c3c; font-size: 0.85em; font-weight: bold; flex-grow: 1; text-align: right;">Faltante (Pendiente por el Ajustador)</span>
                        </div>
                    `;
                }
            });
        } else {
            htmlContenido += '<p style="color: #e74c3c; font-size: 0.9em; text-align: center;">El ajustador aún no ha subido documentos.</p>';
        }

        modalContenido.innerHTML = htmlContenido;

    } catch (error) {
        modalContenido.innerHTML = '<p style="color: #e74c3c;">Error al conectar con el servidor.</p>';
    }
}

// ==========================================
// 4. GUARDAR ESTADO Y RESPUESTA (FEEDBACK)
// ==========================================
async function guardarEstadoAdmin(ajusteId) {
    const nuevoEstado = document.getElementById('selectEstadoAdmin').value;
    const respuestaAnalista = document.getElementById('textoRespuestaAdmin').value;

    try {
        const respuesta = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nuevoEstado: nuevoEstado,
                respuestaAnalista: respuestaAnalista,
                remitente: nombreUsuario
            })
        });

        if (respuesta.ok) {
            alert(`✅ Expediente #${ajusteId} actualizado a: ${nuevoEstado}`);

            if (nuevoEstado === 'Concluido') {
                await generarReportePDF(ajusteId);
            }

            cerrarModalAdmin();
            cargarTablaAdmin();
            cargarDashboardAdmin();
            revisarNotificaciones();
        } else {
            alert("❌ Error al actualizar el estado.");
        }
    } catch (error) {
        console.error("Error de red:", error);
    }
}

// ==========================================
// 5. GENERADOR DE REPORTES PDF (jsPDF)
// ==========================================
async function generarReportePDF(ajusteId) {
    try {
        const resInfo = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}`);
        const resDocs = await fetch(`http://localhost:3000/api/documentos/${ajusteId}`);

        const info = await resInfo.json();
        let datosDocs = { documentos: [] };
        if (resDocs.ok) {
            datosDocs = await resDocs.json();
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(26, 35, 126);
        doc.text("ASPV - Reporte de Cierre de Siniestro", 20, 20);

        doc.setLineWidth(0.5);
        doc.setDrawColor(26, 35, 126);
        doc.line(20, 25, 190, 25);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`ID de Expediente: #${ajusteId}`, 20, 35);
        doc.text(`Fecha de Resolución: ${new Date().toLocaleDateString('es-MX')}`, 20, 45);
        doc.text(`Estado Final: ${info.estado}`, 20, 55);

        doc.setFont("helvetica", "italic");
        doc.text(`Nota de Rendimiento:`, 20, 65);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(info.penalizado ? 231 : 46, info.penalizado ? 76 : 204, info.penalizado ? 60 : 113);
        doc.text(info.alertaUI, 20, 72, { maxWidth: 170 });

        const filas = [];
        datosDocs.documentos.forEach(docInfo => {
            const estadoArchivo = docInfo.RutaArchivo === 'NO_REQUERIDO' ? 'Omitido (N/A)' : 'Entregado (En Base de Datos)';
            filas.push([docInfo.TipoDocumento, estadoArchivo]);
        });

        doc.autoTable({
            startY: 85,
            head: [['Tipo de Documento', 'Estado de Entrega']],
            body: filas,
            headStyles: { fillColor: [26, 35, 126] },
            theme: 'grid'
        });

        doc.save(`Expediente_ASPV_${ajusteId}.pdf`);

    } catch (error) {
        console.error("Error al generar PDF:", error);
        alert("⚠️ El expediente se cerró, pero hubo un error generando el PDF.");
    }
}

function cerrarModalAdmin() {
    document.getElementById('modalAdmin').style.display = 'none';
}

// ==========================================
// 6. BUSCADOR Y FILTRO INTELIGENTE
// ==========================================
function filtrarTablaAdmin() {
    const textoBuscador = document.getElementById("buscadorAdmin").value.toLowerCase();
    const estadoSeleccionado = document.getElementById("filtroEstado").value.toLowerCase();

    const contenedor = document.getElementById("contenedorTablasSiniestros");
    if (!contenedor) return;

    const tablas = contenedor.getElementsByTagName("table");
    const titulos = contenedor.getElementsByTagName("h4");

    for (let t = 0; t < tablas.length; t++) {
        const filas = tablas[t].getElementsByTagName("tr");
        let filasVisibles = 0;

        for (let i = 1; i < filas.length; i++) {
            const textoFila = filas[i].textContent || filas[i].innerText;
            const columnaEstado = filas[i].getElementsByTagName("td")[2];
            const textoEstado = columnaEstado ? columnaEstado.textContent.toLowerCase() : "";

            const cumpleTexto = textoFila.toLowerCase().indexOf(textoBuscador) > -1;
            const cumpleEstado = estadoSeleccionado === "" || textoEstado.indexOf(estadoSeleccionado) > -1;

            if (cumpleTexto && cumpleEstado) {
                filas[i].style.display = "";
                filasVisibles++;
            } else {
                filas[i].style.display = "none";
            }
        }

        if (filasVisibles === 0) {
            tablas[t].style.display = "none";
            if(titulos[t]) titulos[t].style.display = "none";
        } else {
            tablas[t].style.display = "";
            if(titulos[t]) titulos[t].style.display = "";
        }
    }
}

// Inicializar la vista
cargarDashboardAdmin();
cargarTablaAdmin();

// ==========================================
// 7. ACCESIBILIDAD (Modo Oscuro y Tamaño)
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

// ==========================================
// 8. RECHAZAR DOCUMENTO (Solicitar de nuevo)
// ==========================================
async function rechazarDocumento(ajusteId, tipoDoc) {
    const textarea = document.getElementById('textoRespuestaAdmin');
    const textoGuardado = textarea ? textarea.value : '';

    if(!confirm(`⚠️ ¿Estás seguro de que quieres rechazar el documento ${tipoDoc}? Se eliminará el actual y el Ajustador tendrá que subirlo obligatoriamente.`)) return;

    try {
        const res = await fetch(`http://localhost:3000/api/documentos/rechazar/${ajusteId}/${tipoDoc}`, { method: 'DELETE' });
        if(res.ok) {
            alert(`✅ Documento ${tipoDoc} rechazado. Ya se le habilitó la subida al ajustador.`);
            evaluarExpediente(ajusteId, textoGuardado);
            revisarNotificaciones();
        } else {
            alert("❌ Error al rechazar el documento.");
        }
    } catch(error) {
        console.error("Error rechazando doc:", error);
    }
}

// ==========================================
// 9. SISTEMA REAL DE NOTIFICACIONES (ACUMULABLE)
// ==========================================
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

document.addEventListener("DOMContentLoaded", () => {
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