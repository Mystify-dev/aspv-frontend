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
            document.getElementById('kpiConcluidos').innerText = expedientes.filter(exp => exp.Estado === 'Concluido').length;
        }
    } catch (error) { console.error("Error al cargar KPIs:", error); }
}

async function cargarTablaAdmin() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/lista-expedientes');
        if (respuesta.ok) {
            const expedientes = await respuesta.json();
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
                    const folioPersonal = exp.AjusteID || (index + 1);

                    const fecha = new Date(exp.FechaOcurrencia).toLocaleDateString('es-MX');
                    let colorEstado = exp.Estado === 'Concluido' ? '#2ecc71' : (exp.Estado === 'En Análisis' ? '#f39c12' : '#3498db');
                    const lugar = exp.Lugar || 'N/A';
                    const seguro = exp.Seguro || 'N/A';
                    const kms = exp.Kilometros ? new Intl.NumberFormat('es-MX').format(exp.Kilometros) + ' km' : 'N/A';
                    const monto = exp.Monto ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(exp.Monto) : '$0.00';

                    htmlTabla += `
                        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.3s;">
                            <td style="padding: 12px 10px; font-weight: bold;">SIN-${folioPersonal.toString().padStart(3, '0')}</td>
                            <td style="padding: 12px 10px;">${lugar}</td>
                            <td style="padding: 12px 10px;">${seguro}</td>
                            <td style="padding: 12px 10px; color: var(--text-muted);">${kms}</td>
                            <td style="padding: 12px 10px; color: var(--text-muted);">${fecha}</td>
                            <td style="padding: 12px 10px;">
                                <span style="background-color: ${colorEstado}20; color: ${colorEstado}; padding: 3px 10px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">
                                    ${exp.Estado}
                                </span>
                            </td>
                            <td style="padding: 12px 10px; color: #2ecc71; font-weight: bold;">${monto}</td>
                            <td style="padding: 12px 10px;">
                                <button onclick="folioVisualResumen = ${folioPersonal}; evaluarExpediente(${exp.AjusteID})" style="background: var(--primary-color); color: white; border: none; padding: 6px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.85em;">
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
    } catch (error) { console.error("Error al cargar tabla:", error); }
}

let folioVisualResumen = null;

async function evaluarExpediente(ajusteId, borradorTexto = '') {
    const modal = document.getElementById('modalAdmin');
    const modalContenido = document.getElementById('modalAdminContenido');
    const tarjetaModal = modal.querySelector('.card');

    // Truco para ensanchar la ventana estilo ASPV Dark Claims Protocol
    tarjetaModal.style.width = '1100px';
    tarjetaModal.style.maxWidth = '95%';

    document.getElementById('modalAdminExpId').innerText = folioVisualResumen ? `SIN-${folioVisualResumen.toString().padStart(3, '0')}` : `#${ajusteId}`;
    modal.style.display = 'flex';
    modalContenido.innerHTML = '<p style="text-align: center; color: var(--primary-color);">Cargando telemetría del expediente...</p>';

    try {
        const resDocs = await fetch(`http://localhost:3000/api/documentos/${ajusteId}`);
        const resInfo = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}`);
        let esConcluido = false;
        let urlsParaDescargar = [];
        let htmlArchivos = '';
        let htmlContenido = '';

        if (resDocs.ok && resInfo.ok) {
            const info = await resInfo.json();
            const datosDocs = await resDocs.json();

            esConcluido = info.estado === 'Concluido';
            const colorAlerta = info.penalizado ? 'var(--danger-color)' : 'var(--success-color)';
            const montoFormateado = info.monto ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(info.monto) : '$0.00';

            // Preparar HTML de Archivos (en cuadrícula)
            ['DOA', 'ORD', 'PM'].forEach(tipo => {
                const doc = datosDocs.documentos.find(d => d.TipoDocumento === tipo);
                if (doc) {
                    if (doc.RutaArchivo === 'NO_REQUERIDO') {
                        htmlArchivos += `
                            <div style="background: var(--bg-color); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
                                <div style="display: flex; justify-content: space-between;"><strong style="color: var(--warning-color);">${tipo}</strong><span style="font-size: 0.75em; color: var(--text-muted);">Por Cotejar</span></div>
                                <span style="color: var(--text-muted); font-size: 0.8em; font-style: italic; margin-top: 5px;">No requerido</span>
                            </div>`;
                    } else {
                        const nombreArchivo = doc.RutaArchivo.split('\\').pop().split('/').pop();
                        const urlCompleta = `http://localhost:3000/${doc.RutaArchivo.replace(/\\/g, '/')}`;
                        urlsParaDescargar.push(`'${urlCompleta}'`);

                        htmlArchivos += `
                            <div style="background: var(--bg-color); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong style="color: var(--primary-color);">${tipo}</strong>
                                    <div style="display: flex; gap: 5px;">
                                        <a href="${urlCompleta}" target="_blank" style="background: rgba(37, 99, 235, 0.1); color: var(--primary-color); padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 0.75em; font-weight: bold;">👁️</a>
                                        ${esConcluido ? '' : `<button onclick="preguntarAccion(${ajusteId}, '${tipo}', 'rechazar')" style="background: rgba(239, 68, 68, 0.1); color: var(--danger-color); border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75em; font-weight: bold;">✖</button>`}
                                    </div>
                                </div>
                                <span style="color: var(--text-color); font-size: 0.75em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nombreArchivo}</span>
                            </div>`;
                    }
                } else {
                    htmlArchivos += `
                        <div style="background: rgba(239, 68, 68, 0.05); padding: 12px; border-radius: 8px; border: 1px dashed var(--danger-color); display: flex; flex-direction: column; justify-content: center; align-items: center;">
                            <strong style="color: var(--danger-color); font-size: 0.9em;">${tipo} Faltante</strong>
                        </div>`;
                }
            });

            // Construir el GRID principal
            htmlContenido = `
                <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; margin-top: 10px;">
                    
                    <!-- COLUMNA IZQUIERDA: Vehículo, Documentos y Narrativa -->
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        
                        <!-- Tarjetas de Telemetría -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                            <div style="background: var(--bg-color); padding: 12px; border-radius: 10px; border: 1px solid var(--border-color);">
                                <span style="font-size: 0.7em; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">📍 Ubicación y Seguro</span><br>
                                <strong style="color: var(--text-color); font-size: 0.9em;">${info.lugar} • ${info.seguro}</strong>
                            </div>
                            <div style="background: var(--bg-color); padding: 12px; border-radius: 10px; border: 1px solid var(--border-color);">
                                <span style="font-size: 0.7em; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">🚗 Telemetría</span><br>
                                <strong style="color: var(--text-color); font-size: 0.9em;">${info.kilometros ? info.kilometros + ' km' : 'N/A'}</strong>
                            </div>
                            <div style="background: var(--bg-color); padding: 12px; border-radius: 10px; border: 1px solid var(--border-color);">
                                <span style="font-size: 0.7em; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">💰 Estimación Financiera</span><br>
                                <strong style="color: var(--success-color); font-size: 1.1em;">${montoFormateado}</strong>
                            </div>
                        </div>

                        <!-- Archivos y Documentación Oficial -->
                        <div style="background: var(--bg-color); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h4 style="margin: 0; color: var(--text-color);">📁 Archivos y Documentación Oficial</h4>
                                ${urlsParaDescargar.length > 0 ? `<button onclick="descargarArchivosMasivo([${urlsParaDescargar.join(',')}])" style="background: transparent; color: var(--text-muted); border: none; cursor: pointer; font-size: 0.8em; font-weight: bold;">📥 Lote completo (${urlsParaDescargar.length})</button>` : ''}
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                                ${htmlArchivos}
                            </div>
                        </div>

                        <!-- Narrativa Pericial -->
                        <div style="background: var(--bg-color); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color);">
                            <h4 style="margin: 0 0 10px 0; color: var(--text-muted); font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.05em;">NARRATIVA PERICIAL ASENTADA</h4>
                            <p style="margin: 0; font-size: 0.9em; line-height: 1.6; color: var(--text-muted); font-style: italic;">"${info.relatoria || 'Sin relatoría'}"</p>
                        </div>
                    </div>

                    <!-- COLUMNA DERECHA: Dictamen y Bitácora -->
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        
                        <!-- Dictamen del Auditor -->
                        <div style="background: var(--bg-color); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color);">
                            <h4 style="margin: 0 0 5px 0; color: var(--text-color);">⚖️ Dictamen del Auditor</h4>
                            <p style="margin: 0 0 15px 0; font-size: 0.8em; color: ${colorAlerta}; font-weight: bold;">${info.alertaUI}</p>

                            ${esConcluido ? `
                                <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success-color); padding: 10px; border-radius: 6px; text-align: center;">
                                    <strong style="color: var(--success-color); font-size: 0.85em;">✅ Expediente Cerrado y Autorizado</strong>
                                </div>
                                <input type="hidden" id="textoRespuestaAdmin" value="">
                            ` : `
                                <label style="font-size: 0.8em; font-weight: bold; color: var(--text-muted); display: block; margin-bottom: 5px;">Tu instrucción al Ajustador:</label>
                                <textarea id="textoRespuestaAdmin" rows="2" placeholder="Ej. Faltan firmas en el DOA..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--panel-bg); color: var(--text-color); margin-bottom: 15px; box-sizing: border-box; resize: vertical;">${borradorTexto}</textarea>
                                
                                <label style="font-size: 0.8em; font-weight: bold; color: var(--text-muted); display: block; margin-bottom: 5px;">Resolución del Sistema:</label>
                                <select id="selectEstadoAdmin" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--panel-bg); color: var(--text-color); margin-bottom: 15px; font-weight: bold;" ${(info.turno === 'Ajustador') ? 'disabled' : ''}>
                                    <option value="En Análisis" ${info.estado === 'En Análisis' ? 'selected' : ''}>En Análisis</option>
                                    <option value="En Ajuste" ${info.estado === 'En Ajuste' ? 'selected' : ''}>En Ajuste</option>
                                    <option value="Concluido" ${info.estado === 'Concluido' ? 'selected' : ''}>Concluido</option>
                                </select>

                                <button onclick="guardarEstadoAdmin(${ajusteId})" style="width: 100\%; background: ${(info.turno === 'Ajustador') ? 'var(--text-muted)' : 'var(--primary-color)'}; color: white; border: none; padding: 12px; border-radius: 8px; cursor: ${(info.turno === 'Ajustador') ? 'not-allowed' : 'pointer'}; font-weight: bold; font-size: 0.9em; transition: 0.3s;" ${(info.turno === 'Ajustador') ? 'disabled' : ''}>
                                    Actualizar Dictamen y Notificar
                                </button>
                            `}
                        </div>

                        <!-- Bitácora -->
                        <div style="background: var(--bg-color); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); flex: 1;">
                            <h4 style="margin: 0 0 15px 0; color: var(--text-color);">💬 Bitácora Técnica</h4>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                ${info.respuestaAnalista ? `
                                    <div style="background: var(--panel-bg); padding: 10px 15px; border-radius: 8px; border-left: 3px solid var(--primary-color);">
                                        <strong style="font-size: 0.8em; color: var(--primary-color);">Analista ASPV</strong>
                                        <p style="margin: 5px 0 0 0; font-size: 0.85em; color: var(--text-color); white-space: pre-wrap;">${info.respuestaAnalista}</p>
                                    </div>
                                ` : '<span style="font-size: 0.8em; color: var(--text-muted);">Sin intervenciones previas del analista.</span>'}
                            </div>
                        </div>

                    </div>
                </div>
            `;
        }
        modalContenido.innerHTML = htmlContenido;
    } catch (error) { modalContenido.innerHTML = '<p style="color: var(--danger-color); text-align: center;">Error de telemetría.</p>'; }
}

