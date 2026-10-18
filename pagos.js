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

// ==========================================
// SEGURIDAD Y ACCESO
// ==========================================
const rolUsuario = localStorage.getItem('aspv_rol');
const nombreUsuario = localStorage.getItem('aspv_nombre');

if (!rolUsuario || (rolUsuario !== 'Admin' && rolUsuario !== 'Analista de Pagos')) {
    window.location.href = 'login.html';
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// ==========================================
// DICCIONARIO DINÁMICO DE TARIFAS
// ==========================================
const TARIFAS_MUNICIPIO = {
    "merida": 230,
    "valladolid": 550
    // "cancun": 600, <-- Ejemplo para agregar más tarde
    // "tijuana": 450
};
const TARIFA_BASE = 230; // Tarifa por defecto si el municipio no está en la lista

function obtenerTarifa(lugarString) {
    if (!lugarString) return TARIFA_BASE;
    // Extraemos el municipio de "Municipio, Estado" y quitamos acentos
    const municipio = lugarString.split(',')[0].trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    return TARIFAS_MUNICIPIO[municipio] || TARIFA_BASE;
}

let baseExpedientes = []; // Guardamos la BD aquí

// ==========================================
// MOTOR DE QUINCENAS Y FECHAS
// ==========================================
function obtenerNombreQuincena(fechaString) {
    if (!fechaString) return "Fecha Desconocida";

    // Evitamos problemas de zona horaria aislando YYYY-MM-DD
    const soloFecha = fechaString.split('T')[0];
    const partes = soloFecha.split('-');
    if (partes.length !== 3) return "Fecha Inválida";

    const anio = partes[0];
    const mesNum = parseInt(partes[1], 10) - 1; // getMonth va de 0 a 11
    const dia = parseInt(partes[2], 10);

    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const nombreMes = meses[mesNum];
    const q = dia <= 15 ? '1ra' : '2da';

    return `${q} Quincena de ${nombreMes} ${anio}`;
}

// Función para el botón "Ver Todo"
function limpiarFiltros() {
    document.getElementById('filtroMes').value = '';
    document.getElementById('filtroQuincena').value = 'Todas';
    document.getElementById('buscadorPagos').value = '';
    document.getElementById('filtroEstadoPagos').value = '';
    cargarTablaPagos();
    filtrarCajasVisuales();
}

// ==========================================
// ACCESIBILIDAD
// ==========================================
function aplicarPreferencias() {
    const temaGuardado = localStorage.getItem('aspv_tema');
    const textoGuardado = localStorage.getItem('aspv_texto');
    if (temaGuardado === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    if (textoGuardado) document.documentElement.setAttribute('data-text', textoGuardado);
}
aplicarPreferencias();

function cambiarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema === 'dark' ? 'dark' : '');
    localStorage.setItem('aspv_tema', tema);
}
function cambiarTexto(tamano) {
    document.documentElement.setAttribute('data-text', tamano);
    localStorage.setItem('aspv_texto', tamano);
}

// ==========================================
// LÓGICA DE PAGOS Y NÓMINA (CON FILTRO DUAL)
// ==========================================
async function descargarExpedientesDesdeBD() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/lista-expedientes');
        if (respuesta.ok) {
            baseExpedientes = await respuesta.json();
            cargarTablaPagos(); // Dispara la tabla por primera vez
        }
    } catch (error) { console.error("Error al descargar expedientes:", error); }
}

