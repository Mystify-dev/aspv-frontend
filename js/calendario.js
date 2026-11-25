// ==========================================
// 0. SEGURIDAD Y CONTROL DE ACCESO
// ==========================================
const rolUsuario = localStorage.getItem('aspv_rol');
const nombreUsuario = localStorage.getItem('aspv_nombre');
const miUsuarioIdGbl = localStorage.getItem('aspv_id');

if (!rolUsuario) {
    alert("⛔ Acceso denegado. Inicia sesión.");
    window.location.href = 'login.html';
}

document.addEventListener("DOMContentLoaded", () => {
    const nombreUI = document.getElementById('nombreUsuarioUI');
    if (nombreUI) nombreUI.innerText = `Hola, ${nombreUsuario}`;
    inicializarCalendario();
    cargarUsuariosInvitados();
    cargarDatosPerfil();
});

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}

async function authFetch(url, options = {}) {
    const headers = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        localStorage.clear();
        window.location.href = 'login.html';
        throw new Error('Sesión expirada');
    }
    return res;
}

// ==========================================
// 1. LÓGICA DEL CALENDARIO (SINIESTROS + EVENTOS/RECORDATORIOS)
// ==========================================
function obtenerColorEventoCalendario(ev) {
    if (ev.Completado) return '#7f8c8d';
    if (ev.Urgente || ev.Tipo === 'Recordatorio') return '#e74c3c';
    const cat = (ev.Categoria || '').toLowerCase();
    if (cat === 'guardia') return '#e67e22';
    if (cat === 'personal') return '#1abc9c';
    if (cat === 'trabajo') return '#8e44ad';
    return '#9b59b6';
}

function inicializarCalendario() {
    const calendarEl = document.getElementById('calendar');

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        buttonText: {
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            list: 'Agenda'
        },
        events: async function(info, successCallback, failureCallback) {
            try {
                const [resSiniestros, resCalendario] = await Promise.all([
                    authFetch('https://api.aspv.com.mx/api/lista-expedientes'),
                    authFetch('https://api.aspv.com.mx/api/calendario').catch(() => null)
                ]);

                const eventosVisuales = [];

                // 1. Siniestros
                if (resSiniestros && resSiniestros.ok) {
                    const expedientes = await resSiniestros.json();
                    if (Array.isArray(expedientes)) {
                        expedientes.forEach(exp => {
                            if (!exp.FechaOcurrencia) return;
                            let colorEvento = '#3498db';
                            if (exp.Estado === 'Concluido') colorEvento = '#2ecc71';
                            if (exp.Estado === 'En Análisis') colorEvento = '#f39c12';

                            eventosVisuales.push({
                                id: `sin-${exp.AjusteID}`,
                                title: `SIN-${String(exp.AjusteID).padStart(3, '0')} - ${exp.Lugar || 'Sin lugar'}`,
                                start: exp.FechaOcurrencia.split('T')[0],
                                allDay: true,
                                backgroundColor: colorEvento,
                                borderColor: colorEvento,
                                extendedProps: {
                                    origen: 'siniestro',
                                    estado: exp.Estado,
                                    seguro: exp.Seguro,
                                    ajustador: exp.AjustadorNombre,
                                    lugar: exp.Lugar
                                }
                            });
                        });
                    }
                }

                // 2. Eventos y Recordatorios de /api/calendario
                if (resCalendario && resCalendario.ok) {
                    const dataCal = await resCalendario.json();
                    const listaCal = Array.isArray(dataCal) ? dataCal : (dataCal.eventos || dataCal.data || []);

                    listaCal.forEach(ev => {
                        if (!ev.FechaInicio) return;
                        const color = obtenerColorEventoCalendario(ev);
                        const prefijo = ev.Urgente ? '🚨 ' : (ev.Tipo === 'Recordatorio' ? '☑️ ' : '📅 ');
                        const tituloFinal = ev.Completado ? `✔ ${ev.Titulo || 'Sin título'}` : `${prefijo}${ev.Titulo || 'Sin título'}`;

                        eventosVisuales.push({
                            id: `cal-${ev.ID ?? ev.EventoID ?? ev.id}`,
                            title: tituloFinal,
                            start: ev.FechaInicio,
                            end: ev.FechaFin || undefined,
                            allDay: Boolean(ev.TodoElDia),
                            backgroundColor: color,
                            borderColor: color,
                            extendedProps: {
                                origen: 'calendario',
                                eventoId: ev.ID ?? ev.EventoID ?? ev.id,
                                tipo: ev.Tipo || 'Evento',
                                tituloRaw: ev.Titulo || '',
                                notas: ev.Notas || ev.Descripcion || '',
                                ubicacion: ev.Ubicacion || '',
                                categoria: ev.Categoria || 'Reunión',
                                repetir: ev.Repetir || 'Nunca',
                                urgente: Boolean(ev.Urgente),
                                completado: Boolean(ev.Completado),
                                todoElDia: Boolean(ev.TodoElDia),
                                invitados: Array.isArray(ev.Invitados) ? ev.Invitados : [],
                                creador: ev.CreadorNombre || ''
                            }
                        });
                    });
                }

                successCallback(eventosVisuales);
            } catch (error) {
                console.error("Error al cargar eventos:", error);
                failureCallback(error);
            }
        },
        dateClick: function(info) {
            abrirModalNuevoEvento(info.dateStr);
        },
        eventClick: function(info) {
            abrirModalDetalleEvento(info.event);
        },
        height: 'auto',
        contentHeight: 620,
        firstDay: 1
    });

    window.calendarioASPV = calendar;
    calendar.render();
}

