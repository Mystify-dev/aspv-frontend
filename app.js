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

// ==========================================
// 0. SEGURIDAD Y CONTROL DE ACCESO
// ==========================================
const rolUsuario = localStorage.getItem('aspv_rol');
const nombreUsuario = localStorage.getItem('aspv_nombre');

if (!rolUsuario || rolUsuario !== 'Ajustador') {
    // Si no está logueado, lo mandamos al login sin esperar.
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
// 1. ACCESIBILIDAD
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
// 2. LÓGICA DE NEGOCIO ASPV
// ==========================================
let expedienteActualId = null;

document.getElementById('formExpediente').addEventListener('submit', async (e) => {
    e.preventDefault();

    const datosSiniestro = {
        numSiniestro: document.getElementById('numSiniestro').value,
        fechaAccidente: document.getElementById('fechaAccidente').value,
        lugar: document.getElementById('lugarSiniestro').value,
        seguro: document.getElementById('tipoSeguro').value,
        monto: document.getElementById('montoSiniestro').value,
        kilometros: document.getElementById('kmSiniestro').value,
        relatoria: document.getElementById('relatoriaSiniestro').value
    };

    if (!datosSiniestro.numSiniestro || !datosSiniestro.fechaAccidente) {
        mostrarToast("Por favor, llena al menos el número de siniestro y la fecha.", "warning");
        return;
    }

    try {
        const respuesta = await fetch('http://localhost:3000/api/ajustes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AjustadorID: localStorage.getItem('aspv_id'),
                FechaOcurrencia: datosSiniestro.fechaAccidente,
                Lugar: datosSiniestro.lugar,
                Seguro: datosSiniestro.seguro,
                Monto: datosSiniestro.monto,
                Kilometros: datosSiniestro.kilometros,
                Relatoria: datosSiniestro.relatoria,
                remitente: nombreUsuario
            })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            expedienteActualId = resultado.ajusteId;
            mostrarToast(`¡Expediente ${datosSiniestro.numSiniestro} creado! Ya puedes subir sus documentos.`, "success");
            cargarResumenDashboard();
            cargarTablaExpedientes();
            revisarNotificaciones();
        } else {
            mostrarToast(`Error del servidor: ${resultado.error}`, "error");
        }
    } catch (error) {
        console.error("Error al conectar con la API:", error);
        mostrarToast("No se pudo conectar con el servidor.", "error");
    }
});

document.getElementById('formDocumentos').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!expedienteActualId) {
        mostrarToast("Primero debes 'Continuar a documentación' para crear un nuevo expediente.", "warning");
        return;
    }

    const archivoDOA = document.getElementById('archivoDOA').files[0];
    const naDOA = document.getElementById('naDOA_main').checked;

    const archivoORD = document.getElementById('archivoORD').files[0];
    const naORD = document.getElementById('naORD_main').checked;

    const archivoPM = document.getElementById('archivoPM').files[0];
    const naPM = document.getElementById('naPM_main').checked;

    if (!archivoDOA && !naDOA) return mostrarToast("Para DOA: Sube un archivo o marca N/A", "warning");
    if (!archivoORD && !naORD) return mostrarToast("Para ORD: Sube un archivo o marca N/A", "warning");
    if (!archivoPM && !naPM) return mostrarToast("Para PM: Sube un archivo o marca N/A", "warning");

    const subirArchivo = async (archivo, tipo, noAplica) => {
        const formData = new FormData();
        formData.append('expedienteId', expedienteActualId);
        formData.append('tipoDocumento', tipo);
        formData.append('noAplica', noAplica ? 'true' : 'false');
        if (archivo) formData.append('archivo', archivo);

        try {
            await fetch('http://localhost:3000/api/documentos', { method: 'POST', body: formData });
        } catch (error) {
            console.error(`Error de red al subir ${tipo}:`, error);
        }
    };

    mostrarToast(`Procesando documentación del expediente ${expedienteActualId}...`, "info");

    await subirArchivo(archivoDOA, 'DOA', naDOA);
    await subirArchivo(archivoORD, 'ORD', naORD);
    await subirArchivo(archivoPM, 'PM', naPM);

    mostrarToast(`¡Documentos guardados con éxito para el Expediente ${expedienteActualId}!`, "success");

    document.getElementById('formExpediente').reset();
    document.getElementById('formDocumentos').reset();
    document.getElementById('archivoDOA').disabled = false;
    document.getElementById('archivoORD').disabled = false;
    document.getElementById('archivoPM').disabled = false;

    expedienteActualId = null;
    cargarResumenDashboard();
});