function cargarTablaPagos() {
    const contenedor = document.getElementById('contenedorTablasPagos');
    if (!contenedor) return;

    const mesSeleccionado = document.getElementById('filtroMes').value;
    const quincenaSeleccionada = document.getElementById('filtroQuincena').value;

    // 1. Filtrar los datos en base a las opciones elegidas
    let expedientesFiltrados = baseExpedientes.filter(exp => {
        if (!exp.FechaOcurrencia) return false;

        const soloFecha = exp.FechaOcurrencia.split('T')[0];
        const [expYear, expMonth, expDayStr] = soloFecha.split('-');
        const expDay = parseInt(expDayStr, 10);

        if (mesSeleccionado) {
            const [yearSel, monthSel] = mesSeleccionado.split('-');
            if (expYear !== yearSel || expMonth !== monthSel) return false;
        }

        if (quincenaSeleccionada === '1ra' && expDay > 15) return false;
        if (quincenaSeleccionada === '2da' && expDay <= 15) return false;

        return true;
    });

    // 2. Actualizar las Tarjetas (KPIs) con los datos filtrados
    const activos = expedientesFiltrados.filter(exp => exp.Estado !== 'Concluido').length;
    const concluidosList = expedientesFiltrados.filter(exp => exp.Estado === 'Concluido');
    const cantConcluidos = concluidosList.length;

    // Cálculo dinámico de Nómina Global sumando la tarifa de cada lugar
    let nominaGlobal = 0;
    concluidosList.forEach(exp => {
        nominaGlobal += obtenerTarifa(exp.Lugar);
    });

    document.getElementById('kpiActivos').innerText = activos;
    document.getElementById('kpiConcluidos').innerText = cantConcluidos;
    document.getElementById('kpiTotalPagos').innerText = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(nominaGlobal);

    // 3. Pintar la tabla
    contenedor.innerHTML = '';

    const agrupados = expedientesFiltrados.reduce((acc, exp) => {
        const ajustador = exp.AjustadorNombre || 'Sin asignar';
        if (!acc[ajustador]) acc[ajustador] = [];
        acc[ajustador].push(exp);
        return acc;
    }, {});

    for (const [ajustador, lista] of Object.entries(agrupados)) {
        const totalSiniestros = lista.length;
        const listaConcluidos = lista.filter(e => e.Estado === 'Concluido');
        const cantidadConcluidos = listaConcluidos.length;

        // Cálculo dinámico para la quincena de este ajustador en específico
        let totalQuincena = 0;
        listaConcluidos.forEach(exp => {
            totalQuincena += obtenerTarifa(exp.Lugar);
        });

        const totalQuincenaFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalQuincena);

        let htmlTabla = `
            <div class="bloque-ajustador">
                <div class="header-ajustador">
                    <h4 style="margin: 0; color: var(--primary-color); font-size: 1.05em;">
                        📁 Siniestros de: ${ajustador}
                    </h4>
                    <div class="resumen-nomina-bar">
                        <span>📋 Total: <strong>${totalSiniestros}</strong></span>
                        <span>✅ Concluidos: <strong style="color: #2ecc71;">${cantidadConcluidos}</strong></span>
                        <span class="resumen-nomina-total">
                            💰 Pago Generado: <strong style="color: #2ecc71; font-size: 1.15em;">${totalQuincenaFmt}</strong>
                            <small style="color: var(--text-muted); display: block; font-size: 0.8em;">(Basado en zonas)</small>
                        </span>
                    </div>
                </div>
                <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.9em; margin-bottom: 10px;">
                    <thead>
                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                        <th style="padding: 12px 10px;">ID Siniestro</th>
                        <th style="padding: 12px 10px;">Lugar</th>
                        <th style="padding: 12px 10px;">Seguro</th>
                        <th style="padding: 12px 10px;">Fecha Ocurrencia</th>
                        <th style="padding: 12px 10px;">Quincena Asignada</th>
                        <th style="padding: 12px 10px;">Estado</th>
                        <th style="padding: 12px 10px;">Auditoría</th>
                    </tr>
                    </thead>
                    <tbody>
        `;

        lista.forEach((exp, index) => {
            const folioPersonal = exp.AjusteID || (index + 1);

            const partesFecha = exp.FechaOcurrencia.split('T')[0].split('-');
            const fechaMx = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;

            const etiquetaQuincena = obtenerNombreQuincena(exp.FechaOcurrencia);
            let colorEstado = exp.Estado === 'Concluido' ? '#2ecc71' : (exp.Estado === 'En Análisis' ? '#f39c12' : '#3498db');

            htmlTabla += `
                <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.3s;">
                    <td style="padding: 12px 10px; font-weight: bold;">SIN-${folioPersonal.toString().padStart(3, '0')}</td>
                    <td style="padding: 12px 10px;">${exp.Lugar || 'N/A'}</td>
                    <td style="padding: 12px 10px;">${exp.Seguro || 'N/A'}</td>
                    <td style="padding: 12px 10px; color: var(--text-muted);">${fechaMx}</td>
                    <td style="padding: 12px 10px; color: var(--text-muted); font-size: 0.8em; font-style: italic;">${etiquetaQuincena}</td>
                    <td style="padding: 12px 10px;">
                        <span style="background-color: ${colorEstado}20; color: ${colorEstado}; padding: 3px 10px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">
                            ${exp.Estado}
                        </span>
                    </td>
                    <td style="padding: 12px 10px;">
                        <button onclick="abrirModalPagos(${exp.AjusteID}, ${folioPersonal})" style="background: transparent; color: var(--primary-color); border: 1px solid var(--primary-color); padding: 6px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.85em;">
                            👁️ Ver Documentos
                        </button>
                    </td>
                </tr>
            `;
        });

        htmlTabla += `</tbody></table></div>`;
        contenedor.innerHTML += htmlTabla;
    }
}