// ==========================================
// 2. MODAL NUEVO EVENTO / RECORDATORIO E INVITADOS
// ==========================================
let usuariosDirectorio = [];
let invitadosSeleccionados = [];

async function cargarUsuariosInvitados() {
    try {
        const res = await authFetch('https://api.aspv.com.mx/api/usuarios');
        if (res.ok) {
            const lista = await res.json();
            if (Array.isArray(lista)) {
                usuariosDirectorio = lista.filter(u => String(u.UsuarioID) !== String(miUsuarioIdGbl));
            }
        }
    } catch (error) {
        console.error("Error cargando directorio de usuarios:", error);
    }
}

function formatearFechaLocalInput(fechaObj) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${fechaObj.getFullYear()}-${pad(fechaObj.getMonth() + 1)}-${pad(fechaObj.getDate())}T${pad(fechaObj.getHours())}:${pad(fechaObj.getMinutes())}`;
}

function abrirModalNuevoEvento(fechaStr = null) {
    const modal = document.getElementById('modalNuevoEvento');
    const form = document.getElementById('formNuevoEvento');
    if (form) form.reset();

    invitadosSeleccionados = [];
    renderizarChipsInvitados();
    const dropdown = document.getElementById('listaResultadosInvitados');
    if (dropdown) dropdown.style.display = 'none';

    cambiarTipoCalendario('Evento');
    seleccionarCategoria('Reunión');

    const inputTodoElDia = document.getElementById('evTodoElDia');
    if (inputTodoElDia) inputTodoElDia.checked = false;
    toggleTodoElDia();

    let inicio;
    if (fechaStr) {
        inicio = new Date(`${fechaStr.split('T')[0]}T09:00:00`);
    } else {
        inicio = new Date();
        inicio.setMinutes(0, 0, 0);
        inicio.setHours(inicio.getHours() + 1);
    }
    const fin = new Date(inicio.getTime() + 60 * 60 * 1000);

    document.getElementById('evFechaInicio').value = formatearFechaLocalInput(inicio);
    document.getElementById('evFechaFin').value = formatearFechaLocalInput(fin);

    if (modal) modal.style.display = 'flex';
}

function cerrarModalNuevoEvento() {
    const modal = document.getElementById('modalNuevoEvento');
    if (modal) modal.style.display = 'none';
}

function cambiarTipoCalendario(tipo) {
    document.getElementById('evTipo').value = tipo;
    const btnEvento = document.getElementById('segBtnEvento');
    const btnRec = document.getElementById('segBtnRecordatorio');
    const camposEvento = document.getElementById('camposEvento');
    const camposRec = document.getElementById('camposRecordatorio');
    const bloqueTodoElDia = document.getElementById('bloqueTodoElDia');
    const bloqueFechaFin = document.getElementById('bloqueFechaFin');
    const lblInicio = document.getElementById('lblFechaInicio');

    if (tipo === 'Recordatorio') {
        btnEvento.classList.remove('active');
        btnRec.classList.add('active');
        camposEvento.style.display = 'none';
        camposRec.style.display = 'block';
        bloqueTodoElDia.style.display = 'none';
        bloqueFechaFin.style.display = 'none';
        lblInicio.innerText = 'Fecha y hora *';
        document.getElementById('evFechaInicio').type = 'datetime-local';
    } else {
        btnEvento.classList.add('active');
        btnRec.classList.remove('active');
        camposEvento.style.display = 'flex';
        camposRec.style.display = 'none';
        bloqueTodoElDia.style.display = 'flex';
        bloqueFechaFin.style.display = 'block';
        lblInicio.innerText = 'Empieza *';
        toggleTodoElDia();
    }
}

function toggleTodoElDia() {
    const todoElDia = document.getElementById('evTodoElDia').checked;
    const inputInicio = document.getElementById('evFechaInicio');
    const inputFin = document.getElementById('evFechaFin');
    const valInicio = inputInicio.value;
    const valFin = inputFin.value;

    if (todoElDia) {
        inputInicio.type = 'date';
        inputFin.type = 'date';
        if (valInicio) inputInicio.value = valInicio.split('T')[0];
        if (valFin) inputFin.value = valFin.split('T')[0];
    } else {
        inputInicio.type = 'datetime-local';
        inputFin.type = 'datetime-local';
        if (valInicio && !valInicio.includes('T')) inputInicio.value = `${valInicio}T09:00`;
        if (valFin && !valFin.includes('T')) inputFin.value = `${valFin}T10:00`;
    }
}

function seleccionarCategoria(categoria) {
    document.getElementById('evCategoria').value = categoria;
    document.querySelectorAll('#grupoCategorias .cat-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cat === categoria);
    });
}

function renderizarChipsInvitados() {
    const cont = document.getElementById('chipsInvitados');
    if (!cont) return;
    cont.innerHTML = '';

    invitadosSeleccionados.forEach(u => {
        const chip = document.createElement('span');
        chip.className = 'guest-chip';
        chip.innerHTML = `${u.Nombre} <button type="button" onclick="quitarInvitado(${u.UsuarioID})" title="Quitar">×</button>`;
        cont.appendChild(chip);
    });
}

function agregarInvitado(usuarioId) {
    const user = usuariosDirectorio.find(u => String(u.UsuarioID) === String(usuarioId));
    if (!user) return;
    if (!invitadosSeleccionados.some(i => String(i.UsuarioID) === String(usuarioId))) {
        invitadosSeleccionados.push(user);
        renderizarChipsInvitados();
    }
    const buscador = document.getElementById('buscadorInvitados');
    const dropdown = document.getElementById('listaResultadosInvitados');
    if (buscador) buscador.value = '';
    if (dropdown) dropdown.style.display = 'none';
}

function quitarInvitado(usuarioId) {
    invitadosSeleccionados = invitadosSeleccionados.filter(i => String(i.UsuarioID) !== String(usuarioId));
    renderizarChipsInvitados();
}

const buscadorInvitados = document.getElementById('buscadorInvitados');
if (buscadorInvitados) {
    const mostrarOpcionesInvitados = () => {
        const dropdown = document.getElementById('listaResultadosInvitados');
        if (!dropdown) return;
        const q = buscadorInvitados.value.trim().toLowerCase();
        const filtrados = usuariosDirectorio.filter(u =>
            !invitadosSeleccionados.some(sel => String(sel.UsuarioID) === String(u.UsuarioID)) &&
            (q === '' || (u.Nombre || '').toLowerCase().includes(q) || (u.Correo || '').toLowerCase().includes(q))
        );

        if (filtrados.length === 0) {
            dropdown.innerHTML = '<div style="padding: 8px 12px; font-size: 0.8em; color: var(--text-muted);">Sin coincidencias</div>';
        } else {
            dropdown.innerHTML = filtrados.slice(0, 15).map(u => `
                <div class="guest-option" onclick="agregarInvitado(${u.UsuarioID})">
                    <span><strong>${u.Nombre}</strong> <span style="color: var(--text-muted); font-size: 0.85em;">(${u.Rol || ''})</span></span>
                    <span style="color: var(--primary-color); font-weight: bold;">+ Agregar</span>
                </div>
            `).join('');
        }
        dropdown.style.display = 'block';
    };

    buscadorInvitados.addEventListener('input', mostrarOpcionesInvitados);
    buscadorInvitados.addEventListener('focus', mostrarOpcionesInvitados);
}

const formNuevoEvento = document.getElementById('formNuevoEvento');
if (formNuevoEvento) {
    formNuevoEvento.addEventListener('submit', async (e) => {
        e.preventDefault();

        const tipo = document.getElementById('evTipo').value;
        const titulo = document.getElementById('evTitulo').value.trim();
        const notas = document.getElementById('evNotas').value.trim();
        const fechaInicio = document.getElementById('evFechaInicio').value;
        const todoElDia = tipo === 'Evento' ? document.getElementById('evTodoElDia').checked : false;
        const fechaFin = tipo === 'Evento' ? (document.getElementById('evFechaFin').value || null) : null;

        if (!titulo || !fechaInicio) {
            mostrarToast("⚠️ Completa el título y la fecha.", "warning");
            return;
        }

        const payload = {
            tipo,
            titulo,
            notas,
            fechaInicio,
            fechaFin,
            todoElDia,
            repetir: tipo === 'Evento' ? document.getElementById('evRepetir').value : 'Nunca',
            ubicacion: tipo === 'Evento' ? document.getElementById('evUbicacion').value.trim() : '',
            categoria: tipo === 'Evento' ? document.getElementById('evCategoria').value : 'Recordatorio',
            urgente: tipo === 'Recordatorio' ? document.getElementById('evUrgente').checked : false,
            invitados: tipo === 'Evento' ? invitadosSeleccionados.map(u => u.UsuarioID) : []
        };

        try {
            const res = await authFetch('https://api.aspv.com.mx/api/calendario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                mostrarToast(`✅ ${tipo} guardado en el calendario.`, "success");
                cerrarModalNuevoEvento();
                if (window.calendarioASPV) window.calendarioASPV.refetchEvents();
            } else {
                const errData = await res.json().catch(() => ({}));
                mostrarToast(`❌ Error: ${errData.error || 'No se pudo guardar.'}`, "error");
            }
        } catch (error) {
            mostrarToast("❌ Error de conexión al guardar.", "error");
        }
    });
}

// ==========================================
// 3. MODAL DETALLE DE EVENTO / SINIESTRO
// ==========================================
function abrirModalDetalleEvento(fcEvent) {
    const props = fcEvent.extendedProps || {};
    const modal = document.getElementById('modalDetalleEvento');
    const tituloEl = document.getElementById('detalleEventoTitulo');
    const contenidoEl = document.getElementById('detalleEventoContenido');

    if (props.origen === 'siniestro') {
        tituloEl.innerText = `🚗 ${fcEvent.title}`;
        contenidoEl.innerHTML = `
            <div><strong>Tipo:</strong> <span style="background: rgba(52,152,219,0.15); color: #3498db; padding: 2px 8px; border-radius: 10px; font-weight: bold;">Siniestro</span></div>
            <div><strong>Estado:</strong> ${props.estado || 'N/A'}</div>
            <div><strong>Aseguradora:</strong> ${props.seguro || 'N/A'}</div>
            <div><strong>Ajustador:</strong> ${props.ajustador || 'N/A'}</div>
            <div><strong>Lugar:</strong> ${props.lugar || 'N/A'}</div>
        `;
    } else {
        tituloEl.innerText = props.tituloRaw || fcEvent.title;
        const fechaInicioTxt = fcEvent.start
            ? fcEvent.start.toLocaleString('es-MX', props.todoElDia ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' })
            : 'N/A';
        const fechaFinTxt = fcEvent.end
            ? fcEvent.end.toLocaleString('es-MX', props.todoElDia ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' })
            : '';

        const badgeUrgente = props.urgente
            ? '<span style="background: #e74c3c; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8em; font-weight: bold;">🚨 URGENTE</span>'
            : '';

        let ubicacionHtml = '';
        if (props.ubicacion) {
            const esLink = /^https?:\/\//i.test(props.ubicacion);
            ubicacionHtml = esLink
                ? `<div><strong>📍 Enlace:</strong> <a href="${props.ubicacion}" target="_blank" style="color: var(--primary-color); word-break: break-all;">${props.ubicacion}</a></div>`
                : `<div><strong>📍 Ubicación:</strong> ${props.ubicacion}</div>`;
        }

        let invitadosHtml = '';
        if (props.invitados && props.invitados.length > 0) {
            const nombres = props.invitados.map(inv => typeof inv === 'object' ? (inv.Nombre || inv.nombre || inv.UsuarioID) : inv);
            invitadosHtml = `
                <div>
                    <strong>👥 Invitados:</strong>
                    <div class="chips-container" style="margin-top: 6px;">
                        ${nombres.map(n => `<span class="guest-chip">${n}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        let checkCompletadoHtml = '';
        if (props.tipo === 'Recordatorio' && props.eventoId) {
            checkCompletadoHtml = `
                <label style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; margin-top: 4px;">
                    <input type="checkbox" ${props.completado ? 'checked' : ''} onchange="marcarRecordatorioCompletado(${props.eventoId}, this.checked)" style="width: 18px; height: 18px; accent-color: #2ecc71;">
                    <strong>Marcar recordatorio como completado</strong>
                </label>
            `;
        }

        contenidoEl.innerHTML = `
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <span style="background: rgba(155,89,182,0.15); color: #9b59b6; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 0.85em;">${props.tipo} • ${props.categoria}</span>
                ${badgeUrgente}
            </div>
            <div><strong>🕒 Inicio:</strong> ${fechaInicioTxt}</div>
            ${fechaFinTxt ? `<div><strong>🏁 Termina:</strong> ${fechaFinTxt}</div>` : ''}
            ${props.repetir && props.repetir !== 'Nunca' ? `<div><strong>🔁 Repetir:</strong> ${props.repetir}</div>` : ''}
            ${ubicacionHtml}
            ${props.notas ? `<div style="background: var(--bg-color); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); white-space: pre-wrap;">${props.notas}</div>` : ''}
            ${invitadosHtml}
            ${checkCompletadoHtml}
        `;
    }

    if (modal) modal.style.display = 'flex';
}

function cerrarModalDetalleEvento() {
    const modal = document.getElementById('modalDetalleEvento');
    if (modal) modal.style.display = 'none';
}

async function marcarRecordatorioCompletado(eventoId, completado) {
    try {
        const res = await authFetch(`https://api.aspv.com.mx/api/calendario/${eventoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completado })
        });
        if (res.ok) {
            mostrarToast(completado ? "✅ Recordatorio completado." : "↩️ Recordatorio pendiente.", "success");
            if (window.calendarioASPV) window.calendarioASPV.refetchEvents();
        } else {
            mostrarToast("❌ No se pudo actualizar el recordatorio.", "error");
        }
    } catch (error) {
        mostrarToast("❌ Error de conexión.", "error");
    }
}

