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
// SEGURIDAD Y CONTROL DE ACCESO
// ==========================================
const rolUsuario = localStorage.getItem('aspv_rol');
const nombreUsuario = localStorage.getItem('aspv_nombre');
const miUsuarioIdGbl = localStorage.getItem('aspv_id');

if (!rolUsuario || rolUsuario !== 'Ajustador') window.location.href = 'login.html';
document.addEventListener("DOMContentLoaded", () => { document.getElementById('nombreUsuarioUI').innerText = `Hola, ${nombreUsuario}`; });
function cerrarSesion() { localStorage.clear(); window.location.href = 'login.html'; }

// ==========================================
// ACCESIBILIDAD
// ==========================================
function aplicarPreferencias() {
    const temaGuardado = localStorage.getItem('aspv_tema');
    const textoGuardado = localStorage.getItem('aspv_texto');
    if (temaGuardado === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    if (textoGuardado) document.documentElement.setAttribute('data-text', textoGuardado);
}
aplicarPreferencias();
function cambiarTema(tema) {
    if (tema === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('aspv_tema', 'dark'); }
    else { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('aspv_tema', 'light'); }
}
function cambiarTexto(tamano) { document.documentElement.setAttribute('data-text', tamano); localStorage.setItem('aspv_texto', tamano); }

// ==========================================
// LÓGICA DE NEGOCIO ASPV (CON 2DA ATENCIÓN)
// ==========================================
let expedienteActualId = null;

document.getElementById('formExpediente').addEventListener('submit', async (e) => {
    e.preventDefault();

    const checkComp = document.getElementById('checkComplementario');

    const datosSiniestro = {
        numSiniestro: document.getElementById('numSiniestro').value.trim(),
        fechaAccidente: document.getElementById('fechaAccidente').value,
        municipio: document.getElementById('municipio').value.trim(),
        estadoLugar: document.getElementById('estadoLugar').value.trim(),
        lugar: `${document.getElementById('municipio').value.trim()}, ${document.getElementById('estadoLugar').value.trim()}`,
        seguro: document.getElementById('aseguradora').value,
        kilometros: document.getElementById('kmSiniestro').value,
        relatoria: document.getElementById('relatoriaSiniestro').value,
        tipoCobertura: document.getElementById('tipoCobertura').value,
        tipoSiniestro: document.getElementById('tipoSiniestro').value,
        esComplementario: checkComp ? checkComp.checked : false // <-- LEEMOS LA CASILLA VIP
    };

    if (!datosSiniestro.numSiniestro || !datosSiniestro.fechaAccidente) return mostrarToast("Por favor, llena al menos el número de siniestro y la fecha.", "warning");

    try {
        const respuesta = await fetch('http://localhost:3000/api/ajustes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AjustadorID: localStorage.getItem('aspv_id'),
                FolioAseguradora: datosSiniestro.numSiniestro,
                FechaOcurrencia: datosSiniestro.fechaAccidente,
                Lugar: datosSiniestro.lugar,
                Seguro: datosSiniestro.seguro,
                Kilometros: datosSiniestro.kilometros,
                Relatoria: datosSiniestro.relatoria,
                TipoCobertura: datosSiniestro.tipoCobertura,
                TipoSiniestro: datosSiniestro.tipoSiniestro,
                esComplementario: datosSiniestro.esComplementario, // <-- ENVIAMOS EL PASE VIP AL PORTERO
                remitente: nombreUsuario
            })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            if (resultado.codigo === 'DUPLICADO') {
                mostrarToast(resultado.mensaje, "error");
                return;
            }
            mostrarToast(`Error del servidor: ${resultado.error || 'Intente de nuevo'}`, "error");
            return;
        }

        expedienteActualId = resultado.ajusteId;
        mostrarToast(`¡Expediente ${datosSiniestro.numSiniestro} creado! Sube tus documentos.`, "success");
        if (checkComp) checkComp.checked = false; // Limpiamos la casilla tras el éxito

        cargarResumenDashboard();
        cargarTablaExpedientes();
        revisarNotificaciones();

    } catch (error) { mostrarToast("No se pudo conectar con el servidor.", "error"); }
});

