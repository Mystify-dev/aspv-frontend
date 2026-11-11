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
// VARIABLES GLOBALES DE BASE DE DATOS
// ==========================================
let baseUsuarios = [];
let baseExpedientes = [];

const fmtMXN = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor) || 0);

// Calcula cuánto vale un siniestro según las tarifas del ajustador en la BD
function calcularPagoSiniestro(exp) {
    const ajUsuario = baseUsuarios.find(u => u.UsuarioID === exp.AjustadorID || u.Nombre === exp.AjustadorNombre);

    const local = ajUsuario && ajUsuario.CostoLocal !== null ? parseFloat(ajUsuario.CostoLocal) : (parseFloat(exp.CostoLocal) || 230);
    const foraneo = ajUsuario && ajUsuario.CostoForaneo !== null ? parseFloat(ajUsuario.CostoForaneo) : (parseFloat(exp.CostoForaneo) || 230);
    const kmTarifa = ajUsuario && ajUsuario.CostoKm !== null ? parseFloat(ajUsuario.CostoKm) : (parseFloat(exp.CostoKm) || 3.00);
    const kmInbursaTarifa = ajUsuario && ajUsuario.CostoKmInbursa !== null ? parseFloat(ajUsuario.CostoKmInbursa) : (parseFloat(exp.CostoKmInbursa) || 3.00);

    const tipoCob = (exp.TipoCobertura || "Local").toLowerCase();
    const esForaneo = tipoCob.includes("foraneo") || tipoCob.includes("foráneo") || tipoCob.includes("carretero");
    const seguro = (exp.Seguro || "").toUpperCase();

    let totalPago = esForaneo ? foraneo : local;
    const kms = parseFloat(exp.Kilometros) || 0;
    if (kms > 0) {
        const precioKm = seguro.includes("INBURSA") ? kmInbursaTarifa : kmTarifa;
        totalPago += (kms * precioKm);
    }
    return totalPago;
}

// ==========================================
// MOTOR DE QUINCENAS Y FECHAS
// ==========================================
function obtenerNombreQuincena(fechaString) {
    if (!fechaString) return "Fecha Desconocida";
    const soloFecha = fechaString.split('T')[0];
    const partes = soloFecha.split('-');
    if (partes.length !== 3) return "Fecha Inválida";

    const anio = partes[0];
    const mesNum = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);

    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return `${dia <= 15 ? '1ra' : '2da'} Quincena de ${meses[mesNum]} ${anio}`;
}

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
// DESCARGA DE DATOS DESDE BD (USUARIOS + EXPEDIENTES)
// ==========================================
async function descargarDatosDesdeBD() {
    try {
        const [resUsuarios, resExpedientes] = await Promise.all([
            fetch('http://localhost:3000/api/usuarios'),
            fetch('http://localhost:3000/api/lista-expedientes')
        ]);

        if (resUsuarios.ok) baseUsuarios = await resUsuarios.json();
        if (resExpedientes.ok) baseExpedientes = await resExpedientes.json();

        cargarTablaPagos();
    } catch (error) {
        console.error("Error al sincronizar datos de nómina:", error);
    }
}

