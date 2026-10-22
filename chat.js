document.addEventListener("DOMContentLoaded", () => {
    // ---------------------------------------------------------
    // 1. NAVEGACIÓN Y PANELES DEL CHAT
    // ---------------------------------------------------------
    const btnPerfil = document.getElementById('btnPerfilContacto');
    const btnCerrarDetalles = document.getElementById('btnCerrarDetalles');
    const columnaDetalles = document.getElementById('columnaDetalles');
    const itemChatKevin = document.getElementById('itemChatKevin');
    const pantallaInicio = document.getElementById('pantallaInicioChat');
    const chatActivo = document.getElementById('chatActivo');
    const btnCerrarChat = document.getElementById('btnCerrarChat');
    const btnVolverInicio = document.getElementById('btnVolverInicio');

    // Volver al Panel Principal (Manejo de Roles)
    if (btnVolverInicio) {
        btnVolverInicio.addEventListener('click', () => {
            const rol = localStorage.getItem('aspv_rol');
            if (rol === 'Admin') window.location.href = 'admin.html';
            else if (rol === 'Analista') window.location.href = 'resumen.html';
            else window.location.href = 'index.html';
        });
    }

    // Cerrar el chat actual y limpiar pantalla
    const volverAlInicioChat = () => {
        if(chatActivo) chatActivo.style.display = 'none';
        if(columnaDetalles) columnaDetalles.style.display = 'none';
        if(pantallaInicio) pantallaInicio.style.display = 'flex';
    };

    // Abrir un chat desde la lista
    if (itemChatKevin) {
        itemChatKevin.addEventListener('click', () => {
            pantallaInicio.style.display = 'none';
            chatActivo.style.display = 'flex';
            columnaDetalles.style.display = 'none';
        });
    }

    // Botón Atrás (Flecha) y Tecla ESCAPE
    if (btnCerrarChat) btnCerrarChat.addEventListener('click', volverAlInicioChat);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') volverAlInicioChat();
    });

    // Abrir/Cerrar la columna derecha (Detalles)
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
    // 2. MENÚ FLOTANTE DE ADJUNTOS (ESTILO WHATSAPP)
    // ---------------------------------------------------------
    const btnClipAdjuntar = document.getElementById('btnClipAdjuntar');
    const menuAdjuntos = document.getElementById('menuAdjuntos');
    const optDocumento = document.getElementById('optDocumento');
    const optFotos = document.getElementById('optFotos');
    const optCamara = document.getElementById('optCamara');

    const inputDocumento = document.getElementById('inputDocumento');
    const inputFotos = document.getElementById('inputFotos');
    const inputCamara = document.getElementById('inputCamara');

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

    if (optDocumento) {
        optDocumento.addEventListener('click', () => {
            inputDocumento.click();
            menuAdjuntos.style.display = 'none';
        });
    }
    if (optFotos) {
        optFotos.addEventListener('click', () => {
            inputFotos.click();
            menuAdjuntos.style.display = 'none';
        });
    }
    if (optCamara) {
        optCamara.addEventListener('click', () => {
            inputCamara.click();
            menuAdjuntos.style.display = 'none';
        });
    }

    const manejarArchivosSeleccionados = (e) => {
        if (e.target.files.length > 0) {
            console.log(`Seleccionaste ${e.target.files.length} archivo(s). Input: ${e.target.id}`);
            // TODO: Enviar archivo por Socket.io
        }
    };

    if(inputDocumento) inputDocumento.addEventListener('change', manejarArchivosSeleccionados);
    if(inputFotos) inputFotos.addEventListener('change', manejarArchivosSeleccionados);
    if(inputCamara) inputCamara.addEventListener('change', manejarArchivosSeleccionados);

    // ---------------------------------------------------------
    // 3. ENVIAR MENSAJES EN TIEMPO REAL (PRUEBA VISUAL)
    // ---------------------------------------------------------
    const btnEnviarMensaje = document.getElementById('btnEnviarMensaje');
    const inputNuevoMensaje = document.getElementById('inputNuevoMensaje');
    const contenedorMensajes = document.getElementById('contenedorMensajes');

    const enviarMensaje = () => {
        const texto = inputNuevoMensaje.value.trim();

        if (texto !== '') {
            // 1. Crear y mostrar el mensaje en el chat central
            const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const burbuja = document.createElement('div');

            burbuja.style.cssText = "align-self: flex-end; background: var(--primary-color); padding: 12px 18px; border-radius: 15px 0 15px 15px; max-width: 70%; color: white;";
            burbuja.innerHTML = `
                <p style="margin: 0;">${texto}</p>
                <div style="font-size: 0.7em; color: rgba(255,255,255,0.7); text-align: right; margin-top: 5px;">${horaActual} ✓</div>
            `;

            contenedorMensajes.appendChild(burbuja);
            inputNuevoMensaje.value = '';
            contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;

            // 2. Actualizar el texto previo en la barra lateral izquierda (Para que se vea realista)
            if (itemChatKevin) {
                const previewTexto = itemChatKevin.querySelector('p');
                const previewHora = itemChatKevin.querySelector('span');

                if (previewTexto) previewTexto.innerText = "Tú: " + texto;
                if (previewHora) previewHora.innerText = horaActual;
            }
        }
    };

    // Escuchar clic en "Enviar" y tecla "Enter"
    if (btnEnviarMensaje) {
        btnEnviarMensaje.addEventListener('click', enviarMensaje);
    }

    if (inputNuevoMensaje) {
        inputNuevoMensaje.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') enviarMensaje();
        });
    }
});