// ==========================================
// 3. DASHBOARD EN TIEMPO REAL
// ==========================================
async function cargarResumenDashboard() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/lista-expedientes');
        if (respuesta.ok) {
            const expedientes = await respuesta.json();
            const misExpedientes = expedientes.filter(exp => exp.AjustadorNombre === nombreUsuario);

            const activos = misExpedientes.filter(exp => exp.Estado !== 'Concluido').length;

            document.getElementById('contadorExpedientes').innerText = activos;
            document.getElementById('contadorDocumentos').innerHTML = `${activos > 0 ? 'Revisar' : '0'} <span style="font-size: 0.4em; color: #ffb703;">Pendientes</span>`;
        }
    } catch (error) {
        console.error("Error al cargar el resumen:", error);
    }
}

cargarResumenDashboard();

// ==========================================
// 4. TABLA DE BANDEJA DE ENTRADA (FILTRADA)
// ==========================================
async function cargarTablaExpedientes() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/lista-expedientes');
        if (respuesta.ok) {
            const expedientes = await respuesta.json();
            const misExpedientes = expedientes.filter(exp => exp.AjustadorNombre === nombreUsuario);

            const tbody = document.getElementById('tablaExpedientes');
            tbody.innerHTML = '';

            misExpedientes.forEach((exp, index) => {
                // EL TRUCO VISUAL: Cuenta del más nuevo al más viejo
                const folioPersonal = misExpedientes.length - index;
                const fechaOcurrencia = new Date(exp.FechaOcurrencia).toLocaleDateString('es-MX');
                const colorEstado = exp.Estado === 'Concluido' ? '#2ecc71' : '#f39c12';

                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.3s;">
                        <td style="padding: 15px 10px; font-weight: bold;"># ${folioPersonal}</td>
                        <td style="padding: 15px 10px; color: var(--text-muted);">${fechaOcurrencia}</td>
                        <td style="padding: 15px 10px;">
                            <span style="background-color: ${colorEstado}20; color: ${colorEstado}; padding: 5px 10px; border-radius: 20px; font-size: 0.85em; font-weight: bold;">
                                ${exp.Estado}
                            </span>
                        </td>
                        <td style="padding: 15px 10px;">
                            <button onclick="folioVisualApp = ${folioPersonal}; verDetalle(${exp.AjusteID})" style="background: transparent; color: var(--primary-color); border: 1px solid var(--primary-color); padding: 5px 15px; border-radius: 5px; cursor: pointer; font-size: 0.85em;">
                                Ver detalle
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error("Error al cargar la tabla:", error);
    }
}

cargarTablaExpedientes();

// ==========================================
// 5. VENTANA EMERGENTE (MODAL) LÓGICA DE TURNOS
// ==========================================
let folioVisualApp = null;

async function verDetalle(ajusteId) {
    const modal = document.getElementById('modalDetalle');
    const modalContenido = document.getElementById('modalContenido');

    // Inyecta el folio visual en el título del modal
    document.getElementById('modalExpId').innerText = folioVisualApp ? `#${folioVisualApp}` : `#${ajusteId}`;
    modal.style.display = 'flex';
    modalContenido.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Cargando información...</p>';

    try {
        const resDocs = await fetch(`http://localhost:3000/api/documentos/${ajusteId}`);
        const resInfo = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}`);

        let htmlContenido = '';
        let tieneDOA = false, tieneORD = false, tienePM = false;

        if (resInfo.ok) {
            const info = await resInfo.json();
            const colorAlerta = info.penalizado ? '#e74c3c' : '#2ecc71';

            htmlContenido += `
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-color);">
                    <p style="margin: 0 0 10px 0; font-size: 0.9em; color: var(--text-color);"><strong>Estado actual:</strong> ${info.estado}</p>
                    <p style="margin: 0; font-size: 0.85em; color: ${colorAlerta}; font-weight: bold;">${info.alertaUI}</p>
                </div>
                
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-color);">
                    <p style="margin: 0 0 5px 0; font-size: 0.85em; font-weight: bold; color: var(--text-color);">Historial del reporte:</p>
                    <p style="margin: 0; font-size: 0.9em; color: var(--text-muted); font-style: italic; white-space: pre-wrap;">"${info.relatoria || 'Sin relatoría'}"</p>
                    
                    ${info.respuestaAnalista ? `
                        <hr style="border: 0; border-top: 1px dashed var(--border-color); margin: 10px 0;">
                        <p style="margin: 0 0 5px 0; font-size: 0.85em; font-weight: bold; color: #e74c3c;">El Analista respondió:</p>
                        <p style="margin: 0; font-size: 0.9em; color: var(--text-color); white-space: pre-wrap;">${info.respuestaAnalista}</p>
                    ` : ''}

                    ${(!info.respuestaAnalista && info.estado !== 'Concluido') ? `
                        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;">
                        <div style="background-color: #3498db20; border-left: 4px solid #3498db; padding: 10px; border-radius: 4px;">
                            <p style="margin: 0; font-size: 0.85em; color: #3498db; font-weight: bold;">🔍 Expediente en revisión. El analista te notificará si faltan documentos.</p>
                        </div>
                    ` : ''}

                    ${(info.respuestaAnalista && info.estado !== 'Concluido' && info.turno === 'Ajustador') ? `
                        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;">
                        <p style="margin: 0 0 5px 0; font-size: 0.85em; font-weight: bold; color: var(--text-color);">Responder al Analista (Tu turno):</p>
                        <textarea id="inputRespuestaAjustador" rows="2" placeholder="Ej. Ya subí el documento que faltaba..." style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--panel-bg); color: var(--text-color); margin-bottom: 8px; box-sizing: border-box; font-family: inherit; resize: vertical;"></textarea>
                        <div style="display: flex; justify-content: flex-end;">
                            <button onclick="enviarRespuestaAjustador(${ajusteId})" style="background-color: var(--primary-color); color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.85em;">Enviar respuesta ➔</button>
                        </div>
                    ` : ''}
                    
                    ${(info.respuestaAnalista && info.estado !== 'Concluido' && info.turno === 'Analista') ? `
                        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;">
                        <div style="background-color: #f39c1220; border-left: 4px solid #f39c12; padding: 10px; border-radius: 4px;">
                            <p style="margin: 0; font-size: 0.85em; color: #f39c12; font-weight: bold;">⏳ Respuesta enviada. Esperando contestación del Analista...</p>
                        </div>
                    ` : ''}
                </div>
                
                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;">
                <h4 style="margin: 0 0 10px 0; color: var(--text-color);">Documentos Vinculados</h4>
            `;
        }

        if (resDocs.ok) {
            const datosDocs = await resDocs.json();

            datosDocs.documentos.forEach(doc => {
                if (doc.TipoDocumento === 'DOA') tieneDOA = true;
                if (doc.TipoDocumento === 'ORD') tieneORD = true;
                if (doc.TipoDocumento === 'PM') tienePM = true;

                const nombreArchivo = doc.RutaArchivo === 'NO_REQUERIDO'
                    ? '<span style="color: #f39c12; font-style: italic;">No requerido</span>'
                    : doc.RutaArchivo.split('\\').pop().split('/').pop();

                htmlContenido += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-color); border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                        <strong style="color: var(--primary-color);">${doc.TipoDocumento}</strong>
                        <span style="color: var(--text-muted); font-size: 0.85em; text-align: right; word-break: break-all; margin-left: 15px;">
                            ${nombreArchivo}
                        </span>
                    </div>
                `;
            });
        }

        if (!tieneDOA || !tieneORD || !tienePM) {
            htmlContenido += `<hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;">`;
            htmlContenido += `<h4 style="margin: 0 0 15px 0; color: var(--text-color);">Cargar Faltantes</h4>`;
            htmlContenido += `<form id="formFaltantes" style="display: flex; flex-direction: column; gap: 12px;">`;

            const generarCampoFaltante = (tipo) => `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="font-weight: bold; font-size: 0.85em; color: var(--text-color);">📄 ${tipo}</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <label style="font-size: 0.75em; color: var(--text-muted);">
                            <input type="checkbox" id="na${tipo}_modal" onchange="document.getElementById('modal${tipo}').disabled = this.checked"> N/A
                        </label>
                        <input type="file" id="modal${tipo}" accept=".pdf, image/*" style="width: 170px; font-size: 0.8em; color: var(--text-color);">
                    </div>
                </div>`;

            if (!tieneDOA) htmlContenido += generarCampoFaltante('DOA');
            if (!tieneORD) htmlContenido += generarCampoFaltante('ORD');
            if (!tienePM) htmlContenido += generarCampoFaltante('PM');

            htmlContenido += `
                <button type="button" onclick="subirDesdeModal(${ajusteId})" style="margin-top: 10px; background: transparent; color: var(--primary-color); border: 2px solid var(--primary-color); padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.3s;">
                    ☁️ Completar Expediente
                </button>
            </form>`;
        }

        modalContenido.innerHTML = htmlContenido;

    } catch (error) {
        console.error("Error al cargar detalles:", error);
        modalContenido.innerHTML = '<p style="color: #e74c3c; text-align: center;">Error al conectar con el servidor.</p>';
    }
}