function cargarTablaPagos() {
    const contenedor = document.getElementById('contenedorTablasPagos');
    if (!contenedor) return;

    const mesSeleccionado = document.getElementById('filtroMes').value;
    const quincenaSeleccionada = document.getElementById('filtroQuincena').value;

    // 1. Filtrar Expedientes por Mes y Quincena
    let expedientesFiltrados = baseExpedientes.filter(exp => {
        if (!exp.FechaOcurrencia) return false;
        const [expYear, expMonth, expDayStr] = exp.FechaOcurrencia.split('T')[0].split('-');
        const expDay = parseInt(expDayStr, 10);

        if (mesSeleccionado) {
            const [yearSel, monthSel] = mesSeleccionado.split('-');
            if (expYear !== yearSel || expMonth !== monthSel) return false;
        }

        if (quincenaSeleccionada === '1ra' && expDay > 15) return false;
        if (quincenaSeleccionada === '2da' && expDay <= 15) return false;

        return true;
    });

    // 2. Separar Personal Fijo vs Ajustadores desde la Base de Datos
    const empleadosFijos = baseUsuarios.filter(u => u.Rol !== 'Ajustador');
    const ajustadoresLista = baseUsuarios.filter(u => u.Rol === 'Ajustador');

    // Multiplicador: 0.5 si es 1ra o 2da Quincena, 1 si es Todo el Mes
    const multiplicadorFijo = (quincenaSeleccionada === 'Todas') ? 1 : 0.5;

    let totalNominaFija = 0;
    empleadosFijos.forEach(emp => {
        totalNominaFija += ((parseFloat(emp.SueldoMensual) || 0) * multiplicadorFijo);
    });

    const activos = expedientesFiltrados.filter(exp => exp.Estado !== 'Concluido').length;
    const concluidosList = expedientesFiltrados.filter(exp => exp.Estado === 'Concluido');

    let totalNominaVariable = 0;
    concluidosList.forEach(exp => {
        totalNominaVariable += calcularPagoSiniestro(exp);
    });

    const nominaGlobal = totalNominaFija + totalNominaVariable;

    document.getElementById('kpiActivos').innerText = activos;
    document.getElementById('kpiConcluidos').innerText = concluidosList.length;
    document.getElementById('kpiTotalPagos').innerText = fmtMXN(nominaGlobal);

    contenedor.innerHTML = '';

    // ====================================================
    // TABLA 1: PERSONAL ADMINISTRATIVO (SUELDO FIJO)
    // ====================================================
    const lblPeriodoFijo = (quincenaSeleccionada === 'Todas') ? '(Mes Completo - 100%)' : `(${quincenaSeleccionada} Quincena - 50%)`;
    let htmlFijos = `
        <div class="bloque-ajustador" style="margin-bottom: 30px;">
            <div class="header-ajustador" style="background-color: #002060; border: 1px solid #1a3a78;">
                <h4 style="margin: 0; color: white; font-size: 1.05em;">
                    🏢 Personal Administrativo y Oficina (Sueldo Fijo) <span style="font-size: 0.8em; color: #bdc3c7;">${lblPeriodoFijo}</span>
                </h4>
                <div class="resumen-nomina-bar">
                    <span class="resumen-nomina-total">
                        💰 Total Nómina Fija: <strong style="color: #2ecc71; font-size: 1.15em;">${fmtMXN(totalNominaFija)}</strong>
                    </span>
                </div>
            </div>
            <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.9em; background: var(--bg-color);">
                <thead>
                <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); background: rgba(0,0,0,0.2);">
                    <th style="padding: 12px 10px;">NOMBRE DEL EMPLEADO</th>
                    <th style="padding: 12px 10px;">PUESTO</th>
                    <th style="padding: 12px 10px;">CIUDAD</th>
                    <th style="padding: 12px 10px; text-align: right;">SUELDO MENSUAL BASE</th>
                    <th style="padding: 12px 10px; text-align: right; color: var(--primary-color);">PAGO CALCULADO</th>
                    <th style="padding: 12px 10px; text-align: center;">CONFIGURAR</th>
                </tr>
                </thead>
                <tbody>
    `;

    empleadosFijos.forEach(emp => {
        const sueldoBase = parseFloat(emp.SueldoMensual) || 0;
        const pagoPeriodo = sueldoBase * multiplicadorFijo;
        const puestoTxt = (emp.Puesto || emp.Rol || '').toUpperCase();
        const ciudadTxt = (emp.Ciudad || 'MÉRIDA').toUpperCase();

        htmlFijos += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px 10px; font-weight: bold;">${emp.Nombre.toUpperCase()}</td>
                <td style="padding: 12px 10px; color: var(--text-muted);">${puestoTxt}</td>
                <td style="padding: 12px 10px;">${ciudadTxt}</td>
                <td style="padding: 12px 10px; text-align: right; color: var(--text-muted);">${sueldoBase > 0 ? fmtMXN(sueldoBase) : '<span style="color:#f39c12;">Sin asignar ($0.00)</span>'}</td>
                <td style="padding: 12px 10px; text-align: right; font-weight: bold; color: #2ecc71;">${fmtMXN(pagoPeriodo)}</td>
                <td style="padding: 12px 10px; text-align: center;">
                    <button onclick="abrirModalNomina(${emp.UsuarioID})" style="background: transparent; color: #f39c12; border: 1px solid #f39c12; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8em; font-weight: bold;">
                        ✏️ Asignar Sueldo
                    </button>
                </td>
            </tr>
        `;
    });

    htmlFijos += `</tbody></table></div>`;
    contenedor.innerHTML += htmlFijos;

    // ====================================================
    // TABLA 2: TABULADOR Y RESUMEN DE AJUSTADORES (COMO TU EXCEL)
    // ====================================================
    let htmlTabuladorAjustadores = `
        <div class="bloque-ajustador" style="margin-bottom: 35px;">
            <div class="header-ajustador" style="background-color: #002060; border: 1px solid #1a3a78;">
                <h4 style="margin: 0; color: white; font-size: 1.05em;">
                    🚗 Tabulador Oficial y Resumen de Ajustadores
                </h4>
                <div class="resumen-nomina-bar">
                    <span class="resumen-nomina-total">
                        💰 Total Comisiones Ajustadores: <strong style="color: #2ecc71; font-size: 1.15em;">${fmtMXN(totalNominaVariable)}</strong>
                    </span>
                </div>
            </div>
            <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.88em; background: var(--bg-color);">
                <thead>
                <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); background: rgba(0,0,0,0.2);">
                    <th style="padding: 12px 8px;">NOMBRE DEL EMPLEADO</th>
                    <th style="padding: 12px 8px;">PUESTO</th>
                    <th style="padding: 12px 8px;">CIUDAD</th>
                    <th style="padding: 12px 8px; text-align: right;">COSTO ATENCIÓN LOCAL</th>
                    <th style="padding: 12px 8px; text-align: right;">COSTO ATENCIÓN FORÁNEO</th>
                    <th style="padding: 12px 8px; text-align: right;">COSTO POR KM</th>
                    <th style="padding: 12px 8px; text-align: right;">COSTO KM INBURSA</th>
                    <th style="padding: 12px 8px; text-align: center;">CONCLUIDOS</th>
                    <th style="padding: 12px 8px; text-align: right; color: var(--primary-color);">PAGO GENERADO</th>
                    <th style="padding: 12px 8px; text-align: center;">TARIFAS</th>
                </tr>
                </thead>
                <tbody>
    `;

    ajustadoresLista.forEach(aj => {
        const misSiniestrosConcluidos = concluidosList.filter(e => e.AjustadorID === aj.UsuarioID || e.AjustadorNombre === aj.Nombre);
        let sumaComisiones = 0;
        misSiniestrosConcluidos.forEach(exp => { sumaComisiones += calcularPagoSiniestro(exp); });

        const cLocal = parseFloat(aj.CostoLocal) || 0;
        const cForaneo = parseFloat(aj.CostoForaneo) || 0;
        const cKm = parseFloat(aj.CostoKm) || 0;
        const cKmInb = parseFloat(aj.CostoKmInbursa) || 0;

        htmlTabuladorAjustadores += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px 8px; font-weight: bold;">${aj.Nombre.toUpperCase()}</td>
                <td style="padding: 12px 8px; color: var(--text-muted);">${(aj.Puesto || 'AJUSTADOR').toUpperCase()}</td>
                <td style="padding: 12px 8px;">${(aj.Ciudad || 'MÉRIDA').toUpperCase()}</td>
                <td style="padding: 12px 8px; text-align: right;">${fmtMXN(cLocal)}</td>
                <td style="padding: 12px 8px; text-align: right;">${fmtMXN(cForaneo)}</td>
                <td style="padding: 12px 8px; text-align: right;">${cKm > 0 ? fmtMXN(cKm) : '$ -'}</td>
                <td style="padding: 12px 8px; text-align: right;">${cKmInb > 0 ? fmtMXN(cKmInb) : '$ -'}</td>
                <td style="padding: 12px 8px; text-align: center; font-weight: bold; color: #2ecc71;">${misSiniestrosConcluidos.length}</td>
                <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #2ecc71;">${fmtMXN(sumaComisiones)}</td>
                <td style="padding: 12px 8px; text-align: center;">
                    <button onclick="abrirModalNomina(${aj.UsuarioID})" style="background: transparent; color: var(--primary-color); border: 1px solid var(--primary-color); padding: 4px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8em; font-weight: bold;">
                        ✏️ Tarifas
                    </button>
                </td>
            </tr>
        `;
    });

    htmlTabuladorAjustadores += `</tbody></table></div>`;
    contenedor.innerHTML += htmlTabuladorAjustadores;

    // ====================================================
    // TABLA 3: DESGLOSE DETALLADO DE EXPEDIENTES POR AJUSTADOR
    // ====================================================
    const agrupados = expedientesFiltrados.reduce((acc, exp) => {
        const ajustador = exp.AjustadorNombre || 'Sin asignar';
        if (!acc[ajustador]) acc[ajustador] = [];
        acc[ajustador].push(exp);
        return acc;
    }, {});

    for (const [ajustador, lista] of Object.entries(agrupados)) {
        const totalSiniestros = lista.length;
        const listaConcluidos = lista.filter(e => e.Estado === 'Concluido');

        let totalQuincena = 0;
        listaConcluidos.forEach(exp => { totalQuincena += calcularPagoSiniestro(exp); });

        const ajObj = baseUsuarios.find(u => u.Nombre === ajustador);
        const cLocal = ajObj ? (parseFloat(ajObj.CostoLocal) || 230) : 230;
        const cForaneo = ajObj ? (parseFloat(ajObj.CostoForaneo) || 230) : 230;
        const cKm = ajObj ? (parseFloat(ajObj.CostoKm) || 3) : 3;

        let htmlTabla = `
            <div class="bloque-ajustador detalle-expedientes-ajustador">
                <div class="header-ajustador">
                    <div>
                        <h4 style="margin: 0; color: var(--primary-color); font-size: 1.05em;">📁 Siniestros de: ${ajustador}</h4>
                        <span style="font-size: 0.75em; color: var(--text-muted);">
                            Tarifas en BD: Local ${fmtMXN(cLocal)} | Foráneo ${fmtMXN(cForaneo)} | KM ${fmtMXN(cKm)}
                        </span>
                    </div>
                    <div class="resumen-nomina-bar">
                        <span>📋 Total: <strong>${totalSiniestros}</strong></span>
                        <span>✅ Concluidos: <strong style="color: #2ecc71;">${listaConcluidos.length}</strong></span>
                        <span class="resumen-nomina-total">
                            💰 Comisiones: <strong style="color: #2ecc71; font-size: 1.15em;">${fmtMXN(totalQuincena)}</strong>
                        </span>
                    </div>
                </div>
                <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.9em; margin-bottom: 10px;">
                    <thead>
                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                        <th style="padding: 12px 10px;">ID Siniestro</th>
                        <th style="padding: 12px 10px;">Lugar</th>
                        <th style="padding: 12px 10px;">Cobertura</th>
                        <th style="padding: 12px 10px;">Seguro y KM</th>
                        <th style="padding: 12px 10px;">Estado</th>
                        <th style="padding: 12px 10px;">Comisión</th>
                        <th style="padding: 12px 10px;">Auditoría</th>
                    </tr>
                    </thead>
                    <tbody>
        `;

        lista.forEach((exp, index) => {
            const folioPersonal = exp.AjusteID || (index + 1);
            const fechaMx = exp.FechaOcurrencia.split('T')[0].split('-').reverse().join('/');
            let colorEstado = exp.Estado === 'Concluido' ? '#2ecc71' : (exp.Estado === 'En Análisis' ? '#f39c12' : '#3498db');

            const pagoSiniestro = calcularPagoSiniestro(exp);
            const txtPago = exp.Estado === 'Concluido'
                ? `<strong style="color: #2ecc71;">${fmtMXN(pagoSiniestro)}</strong>`
                : `<span style="color: var(--text-muted); font-size: 0.85em;">Pendiente</span>`;

            const txtKm = parseFloat(exp.Kilometros) > 0 ? `(${exp.Kilometros} km)` : '';

            htmlTabla += `
                <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.3s;">
                    <td style="padding: 12px 10px; font-weight: bold;">
                        SIN-${folioPersonal.toString().padStart(3, '0')}
                        <div style="font-size: 0.75em; color: var(--text-muted); font-weight: normal;">${fechaMx}</div>
                    </td>
                    <td style="padding: 12px 10px;">${exp.Lugar || 'N/A'}</td>
                    <td style="padding: 12px 10px;">${exp.TipoCobertura || 'Local'}</td>
                    <td style="padding: 12px 10px;">${exp.Seguro || 'N/A'} <span style="color: var(--primary-color); font-weight: bold;">${txtKm}</span></td>
                    <td style="padding: 12px 10px;">
                        <span style="background-color: ${colorEstado}20; color: ${colorEstado}; padding: 3px 10px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">
                            ${exp.Estado}
                        </span>
                    </td>
                    <td style="padding: 12px 10px;">${txtPago}</td>
                    <td style="padding: 12px 10px;">
                        <button onclick="abrirModalPagos(${exp.AjusteID}, ${folioPersonal})" style="background: transparent; color: var(--primary-color); border: 1px solid var(--primary-color); padding: 6px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.85em;">
                            👁️ Ver Docs
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
// LÓGICA DEL MODAL PARA ASIGNAR SUELDO O TARIFAS
// ==========================================
function abrirModalNomina(usuarioId) {
    const u = baseUsuarios.find(user => user.UsuarioID === usuarioId);
    if (!u) return;

    document.getElementById('nominaUsuarioID').value = u.UsuarioID;
    document.getElementById('nominaRolEmpleado').value = u.Rol;
    document.getElementById('nominaNombreEmpleado').innerText = u.Nombre;
    document.getElementById('nominaPuesto').value = u.Puesto || u.Rol || '';
    document.getElementById('nominaCiudad').value = u.Ciudad || 'MÉRIDA';

    document.getElementById('nominaSueldoMensual').value = parseFloat(u.SueldoMensual) || 0;
    document.getElementById('nominaCostoLocal').value = parseFloat(u.CostoLocal) || 230;
    document.getElementById('nominaCostoForaneo').value = parseFloat(u.CostoForaneo) || 230;
    document.getElementById('nominaCostoKm').value = parseFloat(u.CostoKm) || 0;
    document.getElementById('nominaCostoKmInbursa').value = parseFloat(u.CostoKmInbursa) || 0;

    if (u.Rol === 'Ajustador') {
        document.getElementById('bloqueCamposFijo').style.display = 'none';
        document.getElementById('bloqueCamposAjustador').style.display = 'flex';
    } else {
        document.getElementById('bloqueCamposFijo').style.display = 'flex';
        document.getElementById('bloqueCamposAjustador').style.display = 'none';
    }

    document.getElementById('modalEditarNomina').style.display = 'flex';
}

function cerrarModalNomina() {
    document.getElementById('modalEditarNomina').style.display = 'none';
}

const formEditarNomina = document.getElementById('formEditarNomina');
if (formEditarNomina) {
    formEditarNomina.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('nominaUsuarioID').value;

        const payload = {
            puesto: document.getElementById('nominaPuesto').value.trim(),
            ciudad: document.getElementById('nominaCiudad').value.trim(),
            sueldoMensual: document.getElementById('nominaSueldoMensual').value,
            costoLocal: document.getElementById('nominaCostoLocal').value,
            costoForaneo: document.getElementById('nominaCostoForaneo').value,
            costoKm: document.getElementById('nominaCostoKm').value,
            costoKmInbursa: document.getElementById('nominaCostoKmInbursa').value
        };

        try {
            const res = await fetch(`http://localhost:3000/api/usuarios/${id}/nomina`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                mostrarToast("✅ Sueldo y tarifas actualizados en la base de datos.", "success");
                cerrarModalNomina();
                descargarDatosDesdeBD();
            } else {
                mostrarToast("❌ Error al guardar cambios de nómina.", "error");
            }
        } catch (error) {
            mostrarToast("❌ Error de conexión con el servidor.", "error");
        }
    });
}

