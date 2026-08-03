# Guía Paso a Paso para la Puesta en Marcha de Perry Co-Pilot (Bot de WhatsApp)

Esta guía detalla el proceso completo para activar el número de celular exclusivo (eSIM), vincularlo a la API de WhatsApp, conectar la URL del Webhook a **PERRY_APP** y configurar los grupos de trabajo de los técnicos.

---

## 📋 Requisitos Previos

1. **eSIM o Línea Celular Dedicada**: Un número de teléfono móvil que será la identidad de *Perry Co-Pilot*.
2. **Teléfono Móvil Físico o Emulador**: Un dispositivo donde esté instalado **WhatsApp** o **WhatsApp Business** activo con esa eSIM.
3. **Plataforma de API de WhatsApp (Instancia)**: Recomendamos utilizar proveedores sencillos basados en código QR como:
   - **Evolution API** (Gratuito / Autosoportado o mediante hosting como Railway / Render).
   - **UltraMsg** (Solución Cloud de $10-$15 USD/mes).
   - **Green API** / **Z-API**.
4. **Variables de Entorno en Netlify/Servidor**:
   - `GEMINI_API_KEY`: Clave de API de Google Gemini (para el análisis de IA).
   - `WHATSAPP_API_URL`: URL base de la API del proveedor de WhatsApp.
   - `WHATSAPP_API_TOKEN`: Token de autenticación del proveedor.
   - `WHATSAPP_INSTANCE_ID`: Identificador de la instancia de WhatsApp.
   - `WHATSAPP_VERIFY_TOKEN`: Token secreto de verificación (ej: `perry_whatsapp_bot_secret`).

---

## 🚀 PASO 1: Configurar la eSIM y la Instancia de WhatsApp

1. **Instalar WhatsApp**: En un smartphone o dispositivo de respaldo, inserta la eSIM y activa WhatsApp / WhatsApp Business registrando ese número.
2. **Crear una Instancia en tu Proveedor de API**:
   - Accede a tu proveedor elegido (ej: **Evolution API** o **UltraMsg**).
   - Haz clic en **Crear Instancia** y asígnale el nombre `Perry-CoPilot`.
   - La plataforma generará un **Código QR**.
3. **Vincular el Número (Escanear QR)**:
   - Abre WhatsApp en el teléfono móvil donde está la eSIM.
   - Ve a **Ajustes / Configuración** $\rightarrow$ **Dispositivos Vinculados** $\rightarrow$ **Vincular un Dispositivo**.
   - Escanea el Código QR que aparece en la pantalla de la API.
   - *¡Listo! La instancia de la API ahora está conectada y puede escuchar/enviar mensajes a nombre de Perry Co-Pilot.*

---

## 🔗 PASO 2: Configurar el Webhook en el Proveedor de API

1. Ingresa a la sección de **Configuración de Webhooks** de tu instancia en la plataforma de WhatsApp (Evolution API / UltraMsg).
2. Pega la URL del Webhook de PERRY_APP:
   ```text
   https://tu-aplicacion.netlify.app/api/whatsapp/webhook
   ```
3. Activa los siguientes **Eventos de Escucha (Event Triggers)**:
   - `MESSAGES_UPSERT` o `MESSAGES_RECEIVED` (Mensajes recibidos).
   - `MEDIA_MESSAGES` (Fotos e imágenes enviadas).
   - `GROUP_MESSAGES` (Mensajes dentro de grupos).
4. Guarda la configuración del Webhook.

---

## 🛠️ PASO 3: Configurar Variables de Entorno en Netlify / Servidor

Ingresa al panel de tu servidor (ej. **Netlify** $\rightarrow$ Site Settings $\rightarrow$ Environment Variables) y asegúrate de declarar:

```env
GEMINI_API_KEY="AIzaSy..."
WHATSAPP_API_URL="https://tu-instancia-whatsapp-api.com"
WHATSAPP_API_TOKEN="tu_token_secreto"
WHATSAPP_INSTANCE_ID="Perry-CoPilot-01"
WHATSAPP_VERIFY_TOKEN="perry_whatsapp_bot_secret"
```

---

## 👥 PASO 4: Añadir a Perry Co-Pilot a los Grupos de WhatsApp

1. Abre WhatsApp en el teléfono con la eSIM de Perry Co-Pilot.
2. Añade el número de Perry Co-Pilot como **integrante / participante** en los grupos de WhatsApp donde los técnicos de campo comparten diariamente sus reportes y evidencias fotográficas.
3. Obten el **ID del Grupo (JID)**:
   - La mayoría de los proveedores muestran el ID del grupo (ej: `120363049123456789@g.us`) en el panel de control de la API o cuando el bot recibe su primer mensaje.

---

## ⚙️ PASO 5: Vincular el Grupo con la Orden de Trabajo en PERRY_APP

1. Entra a PERRY_APP e inicia sesión como Administrador o Ingeniero.
2. En el menú lateral izquierdo, haz clic en **"Perry Co-Pilot (WA)"** (o navega a `/configuracion/whatsapp`).
3. Haz clic en el botón **"+ Vincular Grupo"**.
4. Llena el formulario:
   - **Nombre del Grupo**: Nombre descriptivo (ej: *OT S06447 - Planta Ternium*).
   - **ID del Grupo / JID**: Pega el ID del grupo de WhatsApp (ej: `120363049123456789@g.us`).
   - **Orden de Trabajo (OT / Folio)**: Ingresa el folio de la OT de Odoo asignada a ese frente de trabajo (ej: `S06447`).
5. Haz clic en **Guardar Grupo**.

---

## 🧪 PASO 6: Prueba de Funcionamiento y Verificación

1. **Prueba de Reporte Completo**:
   - En el grupo de WhatsApp de campo, un técnico envía un mensaje con foto:
     > *"Buenas tardes equipo, entregamos trabajo en la grúa **EQ-0402**. Se cambió sello hidráulico y manguera. Quedó operativa."*
   - **Resultado Esperado**:
     - Perry Co-Pilot procesa el mensaje de manera silenciosa mediante Gemini 2.5 Flash.
     - Le añade automáticamente la reacción con el emoji `🤖` al mensaje del técnico.
     - La actividad, las notas y las evidencias fotográficas se crean de inmediato en la sección **Man Power / Reportes de Campo** de PERRY_APP.

2. **Prueba de Información Faltante**:
   - Un técnico envía un mensaje sin mencionar el código de equipo:
     > *"Se realizó limpieza de filtros y cambio de aceite."*
   - **Resultado Esperado**:
     - Perry Co-Pilot detecta que falta el `# EQUIPO`.
     - El bot le responde interactivamente en el grupo:
       > *"🤖 Hola @Técnico, recibí tu reporte. Para guardarlo en Perry App, por favor respóndeme con el **# de EQUIPO** o matrícula (ej. EQ-0105)."*
     - Cuando el técnico responde *"Es el EQ-0105"*, el bot completa el registro y le añade la reacción `🤖`.

3. **Auditoría**:
   - Revisa la pestaña **"Registro de Auditoría"** en la página `/configuracion/whatsapp` dentro de PERRY_APP para confirmar la lista de mensajes procesados, timestamps y estatus.

---

## ❓ Preguntas Frecuentes y Solución de Problemas

- **¿Qué pasa si cambian de Orden de Trabajo en el grupo?**
  Basta con ingresar a `/configuracion/whatsapp` en PERRY_APP y actualizar el folio de la OT asociada a ese grupo.
- **¿Qué pasa si el técnico escribe el código de equipo en el texto?**
  Si el técnico incluye el equipo (ej: `EQ-0105`, `#EQUIPO 02`, `GRÚA G-01`), el bot lo detecta automáticamente sin importar en qué parte del texto lo coloque.
