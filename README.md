# 🛡️ ASPV Frontend - Sistema Integral de Gestión de Siniestros

![Estado](https://img.shields.io/badge/Estado-En%20desarrollo-yellow)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socketdotio&logoColor=white)
![Backend](https://img.shields.io/badge/Backend-aspv--backend-339933?logo=nodedotjs&logoColor=white)

Cliente web (HTML, CSS y JavaScript sin framework) para la gestión de expedientes de siniestros viales de ASPV: captura de documentación, auditoría, control de tiempos y penalizaciones, nómina, mensajería interna en tiempo real y reportes. Consume la API REST y los WebSockets de `aspv-backend`.

---

## 🚀 Módulos y Vistas

El acceso se controla por rol, almacenado en `localStorage` tras iniciar sesión. Los roles definidos son `Ajustador`, `Analista`, `Analista de Pagos` y `Admin`.

| Vista | Archivo | Roles | Descripción |
|-------|---------|-------|-------------|
| Inicio de sesión | `login.html` | Todos | Autenticación, aceptación obligatoria de Términos y Condiciones (v1.0) y redirección según rol. |
| Mis Expedientes | `index.html` | Ajustador | Alta de siniestros (folio, póliza, aseguradora, cobertura, kilometraje, relatoría, marca de siniestro complementario), carga de documentos DOA/ORD/PM y fotografías, historial propio y exportación a Excel. |
| Panel de Análisis | `resumen.html` | Analista, Admin | KPIs, bandeja de revisión agrupada por ajustador, rechazo de documentos, cambio de estado (*En Análisis*, *En Ajuste*, *Concluido*), descarga masiva y reporte PDF al concluir. |
| Panel de Pagos | `pagos.html` | Analista de Pagos, Admin | Nómina por mes y quincena, sueldos fijos, tabulador de tarifas por ajustador (local, foráneo, km, km Inbursa), auditoría de documentos y exportación a Excel. |
| Gerencia y Usuarios | `admin.html` | Admin | Directorio de personal, altas, ediciones y bajas, KPIs de plantilla y estado en línea en tiempo real. |
| Calendario | `calendario.html` | Todos | Calendario mensual/semanal (FullCalendar) con siniestros por día, coloreados por estado. |
| Mensajes Operativos | `chat.html` | Todos | Chat privado 1 a 1 con Socket.io: estado en línea/última conexión, adjuntos (documentos, fotos, video, cámara) y panel de archivos y enlaces compartidos. |
| Muro Global | `muro.html` | Todos | Feed de siniestros con archivos descargables y comentarios del equipo. |

### Funcionalidades transversales
* **Tiempo real (Socket.io):** presencia de usuarios y contador de mensajes no leídos.
* **Notificaciones:** panel de alertas con consulta periódica (cada 10 s) a la API y opción de marcar como leídas.
* **Reportes:** PDF de cierre de siniestro con jsPDF y jsPDF-AutoTable; exportaciones a Excel (`.xlsx`) generadas por el backend.
* **Perfil de usuario:** foto y teléfono editables desde cualquier vista.
* **Accesibilidad:** tema claro/oscuro y tamaño de texto ajustable, persistidos en `localStorage`.

---

## 🛠️ Tecnologías

* **Frontend:** HTML5, CSS3 (variables personalizadas y temas) y JavaScript ES6+.
* **Librerías (CDN):** Socket.io Client 4.7.2, FullCalendar 6.1.10, jsPDF 2.5.1 y jsPDF-AutoTable 3.5.31.
* **Dependencias npm:** `socket.io-client` (ver `package.json`).
* **Backend requerido:** `aspv-backend` (Node.js/Express), puerto `3000`.

---

## 📂 Estructura del Proyecto

```text
aspv-frontend/
├── assets/
│   └── img/
│       └── LogoASPV.jpg
├── css/
│   └── style.css          # Estilos globales y sistema de temas
├── js/
│   ├── admin.js           # Gestión de personal
│   ├── app.js             # Ajustador: expedientes y documentos
│   ├── calendario.js      # Calendario de siniestros
│   ├── chat.js            # Mensajería y Socket.io
│   ├── login.js           # Autenticación y enrutamiento por rol
│   ├── muro.js            # Muro global y comentarios
│   ├── pagos.js           # Nómina y tarifas
│   └── resumen.js         # Analista: revisión, cierre y PDF
├── admin.html
├── calendario.html
├── chat.html
├── index.html
├── login.html
├── muro.html
├── pagos.html
├── resumen.html
├── package.json
└── README.md
```

Los archivos `.html` permanecen en la raíz para conservar las URLs de navegación.

---

## ⚙️ Instalación y Configuración Local

### Requisitos
* Servidor estático local (Live Server, WebStorm, `npx serve`, etc.).
* `aspv-backend` en ejecución en el puerto `3000`.

### Pasos
```bash
git clone https://github.com/Mystify-dev/aspv-frontend.git
cd aspv-frontend
npm install
```

Sirve la carpeta con tu servidor estático y abre `login.html`.

### URL de la API
La URL del backend está definida directamente en el código como `http://localhost:3000` (peticiones `fetch` y conexión `io(...)`) dentro de los archivos de `js/` y en `login.html`. Si el backend corre en otro host o puerto, reemplaza esa cadena en esos archivos. No existe un archivo de configuración centralizado.

> `npm install` solo instala `socket.io-client`; las vistas cargan sus librerías desde CDN y requieren conexión a internet.

---

## 👨‍💻 Autor

**Hermilo Broca**
Ingeniería en Software, Facultad de Matemáticas (FMAT), Universidad Autónoma de Yucatán (UADY).

Solución desarrollada para ASPV como parte de las Prácticas Profesionales.