// ==========================================
// FUNCIÓN NUEVA: DESCARGA MASIVA
// ==========================================
async function descargarArchivosMasivo(urls) {
    if (!urls || urls.length === 0) return;

    mostrarToast(`⏳ Preparando la descarga de ${urls.length} archivo(s)...`, "info");

    for (let url of urls) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("No se pudo obtener el archivo");

            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;

            // Extraer el nombre original o asignar uno por defecto
            a.download = url.split('/').pop() || 'documento_aspv';

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            console.error("Error descargando:", url);
            mostrarToast("❌ Error al descargar un archivo.", "error");
        }

        // Pausa ligera para asegurar que el navegador registre cada descarga independiente
        await new Promise(r => setTimeout(r, 400));
    }

    mostrarToast("✅ Todas las descargas han finalizado.", "success");
}

async function guardarEstadoAdmin(ajusteId) {
    const nuevoEstado = document.getElementById('selectEstadoAdmin').value;
    const comentarioObj = document.getElementById('textoRespuestaAdmin');
    const comentario = comentarioObj ? comentarioObj.value.trim() : null;

    try {
        const respuesta = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevoEstado: nuevoEstado, respuestaAnalista: comentario, remitente: nombreUsuario })
        });

        if (respuesta.ok) {
            mostrarToast(`Expediente actualizado a: ${nuevoEstado}`, "success");
            if (nuevoEstado === 'Concluido') {
                mostrarToast("Generando reporte PDF...", "info");
                await generarReportePDF(ajusteId);
            }
            cerrarModalAdmin();
            cargarTablaAdmin();
            cargarDashboardAdmin();
            revisarNotificaciones();
        } else { mostrarToast("Error al actualizar el estado.", "error"); }
    } catch (error) { console.error("Error de red:", error); }
}

