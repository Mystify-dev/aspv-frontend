document.addEventListener("DOMContentLoaded", () => {
    // ---------------------------------------------------------
    // -1. MOSTRAR LA SESIÓN ACTUAL EN LA BARRA LATERAL
    // ---------------------------------------------------------
    const miNombreSesion = localStorage.getItem('aspv_nombre') || 'Usuario';
    const miRolSesion = localStorage.getItem('aspv_rol') || 'Personal';

    const domNombre = document.getElementById('miNombreSesion');
    const domRol = document.getElementById('miRolSesion');
    const domInicial = document.getElementById('miInicialSesion');

    if (domNombre) domNombre.innerText = miNombreSesion;
    if (domRol) domRol.innerText = miRolSesion;
    if (domInicial) domInicial.innerText = miNombreSesion.charAt(0).toUpperCase();

    // ---------------------------------------------------------
    // INICIALIZACIÓN DE SOCKET.IO Y ESTADO DEL USUARIO
    // ---------------------------------------------------------
    const socket = io(); // Asegúrate de que el script de socket.io esté cargado en tu HTML
    const miUsuarioIdGbl = localStorage.getItem('aspv_id');

    let idContactoActual = null; // Para el estado (En línea/Última vez)
    let usuarioDestinoActual = null; // Para saber a quién le enviamos mensajes en la BD

    // Registrar nuestro usuario en el servidor al conectar
    if (miUsuarioIdGbl) {
        socket.emit('registerUser', miUsuarioIdGbl);
    }

    // Referencia al elemento HTML donde se mostrará el estado
    const estadoContactoActivo = document.getElementById('estadoContactoActivo');

    // Escuchar cambios de estado desde el servidor
    socket.on('estadoUsuarioCambio', (data) => {
        // Solo actualizamos la UI si el cambio de estado es del contacto actual
        if (idContactoActual && data.userId.toString() === idContactoActual.toString()) {
            actualizarEstadoUI(data.estado, data.ultimaVez);
        }
    });

    function actualizarEstadoUI(estado, ultimaVez = null) {
        if (!estadoContactoActivo) return;

        if (estado === 'online') {
            estadoContactoActivo.innerText = 'En línea';
            estadoContactoActivo.style.color = '#2ecc71'; // Verde
        } else {
            if (ultimaVez) {
                const fecha = new Date(ultimaVez);
                const horaFormateada = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                estadoContactoActivo.innerText = `Última vez hoy a las ${horaFormateada}`;
            } else {
                estadoContactoActivo.innerText = 'Desconectado';
            }
            estadoContactoActivo.style.color = 'var(--text-muted)'; // Gris
        }
    }


    // ---------------------------------------------------------
    // 0. CARGAR CONTACTOS Y CHATS RECIENTES
    // ---------------------------------------------------------
    let listaContactosGlobal = [];
    let chatsRecientesIds = []; // <--- Ya está vacío, lo llenará la base de datos

    const contenedorDeContactos = document.getElementById('contenedorDeContactos');
    const inputBuscarContacto = document.getElementById('inputBuscarContacto');

    async function cargarContactos() {
        if (!contenedorDeContactos) return;

        try {
            // 1. Pedimos la lista completa de empleados
            const respuesta = await fetch('http://localhost:3000/api/usuarios');

            // 2. Pedimos la lista REAL de tus chats recientes a la BD
            const respuestaRecientes = await fetch(`http://localhost:3000/api/chat/recientes/${miUsuarioIdGbl}`);

            if (respuesta.ok && respuestaRecientes.ok) {
                const todosLosUsuarios = await respuesta.json();
                chatsRecientesIds = await respuestaRecientes.json();

                // NUEVO: Buscar tu propia foto en la base de datos y pintarla abajo a la izquierda
                const miInfo = todosLosUsuarios.find(u => u.UsuarioID.toString() === miUsuarioIdGbl.toString());
                if (miInfo && miInfo.FotoPerfil && miInfo.FotoPerfil !== '') {
                    const imgEl = document.getElementById('miFotoImg');
                    const iniEl = document.getElementById('miInicialSesion');
                    if (imgEl && iniEl) {
                        imgEl.src = `http://localhost:3000/${miInfo.FotoPerfil}`;
                        imgEl.style.display = 'block';
                        iniEl.style.display = 'none';
                        document.getElementById('miFotoImg').parentElement.style.background = 'transparent';
                    }
                }

                listaContactosGlobal = todosLosUsuarios.filter(u => u.UsuarioID.toString() !== miUsuarioIdGbl.toString());
                renderizarChatsRecientes();
            }
        } catch (error) {
            contenedorDeContactos.innerHTML = '<p style="color:#e74c3c; text-align:center; font-size: 0.8em; margin-top: 20px;">Error al conectar con el directorio.</p>';
        }
    }

    // Función para pintar SOLO los chats con los que ya has hablado
    function renderizarChatsRecientes() {
        if (!contenedorDeContactos) return;
        contenedorDeContactos.innerHTML = '<div style="padding: 10px 15px; font-size: 0.8em; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">Chats Recientes</div>';

        // SOLUCIÓN A PRUEBA DE BALAS: Extraer el ID sin importar si viene como texto, número o un objeto de MySQL
        const idsSeguros = chatsRecientesIds.map(item => {
            if (typeof item === 'object' && item !== null) {
                return String(item.ContactoID || Object.values(item)[0]);
            }
            return String(item);
        });

        const recientes = listaContactosGlobal.filter(u => idsSeguros.includes(String(u.UsuarioID)));

        if (recientes.length === 0) {
            contenedorDeContactos.innerHTML += `
                <div style="text-align: center; padding: 30px 15px; color: var(--text-muted);">
                    <p style="font-size: 0.9em; margin: 0;">No tienes chats recientes.</p>
                </div>
            `;
            return;
        }

        dibujarLista(recientes);
    }

    function renderizarBusqueda(terminoBusqueda) {
        if (!contenedorDeContactos) return;
        const termino = terminoBusqueda.toLowerCase().trim();

        if (termino === '') {
            renderizarChatsRecientes();
            return;
        }

        contenedorDeContactos.innerHTML = '<div style="padding: 10px 15px; font-size: 0.8em; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">Directorio Global</div>';

        const filtrados = listaContactosGlobal.filter(u => {
            return u.Nombre.toLowerCase().includes(termino) ||
                u.Correo.toLowerCase().includes(termino) ||
                u.UsuarioID.toString().includes(termino);
        });

        if (filtrados.length === 0) {
            contenedorDeContactos.innerHTML += '<p style="text-align:center; color:gray; padding: 20px; font-size: 0.85em;">No se encontró a nadie en la institución.</p>';
            return;
        }

        dibujarLista(filtrados);
    }

    function dibujarLista(arregloUsuarios) {
        arregloUsuarios.forEach(u => {
            // Evaluamos si el usuario tiene foto en la base de datos
            let fotoHTML = '';
            if (u.FotoPerfil && u.FotoPerfil !== '') {
                fotoHTML = `<img src="http://localhost:3000/${u.FotoPerfil}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 1px solid var(--border-color);">`;
            } else {
                const inicial = u.Nombre.charAt(0).toUpperCase();
                fotoHTML = `<div style="width: 45px; height: 45px; border-radius: 50%; background-color: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">${inicial}</div>`;
            }

            contenedorDeContactos.innerHTML += `
                <div class="chat-item" style="display: flex; align-items: center; gap: 15px; padding: 15px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--panel-bg)'" onmouseout="this.style.background='transparent'" onclick="abrirChatGlobal(${u.UsuarioID}, '${u.Nombre}')">
                    
                    ${fotoHTML}
                    
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: baseline;">
                            <strong style="color: var(--text-color);">${u.Nombre}</strong>
                            <span style="font-size: 0.75em; color: var(--text-muted);">${u.Rol}</span>
                        </div>
                        <p style="margin: 3px 0 0 0; font-size: 0.85em; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                            Click para chatear
                        </p>
                    </div>
                </div>
            `;
        });
    }

    if (inputBuscarContacto) {
        inputBuscarContacto.addEventListener('input', (e) => {
            renderizarBusqueda(e.target.value);
        });
    }

    cargarContactos();


    // ---------------------------------------------------------
    // 1. NAVEGACIÓN Y PANELES DEL CHAT
    // ---------------------------------------------------------
    const btnPerfil = document.getElementById('btnPerfilContacto');
    const btnCerrarDetalles = document.getElementById('btnCerrarDetalles');
    const columnaDetalles = document.getElementById('columnaDetalles');

    const pantallaInicio = document.getElementById('pantallaInicioChat');
    const chatActivo = document.getElementById('chatActivo');
    const btnCerrarChat = document.getElementById('btnCerrarChat');
    const btnVolverInicio = document.getElementById('btnVolverInicio');

    if (btnVolverInicio) {
        btnVolverInicio.addEventListener('click', () => {
            const rol = localStorage.getItem('aspv_rol');
            if (rol === 'Admin') window.location.href = 'admin.html';
            else if (rol === 'Analista') window.location.href = 'resumen.html';
            else window.location.href = 'index.html';
        });
    }

    const volverAlInicioChat = () => {
        if(chatActivo) chatActivo.style.display = 'none';
        if(columnaDetalles) columnaDetalles.style.display = 'none';
        if(pantallaInicio) pantallaInicio.style.display = 'flex';
        idContactoActual = null;
        usuarioDestinoActual = null;
    };

    // Al hacer clic en un contacto de la lista
    window.abrirChatGlobal = (idDestino, nombreDestino) => {
        if (pantallaInicio) pantallaInicio.style.display = 'none';
        if (chatActivo) chatActivo.style.display = 'flex';
        if (columnaDetalles) columnaDetalles.style.display = 'none';

        // Pintar nombre en la cabecera central
        const nombreCabecera = document.getElementById('nombreUsuarioActivo');
        if (nombreCabecera) nombreCabecera.innerText = nombreDestino;

        // Pintar datos en el panel de Detalles y en la Cabecera Central
        const usuarioInfo = listaContactosGlobal.find(u => u.UsuarioID.toString() === idDestino.toString());
        if (usuarioInfo) {
            document.getElementById('detallesNombre').innerText = usuarioInfo.Nombre;
            document.getElementById('detallesCorreo').innerText = usuarioInfo.Correo;

            const imgDetalles = document.getElementById('detallesFotoImg');
            const inicialDetalles = document.getElementById('detallesInicialTexto');

            // Elementos de la cabecera central
            const imgCabecera = document.getElementById('cabeceraFotoImg');
            const inicialCabecera = document.getElementById('cabeceraInicialTexto');

            // Si el usuario tiene una foto guardada
            if (usuarioInfo.FotoPerfil && usuarioInfo.FotoPerfil !== '') {
                const urlFoto = `http://localhost:3000/${usuarioInfo.FotoPerfil}`;

                // Pintamos en Detalles (Derecha)
                if (imgDetalles) { imgDetalles.src = urlFoto; imgDetalles.style.display = 'block'; inicialDetalles.style.display = 'none'; }

                // Pintamos en Cabecera (Centro)
                if (imgCabecera) { imgCabecera.src = urlFoto; imgCabecera.style.display = 'block'; inicialCabecera.style.display = 'none'; }

            } else {
                const inicial = usuarioInfo.Nombre.charAt(0).toUpperCase();

                // Mostramos inicial en Detalles (Derecha)
                if (imgDetalles) { imgDetalles.style.display = 'none'; inicialDetalles.innerText = inicial; inicialDetalles.style.display = 'block'; }

                // Mostramos inicial en Cabecera (Centro)
                if (imgCabecera) { imgCabecera.style.display = 'none'; inicialCabecera.innerText = inicial; inicialCabecera.style.display = 'block'; }
            }
        }

        idContactoActual = idDestino;
        usuarioDestinoActual = idDestino;

        // 1. Consultar el estado en tiempo real (En línea) mediante Socket.io
        if (estadoContactoActivo) {
            estadoContactoActivo.innerText = 'Cargando estado...';
            estadoContactoActivo.style.color = 'var(--text-muted)';
        }
        socket.emit('consultarEstado', idDestino);

        // 2. Cargar el historial desde la base de datos
        cargarHistorialPrivado(idDestino);
    };

    // Función para descargar solo los mensajes privados entre tú y él
    async function cargarHistorialPrivado(idDestino) {
        const contenedorMensajes = document.getElementById('contenedorMensajes');
        contenedorMensajes.innerHTML = '<p style="text-align:center; color:gray; font-size: 0.85em; margin-top: 20px;">Cargando chat seguro...</p>';

        try {
            const res = await fetch(`http://localhost:3000/api/chat/${miUsuarioIdGbl}/${idDestino}`);
            if (res.ok) {
                const mensajes = await res.json();
                contenedorMensajes.innerHTML = '';

                if (mensajes.length === 0) {
                    contenedorMensajes.innerHTML = '<p style="text-align:center; color:gray; font-size: 0.85em; margin-top: 20px;">No hay mensajes aún. ¡Di hola!</p>';
                    return;
                }

                mensajes.forEach(msg => {
                    const soyYo = msg.RemitenteID.toString() === miUsuarioIdGbl.toString();
                    const hora = new Date(msg.Fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    const alineacion = soyYo ? 'align-self: flex-end;' : 'align-self: flex-start;';
                    const colorFondo = soyYo ? 'background: var(--primary-color); color: white;' : 'background: var(--panel-bg); color: var(--text-color); border: 1px solid var(--border-color);';
                    const radioBordes = soyYo ? 'border-radius: 15px 0 15px 15px;' : 'border-radius: 0 15px 15px 15px;';
                    const ticks = soyYo ? '✓✓' : '';

                    let htmlArchivo = '';
                    if (msg.ArchivoRuta) {
                        const urlCompleta = `http://localhost:3000/${msg.ArchivoRuta}`;
                        htmlArchivo = `
                            <a href="${urlCompleta}" target="_blank" style="background: rgba(0,0,0,0.1); padding: 8px; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-size: 0.85em; color: inherit; text-decoration: none; margin-bottom: 5px;">
                                <span style="font-size: 1.5em;">📄</span>
                                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px;">${msg.ArchivoNombre}</span>
                            </a>
                        `;
                    }

                    let htmlTexto = msg.Texto ? `<p style="margin: 0;">${msg.Texto}</p>` : '';

                    contenedorMensajes.innerHTML += `
                        <div style="${alineacion} ${colorFondo} ${radioBordes} padding: 12px 18px; max-width: 70%; display: flex; flex-direction: column;">
                            ${htmlArchivo}
                            ${htmlTexto}
                            <div style="font-size: 0.7em; opacity: 0.7; text-align: right; margin-top: 4px;">${hora} ${ticks}</div>
                        </div>
                    `;
                });
                contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;

                // NUEVO: Enviamos los mensajes a la barra lateral para clasificarlos
                clasificarArchivosSidebar(mensajes);
            }
        } catch (error) {
            contenedorMensajes.innerHTML = '<p style="text-align:center; color:#e74c3c;">Error al cargar el historial.</p>';
        }
    }

    if (btnCerrarChat) btnCerrarChat.addEventListener('click', volverAlInicioChat);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') volverAlInicioChat();
    });

    if (btnPerfil && columnaDetalles) {
        btnPerfil.addEventListener('click', () => {
            columnaDetalles.style.display = (columnaDetalles.style.display === 'none' || columnaDetalles.style.display === '') ? 'flex' : 'none';
        });
    }
    if (btnCerrarDetalles && columnaDetalles) {
        btnCerrarDetalles.addEventListener('click', () => {
            columnaDetalles.style.display = 'none';
        });
    }

    // ---------------------------------------------------------
    // 2. MENÚ FLOTANTE Y PREVISUALIZACIÓN DE ARCHIVOS
    // ---------------------------------------------------------
    const btnClipAdjuntar = document.getElementById('btnClipAdjuntar');
    const menuAdjuntos = document.getElementById('menuAdjuntos');
    const optDocumento = document.getElementById('optDocumento');
    const optFotos = document.getElementById('optFotos');
    const optCamara = document.getElementById('optCamara');

    const inputDocumento = document.getElementById('inputDocumento');
    const inputFotos = document.getElementById('inputFotos');
    const inputCamara = document.getElementById('inputCamara');

    const previewAdjunto = document.getElementById('previewAdjunto');
    const previewNombre = document.getElementById('previewNombre');
    const previewIcono = document.getElementById('previewIcono');
    const btnCancelarAdjunto = document.getElementById('btnCancelarAdjunto');

    let archivoPendiente = null;

    if (btnClipAdjuntar && menuAdjuntos) {
        btnClipAdjuntar.addEventListener('click', (e) => {
            e.stopPropagation();
            menuAdjuntos.style.display = (menuAdjuntos.style.display === 'none' || menuAdjuntos.style.display === '') ? 'flex' : 'none';
        });
    }

    document.addEventListener('click', (e) => {
        if (menuAdjuntos && menuAdjuntos.style.display === 'flex' && !menuAdjuntos.contains(e.target) && !btnClipAdjuntar.contains(e.target)) {
            menuAdjuntos.style.display = 'none';
        }
    });

    const triggerClick = (elemento) => {
        if(elemento) { elemento.click(); menuAdjuntos.style.display = 'none'; }
    };

    if (optDocumento) optDocumento.addEventListener('click', () => triggerClick(inputDocumento));
    if (optFotos) optFotos.addEventListener('click', () => triggerClick(inputFotos));
    if (optCamara) optCamara.addEventListener('click', () => triggerClick(inputCamara));

    const manejarArchivosSeleccionados = (e) => {
        if (e.target.files.length > 0) {
            archivoPendiente = e.target.files[0];
            previewNombre.innerText = archivoPendiente.name;
            previewIcono.innerText = archivoPendiente.type.startsWith('image') || archivoPendiente.type.startsWith('video') ? '🖼️' : '📄';

            if (previewAdjunto) previewAdjunto.style.display = 'flex';

            const inputTxt = document.getElementById('inputNuevoMensaje');
            if (inputTxt) inputTxt.focus();
        }
    };

    if(inputDocumento) inputDocumento.addEventListener('change', manejarArchivosSeleccionados);
    if(inputFotos) inputFotos.addEventListener('change', manejarArchivosSeleccionados);
    if(inputCamara) inputCamara.addEventListener('change', manejarArchivosSeleccionados);

    if (btnCancelarAdjunto) {
        btnCancelarAdjunto.addEventListener('click', () => {
            archivoPendiente = null;
            previewAdjunto.style.display = 'none';
            inputDocumento.value = '';
            inputFotos.value = '';
            inputCamara.value = '';
        });
    }

    // ---------------------------------------------------------
    // 3. ENVIAR MENSAJES (TEXTO Y/O ARCHIVOS) A LA BASE DE DATOS
    // ---------------------------------------------------------
    const btnEnviarMensaje = document.getElementById('btnEnviarMensaje');
    const inputNuevoMensaje = document.getElementById('inputNuevoMensaje');
    const contenedorMensajes = document.getElementById('contenedorMensajes');

    const enviarMensaje = async () => {
        const texto = inputNuevoMensaje.value.trim();

        if ((texto !== '' || archivoPendiente !== null) && usuarioDestinoActual) {
            const formData = new FormData();
            formData.append('remitenteId', miUsuarioIdGbl);
            formData.append('destinatarioId', usuarioDestinoActual);
            formData.append('texto', texto);

            if (archivoPendiente) {
                formData.append('archivo', archivoPendiente);
            }

            try {
                // Enviamos los datos reales al backend
                await fetch('http://localhost:3000/api/chat', {
                    method: 'POST',
                    body: formData
                });

                // (Opcional) Avisamos por Socket.io para que el otro usuario reciba notificación
                socket.emit('sendMessage', { receiverId: usuarioDestinoActual });

                // Limpiamos los campos
                inputNuevoMensaje.value = '';
                archivoPendiente = null;
                const previewAdjunto = document.getElementById('previewAdjunto');
                if(previewAdjunto) previewAdjunto.style.display = 'none';

                // Recargamos el historial para ver el mensaje nuevo
                cargarHistorialPrivado(usuarioDestinoActual);

                // NUEVO: Recargar la barra lateral para que el chat aparezca en Recientes de inmediato
                cargarContactos();

            } catch (error) {
                alert("Error al enviar el mensaje. Intenta de nuevo.");
            }
        }
    };

    if (btnEnviarMensaje) btnEnviarMensaje.addEventListener('click', enviarMensaje);
    if (inputNuevoMensaje) {
        inputNuevoMensaje.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') enviarMensaje();
        });
    }

    // ---------------------------------------------------------
    // 4. LÓGICA DE PESTAÑAS Y VISOR MULTIMEDIA (ESTILO WHATSAPP)
    // ---------------------------------------------------------
    window.cambiarTab = (tab) => {
        ['Media', 'Docs', 'Links'].forEach(t => {
            document.getElementById(`tab${t}`).style.color = 'var(--text-muted)';
            document.getElementById(`tab${t}`).style.borderBottom = 'none';
            document.getElementById(`contenido${t}`).style.display = 'none';
        });

        document.getElementById(`tab${tab}`).style.color = '#2ecc71';
        document.getElementById(`tab${tab}`).style.borderBottom = '2px solid #2ecc71';

        const displayType = tab === 'Media' ? 'grid' : 'flex';
        document.getElementById(`contenido${tab}`).style.display = displayType;
    };

    window.abrirVisor = (url, tipo, nombreArchivo) => {
        const visor = document.getElementById('visorMultimedia');
        const img = document.getElementById('visorImg');
        const vid = document.getElementById('visorVid');
        const btnDescargar = document.getElementById('btnDescargarVisor');

        img.style.display = 'none';
        vid.style.display = 'none';

        if (tipo === 'imagen') {
            img.src = url;
            img.style.display = 'block';
        } else if (tipo === 'video') {
            vid.src = url;
            vid.style.display = 'block';
        }

        btnDescargar.href = url;
        btnDescargar.download = nombreArchivo;
        visor.style.display = 'flex';
    };

    window.cerrarVisor = () => {
        document.getElementById('visorMultimedia').style.display = 'none';
        document.getElementById('visorVid').pause();
    };

    function clasificarArchivosSidebar(mensajes) {
        const contMedia = document.getElementById('contenidoMedia');
        const contDocs = document.getElementById('contenidoDocs');
        const contLinks = document.getElementById('contenidoLinks');

        contMedia.innerHTML = ''; contDocs.innerHTML = ''; contLinks.innerHTML = '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        mensajes.forEach(msg => {
            // 1. Extraer enlaces del texto
            if (msg.Texto) {
                const links = msg.Texto.match(urlRegex);
                if (links) {
                    links.forEach(link => {
                        contLinks.innerHTML += `
                            <a href="${link}" target="_blank" style="background: var(--bg-color); padding: 10px; border-radius: 8px; text-decoration: none; color: #3498db; word-break: break-all; font-size: 0.85em; border: 1px solid var(--border-color);">
                                🔗 ${link}
                            </a>
                        `;
                    });
                }
            }

            // 2. Clasificar archivos
            if (msg.ArchivoRuta) {
                const ext = msg.ArchivoNombre.split('.').pop().toLowerCase();
                const esImagen = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                const esVideo = ['mp4', 'mov', 'webm'].includes(ext);
                const urlCompleta = `http://localhost:3000/${msg.ArchivoRuta}`;
                const fechaFormat = new Date(msg.Fecha).toLocaleDateString();

                if (esImagen || esVideo) {
                    const tipo = esImagen ? 'imagen' : 'video';
                    const thumbnail = esImagen ? `<img src="${urlCompleta}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; cursor: pointer;">` : `<div style="width: 100%; height: 100px; background: #222; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white;">▶️</div>`;

                    contMedia.innerHTML += `
                        <div onclick="abrirVisor('${urlCompleta}', '${tipo}', '${msg.ArchivoNombre}')" style="transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            ${thumbnail}
                        </div>
                    `;
                } else {
                    // Documentos (PDF, DOCX, ZIP, etc.)
                    contDocs.innerHTML += `
                        <a href="${urlCompleta}" download="${msg.ArchivoNombre}" target="_blank" style="display: flex; gap: 10px; align-items: center; background: var(--bg-color); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); text-decoration: none; color: var(--text-color);">
                            <span style="font-size: 1.8em; color: #e74c3c;">📄</span>
                            <div style="flex: 1; overflow: hidden;">
                                <p style="margin: 0; font-size: 0.85em; font-weight: bold; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${msg.ArchivoNombre}</p>
                                <span style="font-size: 0.7em; color: var(--text-muted);">${ext.toUpperCase()} • ${fechaFormat}</span>
                            </div>
                        </a>
                    `;
                }
            }
        });

        // Mensajes de vacío si no hay elementos
        if (contMedia.innerHTML === '') contMedia.innerHTML = '<p style="grid-column: span 3; text-align: center; color: gray; font-size: 0.85em; margin-top: 20px;">No hay archivos multimedia.</p>';
        if (contDocs.innerHTML === '') contDocs.innerHTML = '<p style="text-align: center; color: gray; font-size: 0.85em; margin-top: 20px;">No hay documentos.</p>';
        if (contLinks.innerHTML === '') contLinks.innerHTML = '<p style="text-align: center; color: gray; font-size: 0.85em; margin-top: 20px;">No hay enlaces.</p>';
    }

});