// ==========================================
// 4. ACCESIBILIDAD
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
    if (window.calendarioASPV) {
        window.calendarioASPV.render();
    }
}

function cambiarTexto(tamano) {
    document.documentElement.setAttribute('data-text', tamano);
    localStorage.setItem('aspv_texto', tamano);
}

// ==========================================
// 5. PERFIL DE USUARIO (UNIVERSAL)
// ==========================================
async function cargarDatosPerfil() {
    if (!miUsuarioIdGbl) return;
    try {
        const res = await authFetch(`https://api.aspv.com.mx/api/perfil/${miUsuarioIdGbl}`);
        if (res.ok) {
            const perfil = await res.json();
            const avatarUrl = perfil.FotoPerfil ? `https://api.aspv.com.mx/${perfil.FotoPerfil}` : 'assets/img/LogoASPV.jpg';
            const avatarHeader = document.getElementById('avatarHeader');
            if (avatarHeader) avatarHeader.src = avatarUrl;
            const previewFoto = document.getElementById('previewFotoPerfil');
            if (previewFoto) previewFoto.src = avatarUrl;
            const correoInput = document.getElementById('correoPerfil');
            if (correoInput) correoInput.value = perfil.Correo;
            const telInput = document.getElementById('telefonoPerfil');
            if (telInput) telInput.value = perfil.Telefono || '';
        }
    } catch (error) {}
}

