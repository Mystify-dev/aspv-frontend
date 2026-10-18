// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================
const nombreUsuario = localStorage.getItem('aspv_nombre') || 'Usuario Desconocido';
const miUsuarioIdGbl = localStorage.getItem('aspv_id');

if (!localStorage.getItem('aspv_rol')) window.location.href = 'login.html';

document.getElementById('nombreUsuarioUI').innerText = `Hola, ${nombreUsuario}`;

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function cambiarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema === 'dark' ? 'dark' : '');
    localStorage.setItem('aspv_tema', tema);
}
function cambiarTexto(tamano) {
    document.documentElement.setAttribute('data-text', tamano);
    localStorage.setItem('aspv_texto', tamano);
}
const temaG = localStorage.getItem('aspv_tema');
if (temaG === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

// Función auxiliar para dar color a las letras si no tienen foto
function obtenerColorPorNombre(nombre) {
    const colores = ['#e74c3c', '#8e44ad', '#3498db', '#16a085', '#f39c12', '#d35400', '#2c3e50'];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
        hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colores[Math.abs(hash) % colores.length];
}

// ==========================================
// LÓGICA DEL MURO SOCIAL
// ==========================================
async function cargarMuro() {
    const contenedor = document.getElementById('feedSiniestros');

    try {
        const respuesta = await fetch('http://localhost:3000/api/lista-expedientes');
        if (!respuesta.ok) throw new Error("Error de red");

        let expedientes = await respuesta.json();

        // Ordenar del más nuevo al más viejo (como una red social real)
        expedientes.sort((a, b) => b.AjusteID - a.AjusteID);

        contenedor.innerHTML = ''; // Limpiar

        for (const exp of expedientes) {
            const folio = exp.AjusteID;
            const fecha = new Date(exp.FechaOcurrencia).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
            const autor = exp.AjustadorNombre || 'Usuario Desconocido';

            // 1. EVALUAR FOTO DEL AUTOR DEL POST
            let htmlAvatarAjustador = '';
            if (exp.AjustadorFoto) {
                htmlAvatarAjustador = `<img src="http://localhost:3000/${exp.AjustadorFoto}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color); flex-shrink: 0;">`;
            } else {
                const inicial = autor.charAt(0).toUpperCase();
                const colorFondo = obtenerColorPorNombre(autor);
                htmlAvatarAjustador = `
                    <div style="width: 45px; height: 45px; border-radius: 50%; background-color: ${colorFondo}; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2em; font-weight: bold; flex-shrink: 0;">
                        ${inicial}
                    </div>`;
            }

            // Construir la tarjeta (Post)
            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = 'padding: 20px; border-radius: 12px; background: var(--bg-color); border: 1px solid var(--border-color); box-shadow: 0 4px 6px rgba(0,0,0,0.05);';

            card.innerHTML = `
                <!-- Cabecera del Post -->
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    
                    ${htmlAvatarAjustador} <!-- Aquí va la foto o la inicial -->

                    <div>
                        <strong style="font-size: 1.1em; color: var(--text-color);">${autor}</strong>
                        <div style="color: var(--text-muted); font-size: 0.85em;">Subió el siniestro <strong>SIN-${folio.toString().padStart(3, '0')}</strong> • ${fecha}</div>
                    </div>
                    <div style="margin-left: auto;">
                        <span style="background: ${exp.Estado === 'Concluido' ? '#2ecc7120' : '#3498db20'}; color: ${exp.Estado === 'Concluido' ? '#2ecc71' : '#3498db'}; padding: 5px 12px; border-radius: 20px; font-size: 0.8em; font-weight: bold;">
                            ${exp.Estado}
                        </span>
                    </div>
                </div>

                <!-- Detalles del Choque -->
                <p style="margin: 0 0 15px 0; font-size: 0.95em; color: var(--text-color);">
                    📍 <strong>Lugar:</strong> ${exp.Lugar || 'No especificado'}<br>
                    🚗 <strong>Aseguradora:</strong> ${exp.Seguro || 'N/A'}
                </p>

                <!-- Archivos Adjuntos -->
                <div style="background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    <strong style="font-size: 0.9em; display: block; margin-bottom: 10px;">📎 Archivos del Expediente:</strong>
                    <div id="archivos-muro-${folio}" style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <span style="font-size: 0.85em; color: var(--text-muted);">Cargando archivos...</span>
                    </div>
                </div>

                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 15px 0;">

                <!-- Zona de Comentarios -->
                <strong style="font-size: 0.9em; display: block; margin-bottom: 10px;">💬 Comentarios del equipo:</strong>
                <div id="comentarios-muro-${folio}" style="max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; padding-right: 5px;">
                    <span style="font-size: 0.85em; color: var(--text-muted);">Cargando comentarios...</span>
                </div>

                <!-- Input para comentar -->
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="text" id="input-comentario-${folio}" placeholder="Escribe un comentario público..." style="flex: 1; padding: 12px; border-radius: 25px; border: 1px solid var(--border-color); background: var(--panel-bg); color: var(--text-color); outline: none;">
                    <button onclick="enviarComentarioMuro(${folio})" style="background: var(--primary-color); color: white; border: none; padding: 10px 20px; border-radius: 25px; font-weight: bold; cursor: pointer; transition: 0.2s;">Publicar</button>
                </div>
            `;

            contenedor.appendChild(card);

            // Cargar datos asíncronos para cada post
            cargarArchivosPost(folio);
            cargarComentariosPost(folio);
        }
    } catch (error) {
        contenedor.innerHTML = '<p style="text-align: center; color: #e74c3c;">Error al cargar el muro.</p>';
    }
}

async function cargarArchivosPost(folio) {
    const contenedor = document.getElementById(`archivos-muro-${folio}`);
    try {
        const res = await fetch(`http://localhost:3000/api/documentos/${folio}`);
        if(res.ok) {
            const data = await res.json();
            let html = '';
            let cantArchivos = 0;

            // 1. Dibujamos los archivos individuales
            data.documentos.forEach(doc => {
                if(doc.RutaArchivo !== 'NO_REQUERIDO') {
                    cantArchivos++;
                    const url = `http://localhost:3000/${doc.RutaArchivo.replace(/\\/g, '/')}`;
                    html += `
                        <a href="${url}" target="_blank" download style="background: var(--bg-color); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 8px; text-decoration: none; color: var(--text-color); font-size: 0.85em; display: flex; align-items: center; gap: 5px; transition: 0.2s;">
                            📄 ${doc.TipoDocumento} <span style="color: var(--primary-color);">📥</span>
                        </a>
                    `;
                }
            });

            // 2. Si hay archivos, agregamos el Botón Masivo elegante para el muro
            if (cantArchivos > 0) {
                html += `
                    <div style="width: 100%; display: flex; justify-content: flex-end; margin-top: 5px;">
                        <button type="button" onclick="descargarArchivosMasivo(${folio})" style="background: transparent; color: #3498db; border: none; cursor: pointer; font-weight: bold; font-size: 0.85em; display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 5px; transition: background 0.2s;">
                            🗃️ Descargar los ${cantArchivos} archivos
                        </button>
                    </div>
                `;
            }

            contenedor.innerHTML = html || '<span style="font-size: 0.85em; color: var(--text-muted);">No hay archivos subidos aún.</span>';
        }
    } catch (error) { contenedor.innerHTML = '<span style="font-size: 0.85em; color: #e74c3c;">Error al cargar archivos.</span>'; }
}

async function cargarComentariosPost(folio) {
    const contenedor = document.getElementById(`comentarios-muro-${folio}`);
    try {
        const res = await fetch(`http://localhost:3000/api/comentarios-muro/${folio}`);
        if (res.ok) {
            const comentarios = await res.json();
            let html = '';

            comentarios.forEach(c => {
                const fechaC = new Date(c.Fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

                // 2. EVALUAR FOTO DE QUIEN COMENTA
                let htmlAvatarComentario = '';
                if (c.FotoPerfil) {
                    htmlAvatarComentario = `<img src="http://localhost:3000/${c.FotoPerfil}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color); flex-shrink: 0; align-self: flex-start; margin-top: 2px;">`;
                } else {
                    const inicial = c.Autor.charAt(0).toUpperCase();
                    const colorFondo = obtenerColorPorNombre(c.Autor);
                    htmlAvatarComentario = `
                        <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${colorFondo}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8em; flex-shrink: 0; align-self: flex-start; margin-top: 2px;">
                            ${inicial}
                        </div>`;
                }

                html += `
                    <div style="display: flex; gap: 12px; margin-bottom: 10px;">
                        
                        ${htmlAvatarComentario}

                        <div style="background: var(--panel-bg); padding: 12px; border-radius: 12px; border-top-left-radius: 0; flex: 1; border: 1px solid var(--border-color);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <strong style="font-size: 0.9em; color: var(--text-color);">${c.Autor}</strong>
                                <span style="font-size: 0.75em; color: var(--text-muted);">${fechaC}</span>
                            </div>
                            <div style="font-size: 0.9em; color: var(--text-color); line-height: 1.4;">${c.Mensaje}</div>
                        </div>
                    </div>
                `;
            });

            contenedor.innerHTML = html || '<span style="font-size: 0.85em; color: var(--text-muted); text-align: center; display: block; padding: 10px;">Sé el primero en comentar...</span>';
            contenedor.scrollTop = contenedor.scrollHeight;
        } else {
            contenedor.innerHTML = '<span style="font-size: 0.85em; color: var(--text-muted);">Aún no hay comentarios.</span>';
        }
    } catch (error) {
        contenedor.innerHTML = '<span style="font-size: 0.85em; color: var(--text-muted);">Los comentarios requieren conexión a la BD.</span>';
    }
}

async function enviarComentarioMuro(folio) {
    const input = document.getElementById(`input-comentario-${folio}`);
    const mensaje = input.value.trim();

    if(!mensaje) return;

    try {
        const res = await fetch(`http://localhost:3000/api/comentarios-muro/${folio}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ autor: nombreUsuario, mensaje: mensaje })
        });

        if(res.ok) {
            input.value = '';
            cargarComentariosPost(folio);
        }
    } catch (error) {
        alert("Error al enviar el comentario.");
    }
}

// ==========================================
// FUNCIÓN GLOBAL PARA MOSTRAR MENSAJITOS (TOAST)
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
        const formData = new FormData();
        formData.append('telefono', document.getElementById('telefonoPerfil').value.trim());
        const foto = document.getElementById('inputFotoPerfil').files[0];
        if (foto) formData.append('fotoPerfil', foto);

        try {
            const res = await fetch(`http://localhost:3000/api/perfil/${miUsuarioIdGbl}`, { method: 'POST', body: formData });
            if (res.ok) {
                cargarDatosPerfil();
                cerrarModalPerfil();
                cargarMuro(); // Para que las fotos se refresquen inmediatamente en el foro
            }
        } catch (error) {}
    });
}

// INICIO DEL FORO
document.addEventListener("DOMContentLoaded", () => {
    cargarDatosPerfil();
    cargarMuro();
});