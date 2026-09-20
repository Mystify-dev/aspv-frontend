# 🛡️ ASPV - Sistema Integral de Gestión de Siniestros

![Status](https://img.shields.io/badge/Estado-Operativo-success)
![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green)
![Base de Datos](https://img.shields.io/badge/Database-MySQL-orange)

Plataforma web full-stack desarrollada para la automatización, control de expedientes, penalizaciones por tiempo y seguimiento en tiempo real de siniestros viales.

---

## 🚀 Características Principales

### 👥 1. Sistema de Roles y Privacidad
* **Ajustadores (`index.html`):** Panel privado para registrar siniestros con datos detallados (póliza, seguro, monto, relatoría), subida de documentos e historial de casos propios.
* **Analistas (`resumen.html`):** Vista centralizada para auditar documentación, modificar estados del siniestro (*En Análisis*, *En Ajuste*, *Concluido*), emitir reportes en PDF y solicitar correcciones.
* **Administradores (`admin.html`):** Control global del sistema. Visualización de KPIs gerenciales, gráficas de rendimiento mediante **Chart.js** y módulo de gestión de personal (altas y bajas de empleados).

### 🔄 2. Flujo de Trabajo Inteligente ("Ping-Pong" de Turnos)
* **Gestión Documental (DOA, ORD, PM):** Subida de archivos PDF/Imágenes o marcado de casillas de excepción (*No Aplica / N/A*).
* **Bloqueo por Turnos:** Mecanismo de control donde las interacciones se alternan estrictamente entre el Analista y el Ajustador.
* **Rechazo Estricto de Documentos:** Si un analista detecta un archivo erróneo, puede rechazarlo; esto elimina el registro en la base de datos y bloquea las respuestas del ajustador hasta que vuelva a cargar el documento correcto.

### 🔔 3. Sistema de Notificaciones en Tiempo Real
* **Campanita Interactiva:** Panel flotante integrado en la barra superior para todos los roles.
* **Polling Silencioso:** Consultas automáticas cada 10 segundos al backend para verificar alertas pendientes.
* **Alertas Personalizadas:** Inyección dinámica de remitentes reales en las notificaciones.

### ⏱️ 4. Reloj de 24 Horas y Calendario Operativo
* Control de tiempo preciso basado en la fecha y hora exacta de creación del expediente con alertas visuales dinámicas para penalizaciones.
* **Calendario (`calendario.html`):** Vista mensual interactiva que mapea los siniestros por día y estado actual.

### 📊 5. Reportes y Accesibilidad
* **Generador de PDF Automático:** Creación de reportes de cierre de siniestro mediante **jsPDF** al concluir un caso.
* **Exportación CSV:** Descarga masiva del registro de siniestros para análisis administrativo.
* **Accesibilidad UI:** Conmutador de Tema Claro / Oscuro y ajuste dinámico de tamaño de fuente.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** HTML5, CSS3 (Variables CSS personalizadas y diseño responsivo), JavaScript Vanilla (ES6+).
* **Librerías Externas:** Chart.js (Gráficas analíticas), jsPDF & jsPDF-AutoTable (Generación de reportes PDF).
* **Backend:** Node.js, Express.js.
* **Base de Datos:** MySQL (con `mysql2/promise`).
* **Seguridad:** Encriptación de contraseñas con `bcrypt` y control de sesiones mediante `localStorage`.

---

## ⚙️ Instalación y Configuración Local

### Prerrequisitos
* Servidor local para archivos estáticos (Ej. extensión Live Server en VSCode o WebStorm).
* Repositorio del Backend (`aspv-backend`) ejecutándose en el puerto `3000`.

### Pasos de Instalación
1. Clona el repositorio del Frontend:
   ```bash
   git clone [https://github.com/TU_USUARIO/aspv-frontend.git](https://github.com/TU_USUARIO/aspv-frontend.git)

2. Navega al directorio del proyecto:
      ```bash
   cd aspv-frontend
   
3. Ejecuta el proyecto abriendo login.html a través de tu servidor local.

## 📂 Estructura del Proyecto (Por el Momento)
```bash 
aspv-frontend/
│
├── index.html        # Vista y layout de Ajustadores
├── resumen.html      # Vista y layout del Analista
├── admin.html        # Vista y layout del Administrador / Gerencia
├── calendario.html   # Módulo de calendario y agenda visual
├── login.html        # Módulo de autenticación segura
├── style.css         # Estilos globales y sistema de temas
├── app.js            # Lógica y controlador del Ajustador
├── resumen.js        # Lógica y controlador del Analista
├── admin.js          # Lógica y controlador del Administrador
└── imagenes/         # Recursos gráficos y logotipos 
```

## 🗺️ Próximos Pasos (Roadmap)
- Optimización de la vista móvil para el módulo del calendario.

- Implementación de filtros avanzados en la exportación a Excel.

## 👨‍💻 Autor
Desarrollado por Hermilo Broca como solución de software para la empresa ASPV.

Este proyecto fue estructurado y desarrollado como parte integral de mis Prácticas Profesionales:

- Universidad: Universidad Autónoma de Yucatán (UADY)

- Facultad: Facultad de Matemáticas (FMAT)

- Grado: 7mo Semestre