function abrirModalPerfil() { const m = document.getElementById('modalPerfil'); if (m) m.style.display = 'flex'; }
function cerrarModalPerfil() { const m = document.getElementById('modalPerfil'); if (m) m.style.display = 'none'; }

const inputFoto = document.getElementById('inputFotoPerfil');
if (inputFoto) {
    inputFoto.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(ev) { document.getElementById('previewFotoPerfil').src = ev.target.result; };
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
            const res = await authFetch(`https://api.aspv.com.mx/api/perfil/${miUsuarioIdGbl}`, { method: 'POST', body: formData });
            if (res.ok) { mostrarToast("✅ Perfil actualizado.", "success"); cargarDatosPerfil(); cerrarModalPerfil(); }
        } catch (error) {}
    });
}

// ==========================================
// 6. SOCKET.IO: NOTIFICACIONES Y EVENTOS EN TIEMPO REAL
// ==========================================
function mostrarToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `<span>🔔</span> <span>${mensaje}</span>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3500);
}

if (typeof io !== 'undefined') {
    const socket = window.socket || io("https://api.aspv.com.mx", { auth: { token: localStorage.getItem('token') } });
    window.socket = socket;

    const registrarUsuarioSocket = () => {
        const uid = localStorage.getItem('aspv_id');
        if (uid) socket.emit("registerUser", uid);
    };
    socket.on("connect", registrarUsuarioSocket);
    if (socket.connected) registrarUsuarioSocket();

    socket.on('nuevaNotificacion', (noti) => {
        const mensaje = (noti && (noti.Mensaje || noti.mensaje)) || 'Tienes una nueva alerta operativa';
        mostrarToast(mensaje, 'info');
        if (window.Notification && Notification.permission === 'granted') {
            new Notification('ASPV - Nueva Notificación', { body: mensaje });
        }
    });

    socket.on('nuevoEventoCalendario', (data) => {
        if (window.calendarioASPV) {
            window.calendarioASPV.refetchEvents();
        }
        const titulo = data && (data.Titulo || data.titulo);
        if (titulo) {
            mostrarToast(`📅 Nuevo evento en tu calendario: ${titulo}`, 'info');
            if (window.Notification && Notification.permission === 'granted') {
                new Notification('ASPV - Nuevo Evento en Calendario', { body: titulo });
            }
        }
    });
}
