# Análisis de Seguridad - Bebé en Camino
**Proyecto Integrador - OWASP Top 10:2025**

A continuación se presenta la matriz de análisis de riesgos críticos para la tienda online y panel de administración de **Bebé en Camino**, evaluando la aplicación frente al estándar OWASP Top 10:2025.

| Riesgo | ¿Aplica? | Dónde | Cómo podría explotarse | Solución | Prioridad | Responsable |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A01 Control de acceso roto** | Sí | `admin.html` / `admin.js` | Un usuario manipula las rutas o intenta acceder al panel de administración sin pasar por la autenticación. | Validar la sesión activa mediante `supabaseClient.auth.getSession()` antes de mostrar el panel de gestión. | Alta | Celia |
| **A02 Configuración incorrecta** | Sí | Conexión con Supabase en `app.js` | Exponer variables o configuraciones de depuración en entornos de producción. | Utilizar únicamente las llaves públicas necesarias (`anon key`) y restringir dominios de origen. | Alta | Celia |
| **A03 Cadena de suministro** | Sí | Paquetes y CDNs (Supabase, FontAwesome) | Inclusión de librerías de terceros vulnerables o comprometidas. | Mantener las dependencias auditadas y utilizar versiones oficiales mediante CDN verificadas. | Media | Celia |
| **A04 Fallas criptográficas** | Sí | Autenticación y almacenamiento | Credenciales o datos sensibles transmitidos sin cifrado adecuado. | Forzar conexiones HTTPS seguras y delegar el cifrado robusto de contraseñas a Supabase Auth. | Alta | Celia |
| **A05 Inyección** | Sí | Barra de búsqueda (`search-bar`) | Inyección de código malicioso o manipulación de parámetros en consultas de productos. | Validar entradas del usuario y renderizar textos usando métodos seguros en el DOM. | Alta | Celia |
| **A06 Diseño inseguro** | Sí | Botones de compra y WhatsApp | Automatización de pedidos falsos o saturación de interacciones por bots. | Validar los datos del formulario de compra antes de abrir la API de WhatsApp. | Media | Celia |
| **A07 Fallas de autenticación** | Sí | Formulario de login del admin | Ataques de fuerza bruta para adivinar la contraseña de acceso al panel. | Aprovechar el bloqueo automático de intentos y gestión de sesiones seguras de Supabase Auth. | Alta | Celia |
| **A08 Fallas de integridad** | Sí | Manejo de sesiones | Modificación de tokens de autenticación en el almacenamiento local del navegador. | Validar la integridad de los tokens directamente a través de las funciones nativas de Supabase. | Alta | Celia |
| **A09 Fallas de registro y alertas** | Sí | Acciones críticas del admin | Modificar o eliminar productos sin un registro de auditoría. | Implementar alertas visuales de confirmación antes de eliminar registros en el panel. | Baja | Celia |
| **A10 Excepciones inadecuadas** | Sí | Peticiones asíncronas con Supabase | Mostrar errores técnicos detallados de la base de datos al usuario final en caso de fallo. | Utilizar bloques `try/catch` robustos que controlen los errores y muestren mensajes amigables. | Media | Celia |