// ==========================================
// 3. MODAL DE SOLO LECTURA (ACTUALIZADO A CSS GRID)
// ==========================================
async function abrirModalPagos(ajusteId, folioPersonal) {
    const modal = document.getElementById('modalPagos');
    const modalContenido = document.getElementById('modalPagosContenido');
    const tarjetaModal = modal.querySelector('.card');

    tarjetaModal.style.width = '1000px';
    tarjetaModal.style.maxWidth = '95%';

    document.getElementById('modalPagosExpId').innerText = `SIN-${folioPersonal.toString().padStart(3, '0')}`;
    modal.style.display = 'flex';
    modalContenido.innerHTML = '<p style="text-align: center; color: var(--primary-color);">Cargando auditoría financiera...</p>';

    try {
        const resDocs = await fetch(`http://localhost:3000/api/documentos/${ajusteId}`);
        const resInfo = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}`);

        if (resInfo.ok && resDocs.ok) {
            const info = await resInfo.json();
            const datosDocs = await resDocs.json();
            const esConcluido = (info.estado === 'Concluido');
            let tarifaIndividual = obtenerTarifa(info.lugar);
            let comisionFmt = esConcluido ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(tarifaIndividual) : "$0.00 (Pendiente)";

            let htmlArchivos = '';
            let cantArchivos = 0;

            datosDocs.documentos.forEach(doc => {
                if (doc.RutaArchivo !== 'NO_REQUERIDO') cantArchivos++;
                const nombreArchivo = doc.RutaArchivo === 'NO_REQUERIDO' ? '<span style="color: var(--warning-color); font-style: italic;">No requerido</span>' : doc.RutaArchivo.split('\\').pop().split('/').pop();
                htmlArchivos += `
                    <div style="background: var(--bg-color); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: var(--primary-color);">${doc.TipoDocumento}</strong>
                        <span style="color: var(--text-muted); font-size: 0.75em;">${nombreArchivo}</span>
                    </div>`;
            });

            modalContenido.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px;">
                    <!-- COLUMNA IZQ: Info Financiera -->
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <div style="background: var(--bg-color); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h4 style="margin: 0 0 5px 0; color: var(--text-color);">Liquidación del Ajustador</h4>
                                <span style="font-size: 0.8em; color: var(--text-muted);">${info.lugar} • ${obtenerNombreQuincena(info.fechaOcurrencia)}</span>
                            </div>
                            <strong style="font-size: 1.5em; color: ${esConcluido ? 'var(--success-color)' : 'var(--text-muted)'};">${comisionFmt}</strong>
                        </div>
                        
                        <div style="background: var(--bg-color); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); flex: 1;">
                            <h4 style="margin: 0 0 10px 0; color: var(--text-color);">Estado del Trámite</h4>
                            <p style="margin: 0 0 15px 0; font-size: 1em; color: var(--text-color); font-weight: bold;">${info.estado}</p>
                            <p style="margin: 0; font-size: 0.85em; color: var(--text-muted); font-style: italic;">"${info.relatoria || 'Sin relatoría'}"</p>
                        </div>
                    </div>

                    <!-- COLUMNA DER: Auditoría Docs -->
                    <div style="background: var(--bg-color); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h4 style="margin: 0; color: var(--text-color);">Documentos Validados</h4>
                            ${cantArchivos > 0 ? `<button onclick="descargarArchivosMasivo(${ajusteId})" style="background: transparent; color: var(--primary-color); border: none; cursor: pointer; font-size: 0.8em; font-weight: bold;">📥 Descargar(${cantArchivos})</button>` : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${htmlArchivos}
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) { modalContenido.innerHTML = '<p style="color: var(--danger-color);">Error de conexión.</p>'; }
}

function cerrarModalPagos() {
    document.getElementById('modalPagos').style.display = 'none';
}

function filtrarCajasVisuales() {
    const textoBuscador = document.getElementById("buscadorPagos").value.toLowerCase();
    const estadoSeleccionado = document.getElementById("filtroEstadoPagos").value.toLowerCase();
    const contenedor = document.getElementById("contenedorTablasPagos");
    if (!contenedor) return;

    const bloques = contenedor.getElementsByClassName("bloque-ajustador");

    for (let b = 0; b < bloques.length; b++) {
        const tabla = bloques[b].getElementsByTagName("table")[0];
        const filas = tabla.getElementsByTagName("tr");
        let filasVisibles = 0;

        for (let i = 1; i < filas.length; i++) {
            const textoFila = filas[i].textContent || filas[i].innerText;
            const columnaEstado = filas[i].getElementsByTagName("span")[0];
            const textoEstado = columnaEstado ? columnaEstado.textContent.toLowerCase() : "";

            if (textoFila.toLowerCase().indexOf(textoBuscador) > -1 && (estadoSeleccionado === "" || textoEstado.indexOf(estadoSeleccionado) > -1)) {
                filas[i].style.display = "";
                filasVisibles++;
            } else {
                filas[i].style.display = "none";
            }
        }
        bloques[b].style.display = filasVisibles === 0 ? "none" : "";
    }
}

async function exportarExcel() {
    try {
        mostrarToast("⏳ Descargando reporte global...", "info");
        const res = await fetch('http://localhost:3000/api/exportar-excel');
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Reporte_Pagos_ASPV_${new Date().toLocaleDateString('es-MX')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            mostrarToast("✅ Excel descargado.", "success");
        }
    } catch (error) { mostrarToast("❌ Error al descargar.", "error"); }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('nombreUsuarioUI').innerText = `Hola, ${nombreUsuario}`;
    descargarExpedientesDesdeBD();
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

// ==========================================
// FUNCIÓN: DESCARGA MASIVA (ESTILO ANALISTA CON BLOB)
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