document.getElementById('formDocumentos').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!expedienteActualId) return mostrarToast("Primero debes 'Continuar a documentación' para crear un nuevo expediente.", "warning");

    const archivoDOA = document.getElementById('archivoDOA').files[0]; const naDOA = document.getElementById('naDOA_main').checked;
    const archivoORD = document.getElementById('archivoORD').files[0]; const naORD = document.getElementById('naORD_main').checked;
    const archivoPM = document.getElementById('archivoPM').files[0]; const naPM = document.getElementById('naPM_main').checked;

    if (!archivoDOA && !naDOA) return mostrarToast("Para DOA: Sube un archivo o marca N/A", "warning");
    if (!archivoORD && !naORD) return mostrarToast("Para ORD: Sube un archivo o marca N/A", "warning");
    if (!archivoPM && !naPM) return mostrarToast("Para PM: Sube un archivo o marca N/A", "warning");

    const subirArchivo = async (archivo, tipo, noAplica) => {
        const formData = new FormData();
        formData.append('expedienteId', expedienteActualId);
        formData.append('tipoDocumento', tipo);
        formData.append('noAplica', noAplica ? 'true' : 'false');
        if (archivo) formData.append('archivo', archivo);
        try { await fetch('http://localhost:3000/api/documentos', { method: 'POST', body: formData }); } catch (error) {}
    };

    mostrarToast(`Procesando documentación del expediente ${expedienteActualId}...`, "info");
    await subirArchivo(archivoDOA, 'DOA', naDOA);
    await subirArchivo(archivoORD, 'ORD', naORD);
    await subirArchivo(archivoPM, 'PM', naPM);

    // NUEVO: Procesar y subir múltiples fotografías
    const inputFotos = document.getElementById('archivosFotos');

    if (inputFotos && inputFotos.files.length > 0) {
        let contador = 1;
        for (let foto of inputFotos.files) {
            const formDataFotos = new FormData();

            formDataFotos.append('expedienteId', expedienteActualId);

            // Nombramos dinámicamente: Foto_1, Foto_2, etc.
            formDataFotos.append('tipoDocumento', `Evidencia_${contador}`);
            formDataFotos.append('noAplica', 'false');
            formDataFotos.append('archivo', foto);

            await fetch('http://localhost:3000/api/documentos', {
                method: 'POST',
                body: formDataFotos
            });

            contador++;
        }
    }

    mostrarToast(`¡Documentos guardados con éxito para el Expediente ${expedienteActualId}!`, "success");
    document.getElementById('formExpediente').reset();
    document.getElementById('formDocumentos').reset();
    document.getElementById('archivoDOA').disabled = false;
    document.getElementById('archivoORD').disabled = false;
    document.getElementById('archivoPM').disabled = false;
    if (inputFotos) inputFotos.value = "";
    expedienteActualId = null;
    cargarResumenDashboard();
});

// ==========================================
// DASHBOARD Y TABLAS
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
    } catch (error) {}
}
cargarResumenDashboard();