async function generarReportePDF(ajusteId) {
    try {
        const resInfo = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}`);
        const resDocs = await fetch(`http://localhost:3000/api/documentos/${ajusteId}`);
        const info = await resInfo.json();
        let datosDocs = { documentos: [] };
        if (resDocs.ok) datosDocs = await resDocs.json();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(26, 35, 126);
        doc.text("ASPV - Reporte de Cierre de Siniestro", 20, 20);
        doc.setLineWidth(0.5); doc.setDrawColor(26, 35, 126); doc.line(20, 25, 190, 25);
        doc.setFontSize(12); doc.setTextColor(0, 0, 0);
        doc.text(`ID de Expediente Original: #${ajusteId}`, 20, 35);
        doc.text(`Fecha de Resolución: ${new Date().toLocaleDateString('es-MX')}`, 20, 45);
        doc.text(`Estado Final: ${info.estado}`, 20, 55);
        doc.setFont("helvetica", "italic"); doc.text(`Nota de Rendimiento:`, 20, 65);
        doc.setFont("helvetica", "normal"); doc.setTextColor(info.penalizado ? 231 : 46, info.penalizado ? 76 : 204, info.penalizado ? 60 : 113);
        doc.text(info.alertaUI, 20, 72, { maxWidth: 170 });

        const filas = [];
        datosDocs.documentos.forEach(docInfo => {
            const estadoArchivo = docInfo.RutaArchivo === 'NO_REQUERIDO' ? 'Omitido (N/A)' : 'Entregado (En BD)';
            filas.push([docInfo.TipoDocumento, estadoArchivo]);
        });

        doc.autoTable({ startY: 85, head: [['Tipo de Documento', 'Estado de Entrega']], body: filas, headStyles: { fillColor: [26, 35, 126] }, theme: 'grid' });
        doc.save(`Expediente_ASPV_Original_${ajusteId}.pdf`);
    } catch (error) { mostrarToast("El expediente se cerró, pero hubo un error generando el PDF.", "warning"); }
}

