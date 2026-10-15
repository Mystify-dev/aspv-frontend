// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================
const nombreUsuario = localStorage.getItem('aspv_nombre') || 'Usuario Desconocido';
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
            const inicial = exp.AjustadorNombre ? exp.AjustadorNombre.charAt(0).toUpperCase() : 'U';

            // Construir la tarjeta (Post)
            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = 'padding: 20px; border-radius: 12px; background: var(--bg-color); border: 1px solid var(--border-color); box-shadow: 0 4px 6px rgba(0,0,0,0.05);';

            card.innerHTML = `
                <!-- Cabecera del Post -->
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <div style="width: 45px; height: 45px; border-radius: 50%; background-color: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2em; font-weight: bold;">
                        ${inicial}
                    </div>
                    <div>
                        <strong style="font-size: 1.1em; color: var(--text-color);">${exp.AjustadorNombre}</strong>
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

            data.documentos.forEach(doc => {
                if(doc.RutaArchivo !== 'NO_REQUERIDO') {
                    const url = `http://localhost:3000/${doc.RutaArchivo.replace(/\\/g, '/')}`;
                    // Botón directo para descargar
                    html += `
                        <a href="${url}" target="_blank" download style="background: var(--bg-color); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 8px; text-decoration: none; color: var(--text-color); font-size: 0.85em; display: flex; align-items: center; gap: 5px; transition: 0.2s;">
                            📄 ${doc.TipoDocumento} <span style="color: var(--primary-color);">📥</span>
                        </a>
                    `;
                }
            });

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
                // Formatear fecha
                const fechaC = new Date(c.Fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

                html += `
                    <div style="background: var(--panel-bg); padding: 12px; border-radius: 12px; border-bottom-left-radius: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="font-size: 0.9em; color: var(--text-color);">${c.Autor}</strong>
                            <span style="font-size: 0.75em; color: var(--text-muted);">${fechaC}</span>
                        </div>
                        <div style="font-size: 0.9em; color: var(--text-color); line-height: 1.4;">${c.Mensaje}</div>
                    </div>
                `;
            });

            contenedor.innerHTML = html || '<span style="font-size: 0.85em; color: var(--text-muted); text-align: center; display: block; padding: 10px;">Sé el primero en comentar...</span>';
            contenedor.scrollTop = contenedor.scrollHeight; // Auto-scroll hacia abajo
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
            input.value = ''; // Limpiar input
            cargarComentariosPost(folio); // Recargar los comentarios de este post
        }
    } catch (error) {
        alert("Error al enviar el comentario.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarMuro();
});