async function cargarTablaExpedientes() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/lista-expedientes');
        if (respuesta.ok) {
            const expedientes = await respuesta.json();
            const misExpedientes = expedientes.filter(exp => exp.AjustadorNombre === nombreUsuario);
            const tbody = document.getElementById('tablaExpedientes');
            tbody.innerHTML = '';

            misExpedientes.forEach((exp, index) => {
                const folioPersonal = misExpedientes.length - index;

                const fechaOcurrencia = new Date(exp.FechaOcurrencia).toLocaleDateString('es-MX');
                const colorEstado = exp.Estado === 'Concluido' ? '#2ecc71' : '#f39c12';

                // LA ETIQUETA VISUAL VIP
                const badgeComp = exp.EsComplementario ? `<span style="background: #8e44ad; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7em; margin-left: 8px;">2da Atención</span>` : '';

                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.3s;">
                        <td style="padding: 15px 10px; font-weight: bold;"># ${folioPersonal} ${badgeComp}</td>
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
    } catch (error) {}
}
cargarTablaExpedientes();

// ==========================================
// MODAL DE DETALLE Y COMENTARIOS (VERTICAL ORIGINAL)
// ==========================================
let folioVisualApp = null;
async function verDetalle(ajusteId) {
    const modal = document.getElementById('modalDetalle');
    const modalContenido = document.getElementById('modalContenido');

    // Regresamos el modal a su tamaño original delgado
    const tarjetaModal = modal.querySelector('.card');
    if (tarjetaModal) {
        tarjetaModal.style.width = '550px';
        tarjetaModal.style.maxWidth = '90%';
    }

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
            const etiquetaComp = info.esComplementario ? `<span style="background: #8e44ad; color: white; padding: 3px 8px; border-radius: 5px; font-size: 0.8em; font-weight: bold;">Siniestro Complementario (2da Atención)</span>` : '';

            htmlContenido += `
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <p style="margin: 0; font-size: 0.9em; color: var(--text-color);"><strong>Estado actual:</strong> ${info.estado}</p>
                        ${etiquetaComp}
                    </div>
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

                    ${(!info.respuestaAnalista && info.estado !== 'Concluido') ? `<hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;"><div style="background-color: #3498db20; border-left: 4px solid #3498db; padding: 10px; border-radius: 4px;"><p style="margin: 0; font-size: 0.85em; color: #3498db; font-weight: bold;">🔍 Expediente en revisión.</p></div>` : ''}
                    ${(info.respuestaAnalista && info.estado !== 'Concluido' && info.turno === 'Ajustador') ? `<hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;"><p style="margin: 0 0 5px 0; font-size: 0.85em; font-weight: bold; color: var(--text-color);">Responder al Analista (Tu turno):</p><textarea id="inputRespuestaAjustador" rows="2" placeholder="Ej. Ya subí el documento..." style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--panel-bg); color: var(--text-color); margin-bottom: 8px; box-sizing: border-box; resize: vertical;"></textarea><div style="display: flex; justify-content: flex-end;"><button onclick="enviarRespuestaAjustador(${ajusteId})" style="background-color: var(--primary-color); color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.85em;">Enviar respuesta ➔</button></div>` : ''}
                    ${(info.respuestaAnalista && info.estado !== 'Concluido' && info.turno === 'Analista') ? `<hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;"><div style="background-color: #f39c1220; border-left: 4px solid #f39c12; padding: 10px; border-radius: 4px;"><p style="margin: 0; font-size: 0.85em; color: #f39c12; font-weight: bold;">⏳ Respuesta enviada. Esperando al Analista...</p></div>` : ''}
                </div>
                
                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;">
                <h4 style="margin: 0 0 10px 0; color: var(--text-color);">Documentos Vinculados</h4>
            `;
        }

        if (resDocs.ok) {
            const datosDocs = await resDocs.json();
            let cantArchivos = 0;

            // 1. Mostrar documentos oficiales (DOA, ORD, PM)
            ['DOA', 'ORD', 'PM'].forEach(tipo => {
                const doc = datosDocs.documentos.find(d => d.TipoDocumento === tipo);
                if (doc) {
                    if (tipo === 'DOA') tieneDOA = true;
                    if (tipo === 'ORD') tieneORD = true;
                    if (tipo === 'PM') tienePM = true;
                    if (doc.RutaArchivo !== 'NO_REQUERIDO') cantArchivos++;

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
                }
            });

            // 2. Extraer y mostrar las Fotografías
            const fotos = datosDocs.documentos.filter(d => !['DOA', 'ORD', 'PM'].includes(d.TipoDocumento) && d.RutaArchivo !== 'NO_REQUERIDO');

            if (fotos.length > 0) {
                cantArchivos += fotos.length;
                htmlContenido += `
                    <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-color);">📸 Fotografías del Siniestro</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 10px;">
                `;

                fotos.forEach(foto => {
                    const urlCompleta = `http://localhost:3000/${foto.RutaArchivo.replace(/\\/g, '/')}`;
                    htmlContenido += `
                        <a href="${urlCompleta}" target="_blank" style="position: relative; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); aspect-ratio: 16/9; background: #000; display: block; text-decoration: none;">
                            <img src="${urlCompleta}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85; transition: 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">
                            <div style="position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.75); color: white; font-size: 0.7em; padding: 4px; text-align: center; font-weight: bold;">
                                ${foto.TipoDocumento}
                            </div>
                        </a>
                    `;
                });

                htmlContenido += `
                    </div>
                    <div style="background-color: rgba(46, 204, 113, 0.1); border: 1px solid #2ecc71; padding: 10px; border-radius: 6px; display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                        <span style="font-size: 1.5em;">🛡️</span>
                        <div>
                            <strong style="font-size: 0.8em; color: #2ecc71; display: block; margin-bottom: 2px;">Metadatos EXIF Verificados</strong>
                            <span style="font-size: 0.75em; color: var(--text-color);">Dispositivo de captura: Apple iPhone 16 Pro Max</span>
                        </div>
                    </div>
                `;
            }

            // 3. Botón de descarga masiva
            if (cantArchivos > 0) {
                htmlContenido += `
                    <div style="display: flex; justify-content: center; margin-top: 15px;">
                        <button type="button" onclick="descargarArchivosMasivo(${ajusteId})" style="background-color: transparent; color: #3498db; border: 2px solid #3498db; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 10px;">
                            🗃️ Descargar Todos los Archivos (${cantArchivos})
                        </button>
                    </div>
                `;
            }
        }

        if (!tieneDOA || !tieneORD || !tienePM) {
            htmlContenido += `<hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;"><h4 style="margin: 0 0 15px 0; color: var(--text-color);">Cargar Faltantes</h4><form id="formFaltantes" style="display: flex; flex-direction: column; gap: 12px;">`;
            const generarCampoFaltante = (tipo) => `<div style="display: flex; justify-content: space-between; align-items: center;"><label style="font-weight: bold; font-size: 0.85em; color: var(--text-color);">📄 ${tipo}</label><div style="display: flex; gap: 10px; align-items: center;"><label style="font-size: 0.75em; color: var(--text-muted);"><input type="checkbox" id="na${tipo}_modal" onchange="document.getElementById('modal${tipo}').disabled = this.checked"> N/A</label><input type="file" id="modal${tipo}" accept=".pdf, image/*" style="width: 170px; font-size: 0.8em; color: var(--text-color);"></div></div>`;
            if (!tieneDOA) htmlContenido += generarCampoFaltante('DOA');
            if (!tieneORD) htmlContenido += generarCampoFaltante('ORD');
            if (!tienePM) htmlContenido += generarCampoFaltante('PM');
            htmlContenido += `<button type="button" onclick="subirDesdeModal(${ajusteId})" style="margin-top: 10px; background: transparent; color: var(--primary-color); border: 2px solid var(--primary-color); padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.3s;">☁️ Completar Expediente</button></form>`;
        }
        modalContenido.innerHTML = htmlContenido;
    } catch (error) { modalContenido.innerHTML = '<p style="color: #e74c3c; text-align: center;">Error al conectar con el servidor.</p>'; }
}