async function subirDesdeModal(ajusteId) {
    const elDOA = document.getElementById('modalDOA');
    const naDOA = document.getElementById('naDOA_modal') ? document.getElementById('naDOA_modal').checked : false;

    const elORD = document.getElementById('modalORD');
    const naORD = document.getElementById('naORD_modal') ? document.getElementById('naORD_modal').checked : false;

    const elPM = document.getElementById('modalPM');
    const naPM = document.getElementById('naPM_modal') ? document.getElementById('naPM_modal').checked : false;

    const archivoDOA = elDOA ? elDOA.files[0] : null;
    const archivoORD = elORD ? elORD.files[0] : null;
    const archivoPM = elPM ? elPM.files[0] : null;

    if (elDOA && !archivoDOA && !naDOA) return mostrarToast("Para DOA: Sube el archivo o marca N/A", "warning");
    if (elORD && !archivoORD && !naORD) return mostrarToast("Para ORD: Sube el archivo o marca N/A", "warning");
    if (elPM && !archivoPM && !naPM) return mostrarToast("Para PM: Sube el archivo o marca N/A", "warning");

    const subirArchivo = async (archivo, tipo, noAplica) => {
        if (!archivo && !noAplica) return;
        const formData = new FormData();
        formData.append('expedienteId', ajusteId);
        formData.append('tipoDocumento', tipo);
        formData.append('noAplica', noAplica ? 'true' : 'false');
        if (archivo) formData.append('archivo', archivo);

        await fetch('http://localhost:3000/api/documentos', { method: 'POST', body: formData });
    };

    mostrarToast("Procesando expediente...", "info");
    if (elDOA) await subirArchivo(archivoDOA, 'DOA', naDOA);
    if (elORD) await subirArchivo(archivoORD, 'ORD', naORD);
    if (elPM) await subirArchivo(archivoPM, 'PM', naPM);

    mostrarToast("¡Expediente actualizado exitosamente!", "success");
    verDetalle(ajusteId);
    cargarResumenDashboard();
}

