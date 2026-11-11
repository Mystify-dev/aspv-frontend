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
const miUsuarioIdGbl = localStorage.getItem('aspv_id');

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
    if (temaGuardado === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    if (textoGuardado) document.documentElement.setAttribute('data-text', textoGuardado);
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

function mostrarFormularioAlta() { document.getElementById('formNuevoUsuario').style.display = 'flex'; }
function ocultarFormularioAlta() { document.getElementById('formNuevoUsuario').style.display = 'none'; }

let cacheUsuariosAdmin = [];

async function cargarPersonal() {
    try {
        const res = await fetch('http://localhost:3000/api/usuarios');
        if (res.ok) {
            cacheUsuariosAdmin = await res.json();

            // ACTUALIZAR KPIs DE PERSONAL
            document.getElementById('kpiTotal').innerText = cacheUsuariosAdmin.length;
            document.getElementById('kpiAjustadores').innerText = cacheUsuariosAdmin.filter(u => u.Rol === 'Ajustador').length;
            document.getElementById('kpiAdmin').innerText = cacheUsuariosAdmin.filter(u => u.Rol !== 'Ajustador').length;
            document.getElementById('kpiOnline').innerText = cacheUsuariosAdmin.filter(u => u.Estado === 'online').length;

            const tablaDirectorio = document.getElementById('tablaDirectorioPersonal');
            if(!tablaDirectorio) return;
            tablaDirectorio.innerHTML = '';

            cacheUsuariosAdmin.forEach(u => {
                let colorRol = u.Rol === 'Admin' ? '#e74c3c' : (u.Rol === 'Analista' ? '#f39c12' : '#3498db');
                const puestoTxt = u.Puesto || u.Rol;
                const ciudadTxt = u.Ciudad || 'MÉRIDA';

                // Lógica del estado (En Línea o Última Vez)
                let estadoTexto = '';
                if (u.Estado === 'online') {
                    estadoTexto = '<span style="color: #2ecc71; font-weight: bold;">🟢 En línea</span>';
                } else {
                    let ultima = u.UltimaConexion ? new Date(u.UltimaConexion).toLocaleDateString('es-MX', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Nunca';
                    estadoTexto = `<span style="color: var(--text-muted);">⚪ Offline</span><br><span style="font-size: 0.75em; color: var(--text-muted);">Últ: ${ultima}</span>`;
                }

                // Añadimos un id al td del estado para actualizarlo fácilmente por socket
                tablaDirectorio.innerHTML += `
                    <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.3s;">
                        <td style="padding: 12px 10px; font-weight: bold;">${u.Nombre.toUpperCase()}</td>
                        <td style="padding: 12px 10px; color: var(--text-muted);">${puestoTxt.toUpperCase()}</td>
                        <td style="padding: 12px 10px;">${ciudadTxt.toUpperCase()}</td>
                        <td style="padding: 12px 10px; color: var(--primary-color);">${u.Correo}</td>
                        <td style="padding: 12px 10px;"><span style="color: ${colorRol}; font-weight: bold;">${u.Rol}</span></td>
                        <td style="padding: 12px 10px;" id="estado-user-${u.UsuarioID}">${estadoTexto}</td>
                        <td style="padding: 12px 10px; text-align: center;">
                            <button onclick="abrirModalEditar(${u.UsuarioID})" style="background: transparent; color: #f39c12; border: 1px solid #f39c12; padding: 4px 8px; border-radius: 5px; cursor: pointer; font-size: 0.85em; font-weight: bold; margin-right: 5px;">✏️ Editar</button>
                            <button onclick="preguntarAccion(${u.UsuarioID}, '${u.Nombre.replace(/'/g, "\\'")}', 'eliminar')" style="background: transparent; color: #e74c3c; border: 1px solid #e74c3c; padding: 4px 8px; border-radius: 5px; cursor: pointer; font-size: 0.85em; font-weight: bold;">🗑️ Baja</button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) { console.error("Error al cargar lista de personal:", error); }
}

// ALTA DE USUARIO
const formNuevoUsuario = document.getElementById('formNuevoUsuario');
if (formNuevoUsuario) {
    formNuevoUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            nombre: document.getElementById('nuevoNombre').value.trim(),
            puesto: document.getElementById('nuevoPuesto').value.trim(),
            ciudad: document.getElementById('nuevaCiudad').value.trim(),
            correo: document.getElementById('nuevoCorreo').value.trim(),
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
                mostrarToast("Empleado registrado exitosamente. Puedes asignarle sueldo en Panel de Pagos.", "success");
                formNuevoUsuario.reset();
                ocultarFormularioAlta();
                cargarPersonal();
            } else {
                const errorData = await res.json().catch(() => ({}));
                mostrarToast(`Error al registrar: ${errorData.error || 'Correo ya registrado.'}`, "error");
            }
        } catch (error) { mostrarToast("Error de conexión con el servidor.", "error"); }
    });
}

// ==========================================
// LÓGICA DE EDICIÓN DE USUARIO
// ==========================================
function abrirModalEditar(id) {
    const u = cacheUsuariosAdmin.find(user => user.UsuarioID === id);
    if (!u) return;

    document.getElementById('editUsuarioID').value = u.UsuarioID;
    document.getElementById('editNombre').value = u.Nombre || '';
    document.getElementById('editPuesto').value = u.Puesto || u.Rol || '';
    document.getElementById('editCiudad').value = u.Ciudad || 'MÉRIDA';
    document.getElementById('editCorreo').value = u.Correo || '';
    document.getElementById('editRol').value = u.Rol || 'Ajustador';
    document.getElementById('editPassword').value = '';

    document.getElementById('modalEditarUsuario').style.display = 'flex';
}

function cerrarModalEditar() {
    document.getElementById('modalEditarUsuario').style.display = 'none';
}

const formEditarUsuario = document.getElementById('formEditarUsuario');
if (formEditarUsuario) {
    formEditarUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editUsuarioID').value;
        const payload = {
            nombre: document.getElementById('editNombre').value.trim(),
            puesto: document.getElementById('editPuesto').value.trim(),
            ciudad: document.getElementById('editCiudad').value.trim(),
            correo: document.getElementById('editCorreo').value.trim(),
            password: document.getElementById('editPassword').value,
            rol: document.getElementById('editRol').value
        };

        try {
            const res = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                mostrarToast("Los datos del empleado fueron actualizados.", "success");
                cerrarModalEditar();
                cargarPersonal();
            } else {
                const errorData = await res.json().catch(() => ({}));
                mostrarToast(`Error al actualizar: ${errorData.error || 'Correo en uso.'}`, "error");
            }
        } catch (error) {
            mostrarToast("Error de conexión con el servidor.", "error");
        }
    });
}

let accionPendiente = null;
let idObjetivo = null;
let datoExtra = null;

function preguntarAccion(id, dato, tipoAccion) {
    accionPendiente = tipoAccion;
    idObjetivo = id;
    datoExtra = dato;

    let texto = "";
    if (tipoAccion === 'eliminar') texto = `¿Estás seguro de que deseas dar de baja a ${dato}? Desaparecerá también del Panel de Nómina.`;

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
                mostrarToast("No se puede eliminar. Este usuario ya tiene expedientes vinculados.", "error");
            }
        } catch (error) { console.error("Error eliminando:", error); }
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
    } catch (error) {}
}

// ==========================================
// SOCKET.IO: INTEGRACIÓN DE ESTADOS EN TIEMPO REAL
// ==========================================
const socket = io("http://localhost:3000");

socket.on("connect", () => {
    if (miUsuarioIdGbl) {
        socket.emit("registerUser", miUsuarioIdGbl);
    }
});

// Actualiza el estado visualmente en la tabla cuando alguien se conecta/desconecta
socket.on('estadoUsuarioCambio', (data) => {
    const tdEstado = document.getElementById(`estado-user-${data.userId}`);
    if (tdEstado) {
        if (data.estado === 'online') {
            tdEstado.innerHTML = '<span style="color: #2ecc71; font-weight: bold;">🟢 En línea</span>';
        } else {
            let ultima = data.ultimaVez ? new Date(data.ultimaVez).toLocaleDateString('es-MX', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Recién';
            tdEstado.innerHTML = `<span style="color: var(--text-muted);">⚪ Offline</span><br><span style="font-size: 0.75em; color: var(--text-muted);">Últ: ${ultima}</span>`;
        }
    }

    // Opcional: Actualizar el KPI de conectados (podría requerir un recálculo iterando la tabla o recargando personal)
    // Para simplificar, recargaremos la lista de personal de forma silenciosa para mantener los KPIs consistentes.
    // Solo recargamos si no hay un modal abierto para no interrumpir al usuario.
    const modalAbierto = document.getElementById('modalEditarUsuario').style.display === 'flex' || document.getElementById('formNuevoUsuario').style.display === 'flex';
    if(!modalAbierto){
        cargarPersonal();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const nombreUI = document.getElementById('nombreUsuarioUI');
    if (nombreUI) nombreUI.innerText = `Hola, ${nombreUsuario || 'Administrador'}`;

    cargarPersonal();

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
            const res = await fetch(`http://localhost:3000/api/perfil/${miUsuarioIdGbl}`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                mostrarToast("✅ Perfil actualizado.", "success");
                cargarDatosPerfil();
                cerrarModalPerfil();
            } else {
                mostrarToast("❌ Error al guardar perfil.", "error");
            }
        } catch (error) {
            mostrarToast("❌ Error de red.", "error");
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    cargarDatosPerfil();
});