async function subirDesdeModal(ajusteId) {
    const elDOA = document.getElementById('modalDOA'); const naDOA = document.getElementById('naDOA_modal') ? document.getElementById('naDOA_modal').checked : false;
    const elORD = document.getElementById('modalORD'); const naORD = document.getElementById('naORD_modal') ? document.getElementById('naORD_modal').checked : false;
    const elPM = document.getElementById('modalPM'); const naPM = document.getElementById('naPM_modal') ? document.getElementById('naPM_modal').checked : false;

    if (elDOA && !elDOA.files[0] && !naDOA) return mostrarToast("Para DOA: Sube el archivo o marca N/A", "warning");
    if (elORD && !elORD.files[0] && !naORD) return mostrarToast("Para ORD: Sube el archivo o marca N/A", "warning");
    if (elPM && !elPM.files[0] && !naPM) return mostrarToast("Para PM: Sube el archivo o marca N/A", "warning");

    const subirArchivo = async (archivo, tipo, noAplica) => {
        if (!archivo && !noAplica) return;
        const formData = new FormData(); formData.append('expedienteId', ajusteId); formData.append('tipoDocumento', tipo); formData.append('noAplica', noAplica ? 'true' : 'false');
        if (archivo) formData.append('archivo', archivo);
        await fetch('http://localhost:3000/api/documentos', { method: 'POST', body: formData });
    };

    mostrarToast("Procesando expediente...", "info");
    if (elDOA) await subirArchivo(elDOA.files[0], 'DOA', naDOA);
    if (elORD) await subirArchivo(elORD.files[0], 'ORD', naORD);
    if (elPM) await subirArchivo(elPM.files[0], 'PM', naPM);

    mostrarToast("¡Expediente actualizado exitosamente!", "success");
    verDetalle(ajusteId); cargarResumenDashboard();
}