function cerrarModal() {
    document.getElementById('modalDetalle').style.display = 'none';
}

function filtrarTabla() {
    const input = document.getElementById("buscadorExpedientes");
    const filtro = input.value.toLowerCase();
    const tabla = document.getElementById("tablaExpedientes");
    const filas = tabla.getElementsByTagName("tr");

    for (let i = 0; i < filas.length; i++) {
        const textoFila = filas[i].textContent || filas[i].innerText;
        filas[i].style.display = textoFila.toLowerCase().indexOf(filtro) > -1 ? "" : "none";
    }
}

// ==========================================
// 7. RESPONDER AL ANALISTA Y SUBIR FALTANTES (RESTAURADO)
// ==========================================
async function enviarRespuestaAjustador(ajusteId) {
    const input = document.getElementById('inputRespuestaAjustador');
    const mensaje = input.value.trim();

    if (!mensaje) {
        mostrarToast("Escribe un mensaje antes de enviar.", "warning");
        return;
    }

    // 1. CAPTURAR Y VALIDAR ARCHIVOS FALTANTES
    const formFaltantes = document.getElementById('formFaltantes');
    let archivosASubir = [];

    if (formFaltantes) {
        const elDOA = document.getElementById('modalDOA');
        const naDOA = document.getElementById('naDOA_modal') ? document.getElementById('naDOA_modal').checked : false;

        const elORD = document.getElementById('modalORD');
        const naORD = document.getElementById('naORD_modal') ? document.getElementById('naORD_modal').checked : false;

        const elPM = document.getElementById('modalPM');
        const naPM = document.getElementById('naPM_modal') ? document.getElementById('naPM_modal').checked : false;

        const archivoDOA = elDOA ? elDOA.files[0] : null;
        const archivoORD = elORD ? elORD.files[0] : null;
        const archivoPM = elPM ? elPM.files[0] : null;

        if (elDOA && !archivoDOA && !naDOA) return mostrarToast("Para DOA: Sube el archivo o marca N/A antes de enviar.", "warning");
        if (elORD && !archivoORD && !naORD) return mostrarToast("Para ORD: Sube el archivo o marca N/A antes de enviar.", "warning");
        if (elPM && !archivoPM && !naPM) return mostrarToast("Para PM: Sube el archivo o marca N/A antes de enviar.", "warning");

        if (elDOA) archivosASubir.push({ archivo: archivoDOA, tipo: 'DOA', noAplica: naDOA });
        if (elORD) archivosASubir.push({ archivo: archivoORD, tipo: 'ORD', noAplica: naORD });
        if (elPM) archivosASubir.push({ archivo: archivoPM, tipo: 'PM', noAplica: naPM });
    }

    try {
        // 2. SUBIR LOS ARCHIVOS (SI EXISTEN)
        if (archivosASubir.length > 0) {
            mostrarToast("Subiendo documentos y enviando respuesta...", "info");
            for (const item of archivosASubir) {
                if (!item.archivo && !item.noAplica) continue;
                const formData = new FormData();
                formData.append('expedienteId', ajusteId);
                formData.append('tipoDocumento', item.tipo);
                formData.append('noAplica', item.noAplica ? 'true' : 'false');
                if (item.archivo) formData.append('archivo', item.archivo);

                await fetch('http://localhost:3000/api/documentos', { method: 'POST', body: formData });
            }
        }

        // 3. ENVIAR EL MENSAJE DE TEXTO
        const res = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}/respuesta-ajustador`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevoMensaje: mensaje, remitente: nombreUsuario })
        });

        if (res.ok) {
            mostrarToast("✅ Respuesta y documentos enviados exitosamente.", "success");
            verDetalle(ajusteId);
            cargarResumenDashboard();
            revisarNotificaciones();
        } else {
            const error = await res.json();
            mostrarToast(`Error: ${error.error}`, "error");
        }
    } catch (error) {
        console.error("Error al enviar respuesta:", error);
    }
}

// ==========================================
// 8. SISTEMA AUTOMÁTICO DE NOTIFICACIONES
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
});

revisarNotificaciones();
setInterval(revisarNotificaciones, 10000);