function cerrarModalAdmin() { document.getElementById('modalAdmin').style.display = 'none'; }

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
            const columnaEstado = filas[i].getElementsByTagName("span")[0];
            const textoEstado = columnaEstado ? columnaEstado.textContent.toLowerCase() : "";

            if (textoFila.toLowerCase().indexOf(textoBuscador) > -1 && (estadoSeleccionado === "" || textoEstado.indexOf(estadoSeleccionado) > -1)) {
                filas[i].style.display = ""; filasVisibles++;
            } else { filas[i].style.display = "none"; }
        }
        tablas[t].style.display = filasVisibles === 0 ? "none" : "";
        if(titulos[t]) titulos[t].style.display = filasVisibles === 0 ? "none" : "";
    }
}

let accionPendiente = null;
let idObjetivo = null;
let datoExtra = null;

function preguntarAccion(id, dato, tipoAccion) {
    accionPendiente = tipoAccion; idObjetivo = id; datoExtra = dato;
    document.getElementById('textoConfirmacion').innerText = `¿Estás seguro de que quieres rechazar el documento ${dato}? El Ajustador tendrá que subirlo obligatoriamente.`;
    document.getElementById('modalConfirmacion').style.display = 'flex';
}

function cancelarAccion() {
    document.getElementById('modalConfirmacion').style.display = 'none';
    accionPendiente = null;
}