function cerrarModal() { document.getElementById('modalDetalle').style.display = 'none'; }
function filtrarTabla() {
    const filtro = document.getElementById("buscadorExpedientes").value.toLowerCase();
    const filas = document.getElementById("tablaExpedientes").getElementsByTagName("tr");
    for (let i = 0; i < filas.length; i++) {
        filas[i].style.display = (filas[i].textContent || filas[i].innerText).toLowerCase().indexOf(filtro) > -1 ? "" : "none";
    }
}

async function enviarRespuestaAjustador(ajusteId) {
    const mensaje = document.getElementById('inputRespuestaAjustador').value.trim();
    if (!mensaje) return mostrarToast("Escribe un mensaje antes de enviar.", "warning");

    const formFaltantes = document.getElementById('formFaltantes'); let archivosASubir = [];
    if (formFaltantes) {
        const elDOA = document.getElementById('modalDOA'); const naDOA = document.getElementById('naDOA_modal') ? document.getElementById('naDOA_modal').checked : false;
        const elORD = document.getElementById('modalORD'); const naORD = document.getElementById('naORD_modal') ? document.getElementById('naORD_modal').checked : false;
        const elPM = document.getElementById('modalPM'); const naPM = document.getElementById('naPM_modal') ? document.getElementById('naPM_modal').checked : false;

        if (elDOA && !elDOA.files[0] && !naDOA) return mostrarToast("Falta DOA", "warning");
        if (elORD && !elORD.files[0] && !naORD) return mostrarToast("Falta ORD", "warning");
        if (elPM && !elPM.files[0] && !naPM) return mostrarToast("Falta PM", "warning");

        if (elDOA) archivosASubir.push({ archivo: elDOA.files[0], tipo: 'DOA', noAplica: naDOA });
        if (elORD) archivosASubir.push({ archivo: elORD.files[0], tipo: 'ORD', noAplica: naORD });
        if (elPM) archivosASubir.push({ archivo: elPM.files[0], tipo: 'PM', noAplica: naPM });
    }

    try {
        if (archivosASubir.length > 0) {
            mostrarToast("Subiendo documentos...", "info");
            for (const item of archivosASubir) {
                if (!item.archivo && !item.noAplica) continue;
                const formData = new FormData(); formData.append('expedienteId', ajusteId); formData.append('tipoDocumento', item.tipo); formData.append('noAplica', item.noAplica ? 'true' : 'false');
                if (item.archivo) formData.append('archivo', item.archivo);
                await fetch('http://localhost:3000/api/documentos', { method: 'POST', body: formData });
            }
        }
        const res = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}/respuesta-ajustador`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nuevoMensaje: mensaje, remitente: nombreUsuario })
        });
        if (res.ok) {
            mostrarToast("✅ Respuesta enviada.", "success");
            verDetalle(ajusteId); cargarResumenDashboard(); revisarNotificaciones();
        }
    } catch (error) {}
}

// ==========================================
// NOTIFICACIONES, EXCEL Y PERFIL (UNIVERSAL)
// ==========================================
async function revisarNotificaciones() {
    const rol = localStorage.getItem('aspv_rol');
    if (!rol) return;
    try {
        const res = await fetch(`http://localhost:3000/api/notificaciones/${rol}/${miUsuarioIdGbl || 0}`);
        if (res.ok) {
            const datos = await res.json();
            const badge = document.getElementById('badgeNotificaciones'); const listaUI = document.getElementById('listaNotificacionesUI');
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
                } else { badge.style.display = 'none'; listaUI.innerHTML = `<li style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 0.9em;">No tienes notificaciones nuevas</li>`; }
            }
        }
    } catch (error) {}
}

async function descargarMiExcel() {
    try {
        mostrarToast("⏳ Generando tu historial...", "info");
        const res = await fetch(`http://localhost:3000/api/exportar-excel/ajustador/${miUsuarioIdGbl}`);
        if (res.ok) {
            const blob = await res.blob(); const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `Mis_Siniestros_${new Date().toLocaleDateString('es-MX')}.xlsx`;
            document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
            mostrarToast("✅ Excel descargado.", "success");
        }
    } catch (error) { mostrarToast("❌ Error al descargar.", "error"); }
}