// ==========================================
// MODAL DE SOLO LECTURA DE EXPEDIENTES
// ==========================================
async function abrirModalPagos(ajusteId, folioPersonal) {
    const modal = document.getElementById('modalPagos');
    const modalContenido = document.getElementById('modalPagosContenido');

    document.getElementById('modalPagosExpId').innerText = `SIN-${folioPersonal.toString().padStart(3, '0')}`;
    modal.style.display = 'flex';
    modalContenido.innerHTML = '<p style="text-align: center;">Cargando auditoría de documentos...</p>';

    try {
        const resDocs = await fetch(`http://localhost:3000/api/documentos/${ajusteId}`);
        const resInfo = await fetch(`http://localhost:3000/api/ajustes/${ajusteId}`);

        let htmlContenido = '';

        if (resInfo.ok) {
            const info = await resInfo.json();
            const esConcluido = (info.estado === 'Concluido');

            const mockExp = {
                AjustadorID: info.ajustadorId,
                AjustadorNombre: info.ajustadorNombre,
                TipoCobertura: info.tipoCobertura || 'Local',
                Kilometros: info.kilometros || 0,
                Seguro: info.seguro || '',
                CostoLocal: info.costoLocal,
                CostoForaneo: info.costoForaneo,
                CostoKm: info.costoKm,
                CostoKmInbursa: info.costoKmInbursa
            };

            const tarifaIndividual = calcularPagoSiniestro(mockExp);
            const comisionFmt = esConcluido ? fmtMXN(tarifaIndividual) : "$0.00 (Pendiente)";

            htmlContenido += `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: var(--panel-bg); padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-color);">
                    <div><span style="font-size: 0.8em; color: var(--text-muted);">Lugar (Municipio, Estado)</span><br><strong style="color: var(--text-color);">${info.lugar || 'N/A'}</strong></div>
                    <div><span style="font-size: 0.8em; color: var(--text-muted);">Tipo de Seguro</span><br><strong style="color: var(--text-color);">${info.seguro || 'N/A'}</strong></div>
                    <div><span style="font-size: 0.8em; color: var(--text-muted);">Cobertura / KM</span><br><strong style="color: var(--text-color);">${info.tipoCobertura || 'Local'} - ${info.kilometros ? info.kilometros + ' km' : '0 km'}</strong></div>
                    <div><span style="font-size: 0.8em; color: var(--text-muted);">Ajustador</span><br><strong style="color: var(--text-color);">${info.ajustadorNombre || 'Sin asignar'}</strong></div>
                </div>

                <div style="background: var(--bg-color); padding: 10px 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid ${esConcluido ? '#2ecc71' : 'var(--border-color)'}; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-size: 0.85em; font-weight: bold; color: var(--text-color);">💰 Comisión calculada:</span><br>
                        <small style="color: var(--text-muted);">${esConcluido ? `(Según tarifas en BD + KM)` : 'Aún no se ha concluido el caso'}</small>
                    </div>
                    <strong style="font-size: 1.1em; color: ${esConcluido ? '#2ecc71' : 'var(--text-muted)'};">${comisionFmt}</strong>
                </div>
                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;">
                <h4 style="margin: 0 0 10px 0; color: var(--text-color);">Documentación a Auditar</h4>
            `;
        }

        if (resDocs.ok) {
            const datosDocs = await resDocs.json();
            let cantArchivos = 0;

            ['DOA', 'ORD', 'PM'].forEach(tipo => {
                const doc = datosDocs.documentos.find(d => d.TipoDocumento === tipo);
                if (doc) {
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

            const fotos = datosDocs.documentos.filter(d => !['DOA', 'ORD', 'PM'].includes(d.TipoDocumento) && d.RutaArchivo !== 'NO_REQUERIDO');

            if (fotos.length > 0) {
                cantArchivos += fotos.length;
                htmlContenido += `
                    <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-color);">📸 Fotografías del Siniestro</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 10px;">
                `;

                fotos.forEach(foto => {
                    const rutaWeb = foto.RutaArchivo.replace(/\\/g, '/');
                    const urlCompleta = `http://localhost:3000/${rutaWeb}`;
                    const dispFoto = (foto.Dispositivo && foto.Dispositivo !== 'Sin datos EXIF') ? foto.Dispositivo : 'Sin EXIF';

                    htmlContenido += `
                        <a href="${urlCompleta}" target="_blank" style="position: relative; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); aspect-ratio: 16/9; background: #000; display: block; text-decoration: none;">
                            <img src="${urlCompleta}" style="width: 100%; height: 100%; object-fit: cover;">
                            <div style="position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.75); color: white; font-size: 0.7em; padding: 4px; text-align: center; font-weight: bold;">
                                ${foto.TipoDocumento} (${dispFoto})
                            </div>
                        </a>
                    `;
                });

                htmlContenido += `</div>`;
            }

            if (cantArchivos > 0) {
                htmlContenido += `
                    <div style="display: flex; justify-content: center; margin-top: 15px;">
                        <button onclick="descargarArchivosMasivo(${ajusteId})" style="background-color: transparent; color: #3498db; border: 2px solid #3498db; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%;">
                            🗃️ Descargar Todos los Archivos (${cantArchivos})
                        </button>
                    </div>
                `;
            }
        }
        modalContenido.innerHTML = htmlContenido;
    } catch (error) { modalContenido.innerHTML = '<p style="color: #e74c3c;">Error de conexión.</p>'; }
}

function cerrarModalPagos() {
    document.getElementById('modalPagos').style.display = 'none';
}

function filtrarCajasVisuales() {
    const textoBuscador = document.getElementById("buscadorPagos").value.toLowerCase();
    const estadoSeleccionado = document.getElementById("filtroEstadoPagos").value.toLowerCase();
    const contenedor = document.getElementById("contenedorTablasPagos");
    if (!contenedor) return;

    const bloques = contenedor.getElementsByClassName("detalle-expedientes-ajustador");

    for (let b = 0; b < bloques.length; b++) {
        const tabla = bloques[b].getElementsByTagName("table")[0];
        const filas = tabla.getElementsByTagName("tr");
        let filasVisibles = 0;

        for (let i = 1; i < filas.length; i++) {
            const textoFila = filas[i].textContent || filas[i].innerText;
            const columnaEstado = filas[i].getElementsByTagName("span")[1] || filas[i].getElementsByTagName("span")[0];
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
        const mes = document.getElementById('filtroMes').value;
        const quincena = document.getElementById('filtroQuincena').value;
        const res = await fetch(`http://localhost:3000/api/exportar-excel?mes=${mes}&quincena=${quincena}`);

        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Reporte_Nomina_ASPV_${new Date().toLocaleDateString('es-MX')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            mostrarToast("✅ Excel descargado exitosamente.", "success");
        } else {
            mostrarToast("❌ Error en el servidor al generar Excel.", "error");
        }
    } catch (error) {
        mostrarToast("❌ Error al descargar.", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('nombreUsuarioUI').innerText = `Hola, ${nombreUsuario}`;
    descargarDatosDesdeBD();
});

// ==========================================
// PERFIL DE USUARIO Y DESCARGAS
// ==========================================
const miUsuarioIdGbl = localStorage.getItem('aspv_id');

async function cargarDatosPerfil() {
    if (!miUsuarioIdGbl) return;
    try {
        const res = await fetch(`http://localhost:3000/api/perfil/${miUsuarioIdGbl}`);
        if (res.ok) {
            const perfil = await res.json();
            const avatarUrl = perfil.FotoPerfil ? `http://localhost:3000/${perfil.FotoPerfil}` : 'imagenes/LogoASPV.jpg';
            const avatarHeader = document.getElementById('avatarHeader');
            if (avatarHeader) avatarHeader.src = avatarUrl;
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
            const res = await fetch(`http://localhost:3000/api/perfil/${miUsuarioIdGbl}`, { method: 'POST', body: formData });
            if (res.ok) {
                mostrarToast("✅ Perfil actualizado.", "success");
                cargarDatosPerfil();
                cerrarModalPerfil();
            } else { mostrarToast("❌ Error al guardar perfil.", "error"); }
        } catch (error) { mostrarToast("❌ Error de red.", "error"); }
    });
}

document.addEventListener("DOMContentLoaded", () => { cargarDatosPerfil(); });

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
            } catch (e) { console.error("Error descargando:", doc.RutaArchivo); }
            await new Promise(r => setTimeout(r, 500));
        }
        mostrarToast("✅ Todas las descargas han finalizado.", "success");
    } catch (error) { mostrarToast("❌ Error al conectar con los archivos.", "error"); }
}