async function confirmarAccion() {
    document.getElementById('modalConfirmacion').style.display = 'none';
    if (accionPendiente === 'rechazar') {
        const textarea = document.getElementById('textoRespuestaAdmin');
        const textoGuardado = textarea ? textarea.value : '';
        try {
            const res = await fetch(`http://localhost:3000/api/documentos/rechazar/${idObjetivo}/${datoExtra}`, { method: 'DELETE' });
            if(res.ok) {
                mostrarToast(`Documento ${datoExtra} rechazado.`, "success");
                evaluarExpediente(idObjetivo, textoGuardado);
                revisarNotificaciones();
            }
        } catch(error) { console.error("Error rechazando doc:", error); }
    }
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

// ==========================================
// 3. EXCEL (NUEVO EXCELJS)
// ==========================================
async function exportarExcel() {
    try {
        mostrarToast("⏳ Generando archivo Excel con diseño...", "info");

        const res = await fetch('http://localhost:3000/api/exportar-excel');

        if (res.ok) {
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

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('nombreUsuarioUI').innerText = `Hola, ${nombreUsuario}`;
    cargarDashboardAdmin();
    cargarTablaAdmin();

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

// ==========================================
// PERFIL DE USUARIO (UNIVERSAL)
// ==========================================
const miUsuarioIdGbl = localStorage.getItem('aspv_id');

async function cargarDatosPerfil() {
    if (!miUsuarioIdGbl) return;
    try {
        const res = await fetch(`http://localhost:3000/api/perfil/${miUsuarioIdGbl}`);
        if (res.ok) {
            const perfil = await res.json();

            // Actualizar la foto en el header (si existe)
            const avatarUrl = perfil.FotoPerfil ? `http://localhost:3000/${perfil.FotoPerfil}` : 'imagenes/LogoASPV.jpg';
            const avatarHeader = document.getElementById('avatarHeader');
            if (avatarHeader) avatarHeader.src = avatarUrl;

            // Llenar el modal (si existe en el DOM actual)
            const previewFoto = document.getElementById('previewFotoPerfil');
            if (previewFoto) previewFoto.src = avatarUrl;

            const correoInput = document.getElementById('correoPerfil');
            if (correoInput) correoInput.value = perfil.Correo;

            const telInput = document.getElementById('telefonoPerfil');
            if (telInput) telInput.value = perfil.Telefono || '';
        }
    } catch (error) { console.error("Error al cargar perfil", error); }
}

function abrirModalPerfil() {
    const modal = document.getElementById('modalPerfil');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalPerfil() {
    const modal = document.getElementById('modalPerfil');
    if (modal) modal.style.display = 'none';
}

// Vista previa de la foto
const inputFoto = document.getElementById('inputFotoPerfil');
if (inputFoto) {
    inputFoto.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(ev) { document.getElementById('previewFotoPerfil').src = ev.target.result; }
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

// Guardar en Base de Datos
const formPerfil = document.getElementById('formPerfil');
if (formPerfil) {
    formPerfil.addEventListener('submit', async (e) => {
        e.preventDefault();
        mostrarToast("Guardando perfil...", "info");

        const formData = new FormData();
        formData.append('telefono', document.getElementById('telefonoPerfil').value.trim());

        const foto = document.getElementById('inputFotoPerfil').files[0];
        if (foto) formData.append('fotoPerfil', foto);

        try {
            const res = await fetch(`http://localhost:3000/api/perfil/${miUsuarioIdGbl}`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                mostrarToast("✅ Perfil actualizado.", "success");
                cargarDatosPerfil(); // Recarga la foto
                cerrarModalPerfil();
            } else {
                mostrarToast("❌ Error al guardar perfil.", "error");
            }
        } catch (error) {
            mostrarToast("❌ Error de red.", "error");
        }
    });
}

// Llamar automáticamente al entrar
document.addEventListener("DOMContentLoaded", () => {
    cargarDatosPerfil();
});