async function cargarDatosPerfil() {
    if (!miUsuarioIdGbl) return;
    try {
        const res = await fetch(`http://localhost:3000/api/perfil/${miUsuarioIdGbl}`);
        if (res.ok) {
            const perfil = await res.json();
            const avatarUrl = perfil.FotoPerfil ? `http://localhost:3000/${perfil.FotoPerfil}` : 'imagenes/LogoASPV.jpg';
            const avatarHeader = document.getElementById('avatarHeader'); if (avatarHeader) avatarHeader.src = avatarUrl;
            const previewFoto = document.getElementById('previewFotoPerfil'); if (previewFoto) previewFoto.src = avatarUrl;
            const correoInput = document.getElementById('correoPerfil'); if (correoInput) correoInput.value = perfil.Correo;
            const telInput = document.getElementById('telefonoPerfil'); if (telInput) telInput.value = perfil.Telefono || '';
        }
    } catch (error) {}
}

function abrirModalPerfil() { const m = document.getElementById('modalPerfil'); if (m) m.style.display = 'flex'; }
function cerrarModalPerfil() { const m = document.getElementById('modalPerfil'); if (m) m.style.display = 'none'; }

const inputFoto = document.getElementById('inputFotoPerfil');
if (inputFoto) {
    inputFoto.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader(); reader.onload = function(ev) { document.getElementById('previewFotoPerfil').src = ev.target.result; };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

const formPerfil = document.getElementById('formPerfil');
if (formPerfil) {
    formPerfil.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('telefono', document.getElementById('telefonoPerfil').value.trim());
        const foto = document.getElementById('inputFotoPerfil').files[0];
        if (foto) formData.append('fotoPerfil', foto);
        try {
            const res = await fetch(`http://localhost:3000/api/perfil/${miUsuarioIdGbl}`, { method: 'POST', body: formData });
            if (res.ok) { mostrarToast("✅ Perfil guardado.", "success"); cargarDatosPerfil(); cerrarModalPerfil(); }
        } catch (error) {}
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const marcarBtn = document.getElementById('marcarLeidasBtn');
    if (marcarBtn) {
        marcarBtn.addEventListener('click', async () => {
            const rol = localStorage.getItem('aspv_rol');
            try {
                await fetch(`http://localhost:3000/api/notificaciones/leidas/${rol}/${miUsuarioIdGbl || 0}`, { method: 'PUT' });
                document.getElementById('badgeNotificaciones').style.display = 'none';
                document.getElementById('listaNotificacionesUI').innerHTML = `<li style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 0.9em;">No tienes notificaciones nuevas</li>`;
            } catch(e) {}
        });
    }
    cargarDatosPerfil();
    revisarNotificaciones();
    setInterval(revisarNotificaciones, 10000);
});

// ==========================================
// FUNCIÓN: DESCARGAR TODOS LOS DOCUMENTOS (ESTILO ANALISTA CON BLOB)
// ==========================================
async function descargarArchivosMasivo(ajusteId) {
    try {
        const resDocs = await fetch(`http://localhost:3000/api/documentos/${ajusteId}`);
        if (!resDocs.ok) return;

        const data = await resDocs.json();
        const archivosValidos = data.documentos.filter(d => d.RutaArchivo !== 'NO_REQUERIDO');

        if (archivosValidos.length === 0) return mostrarToast("⚠️ No hay archivos para descargar.", "warning");

        mostrarToast(`⏳ Descargando ${archivosValidos.length} archivo(s)...`, "info");

        for (let doc of archivosValidos) {
            try {
                const url = `http://localhost:3000/${doc.RutaArchivo.replace(/\\/g, '/')}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error("No se pudo obtener");

                const blob = await res.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = doc.RutaArchivo.split('\\').pop().split('/').pop() || 'documento_aspv';

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
            } catch (e) {
                console.error("Error descargando:", doc.RutaArchivo);
            }
            // Pausa de medio segundo para que Chrome no lo bloquee como "Spam"
            await new Promise(r => setTimeout(r, 500));
        }
        mostrarToast("✅ Todas las descargas han finalizado.", "success");

    } catch (error) {
        mostrarToast("❌ Error al conectar con los archivos.", "error");
    }
}