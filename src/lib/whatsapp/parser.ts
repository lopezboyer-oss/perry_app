import { GeminiParsedReport } from './types';

export async function parseWhatsappMessageWithGemini(params: {
  messageText: string;
  senderName?: string;
  groupWorkOrderFolio?: string | null;
  timestamp?: number; // epoch ms
  hasMedia?: boolean;
}): Promise<GeminiParsedReport> {
  const { messageText, senderName, groupWorkOrderFolio, timestamp, hasMedia } = params;

  // Determine timestamp formatted in HH:MM (Local Mexico time America/Mexico_City)
  let formattedTime: string | null = null;
  if (timestamp) {
    const d = new Date(timestamp > 1e11 ? timestamp : timestamp * 1000);
    formattedTime = d.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Mexico_City',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'Configurado_En_Netlify') {
    console.warn('GEMINI_API_KEY no configurada localmente. Ejecutando parser heurístico de respaldo.');
    return fallbackRegexParser(messageText, groupWorkOrderFolio, formattedTime, hasMedia);
  }

  const systemPrompt = `Eres el motor de IA analítico de Perry Intelligence para grupos de operaciones, ingeniería y mantenimiento en WhatsApp.
Tu misión es extraer y estructurar el contexto operativo de cada mensaje compartido por el equipo técnico y supervisores.

DATOS DEL ENTORNO:
- Remitente: "${senderName || 'Personal Operativo'}"
- Orden de Trabajo (OT) predeterminada del grupo: "${groupWorkOrderFolio || 'Sin asignar'}"
- Hora del mensaje: "${formattedTime || 'No especificada'}"
- Contiene archivos/fotos: ${hasMedia ? 'SÍ' : 'NO'}

REGLAS DE CLASIFICACIÓN Y EXTRACCIÓN:
1. "messageType": Clasifica el mensaje en UNA de las siguientes categorías operativas:
   - "WORK_REPORT": Reportes de avance de trabajo, bitácora de actividades, mantenimientos preventivos/correctivos, inspecciones técnicas o fotos de evidencia en obra.
   - "ISSUE_ALERT": Reporte de fallas de equipos, descomposturas, paros de línea, alertas de seguridad o bloqueos en sitio.
   - "MATERIAL_REQUEST": Solicitud o reporte de refacciones, consumibles, herramientas, compras, combustible o materiales.
   - "COORDINATION": Coordinación logística, confirmación de horarios, asignación de cuadrillas, traslados o avisos de llegada/salida de sitio.
   - "CLIENT_REQUEST": Peticiones de clientes o jefes solicitando atención especial a un equipo o área.
   - "GENERAL_OPERATIONAL": Cualquier otra comunicación de trabajo relevante que no encaje en las anteriores.
   - "SOCIAL_CHAT": ÚNICAMENTE para saludos aislados ("buenos días", "hola"), agradecimientos breves o charla no operativa. (¡Si contiene fotos o datos técnicos, NUNCA es SOCIAL_CHAT!).

2. "manPowerEquipo": Identifica cualquier código, número o matrícula de equipo/maquinaria (ejemplos: "EQ-0105", "G-02", "C-10", "A-20", "GRÚA 3", "PLATAFORMA 4", "COMPRESOR 2"). Si no se menciona, retorna null.
3. "workOrderFolio": Si el mensaje menciona una OT (ej: "S06447", "OT-1020", "FOLIO 554"), extráela. De lo contrario, si existe OT predeterminada ("${groupWorkOrderFolio || ''}"), úsala.
4. "title": Resumen ejecutivo conciso de 1 línea (máx 60 caracteres).
5. "summary": Explicación breve de 1 o 2 oraciones del contenido y contexto.
6. "weekendNotes": Descripción completa de las observaciones o texto del mensaje.
7. "equipmentStatus": "OPERATIVO", "FUERA_DE_SERVICIO", "DEGRADADO" o null.
8. "parts": Arreglo de refacciones/materiales identificados: [{"name": string, "quantity": number, "providerType": "COTIZAR" | "CLIENTE"}].
9. "tags": Arreglo de palabras clave relevantes (ej: ["mantenimiento", "falla_electrica", "bomba", "llegada_sitio", "evidencia_foto"]).
10. "isOperationalEvent": boolean. true para cualquier mensaje que aporte valor operativo, técnico o logístico. false solo si es puramente social/irrelevante.
11. "isComplete": boolean (siempre true para ingestión continua).
12. "missingFields": siempre [].

RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO:
{
  "messageType": "WORK_REPORT" | "ISSUE_ALERT" | "MATERIAL_REQUEST" | "COORDINATION" | "CLIENT_REQUEST" | "GENERAL_OPERATIONAL" | "SOCIAL_CHAT",
  "manPowerEquipo": string | null,
  "workOrderFolio": string | null,
  "title": string,
  "summary": string | null,
  "weekendNotes": string | null,
  "equipmentStatus": "OPERATIVO" | "DEGRADADO" | "FUERA_DE_SERVICIO" | null,
  "suggestedAction": string | null,
  "startTime": string | null,
  "endTime": string | null,
  "parts": [
    { "name": string, "quantity": number, "providerType": "COTIZAR" | "CLIENTE" }
  ],
  "tags": string[],
  "isOperationalEvent": boolean,
  "isComplete": true,
  "missingFields": []
}`;

  const prompt = `${systemPrompt}\n\nMENSAJE RECIBIDO EN WHATSAPP:\n"${messageText || (hasMedia ? '[Fotografía o documento de evidencia compartida]' : '')}"`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://perry.netlify.app/',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn('Gemini API respondió error. Usando fallback parser.');
      return fallbackRegexParser(messageText, groupWorkOrderFolio, formattedTime, hasMedia);
    }

    const jsonResponse = await res.json();
    const rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return fallbackRegexParser(messageText, groupWorkOrderFolio, formattedTime, hasMedia);
    }

    const parsed: GeminiParsedReport = JSON.parse(rawText);
    if (!parsed.startTime && formattedTime) {
      parsed.startTime = formattedTime;
    }

    if (!parsed.messageType) {
      parsed.messageType = hasMedia ? 'WORK_REPORT' : 'GENERAL_OPERATIONAL';
    }

    if (parsed.manPowerEquipo) {
      parsed.manPowerEquipo = parsed.manPowerEquipo.trim().toUpperCase();
    }

    parsed.isComplete = true;
    parsed.missingFields = [];
    if (parsed.isOperationalEvent === undefined) {
      parsed.isOperationalEvent = parsed.messageType !== 'SOCIAL_CHAT';
    }
    if (!parsed.tags) {
      parsed.tags = [];
    }

    return parsed;
  } catch (err) {
    console.error('Error procesando respuesta de Gemini:', err);
    return fallbackRegexParser(messageText, groupWorkOrderFolio, formattedTime, hasMedia);
  }
}

// Fallback Heuristic Regex Parser for offline / dev mode
function fallbackRegexParser(
  text: string,
  groupFolio?: string | null,
  formattedTime?: string | null,
  hasMedia?: boolean
): GeminiParsedReport {
  const lower = (text || '').toLowerCase().trim();

  // Social greetings must have non-empty text AND start with explicit greeting words
  const isSocial = !hasMedia && lower.length > 0 && /^(buenos días|buenos dias|buenas tardes|buenas noches|hola|saludos|gracias|enterado|ok|de acuerdo)$/i.test(lower);

  if (isSocial) {
    return {
      messageType: 'SOCIAL_CHAT',
      manPowerEquipo: null,
      workOrderFolio: groupFolio || null,
      title: 'Saludo / Chat Social',
      summary: 'Mensaje de saludo o confirmación rápida',
      weekendNotes: text,
      equipmentStatus: null,
      suggestedAction: null,
      startTime: formattedTime || null,
      endTime: null,
      parts: [],
      tags: ['social'],
      isOperationalEvent: false,
      isComplete: true,
      missingFields: [],
    };
  }

  // Check for issues / failures
  const isIssue = /falla|daño|descompuesto|fuga|ruido|fuera de servicio|calentamiento|tirando aceite|alarma/i.test(lower);
  // Check for material / parts
  const isMaterial = /refacción|refaccion|material|aceite|filtro|manguera|compra|tornillo|solicito/i.test(lower);
  // Check for coordination
  const isCoord = /llegando|en camino|salida|turno|cuadrilla|hora de llegada|traslado|personal/i.test(lower);

  // Regex to match EQ-1234, EQ1234, G-01, C-10, A20, A-20, EQUIPO 102, #EQ-01
  const equipoMatch = (text || '').match(/(?:#|\bEQUIPO\b|\bEQ-?|\bG-|\bC-|\bA-?)\s*([A-Z0-9-]{1,10}(?:\s*Y\s*[A-Z0-9-]{1,10})?)/i);
  let equipo: string | null = null;
  if (equipoMatch) {
    equipo = equipoMatch[0].toUpperCase().replace(/^#/, '').trim();
  }

  const folioMatch = (text || '').match(/\b(S\d{5}|V\d{3,5}|OT-?\d+)\b/i);
  const folio = folioMatch ? folioMatch[1].toUpperCase() : groupFolio || null;

  let messageType: GeminiParsedReport['messageType'] = 'GENERAL_OPERATIONAL';
  if (isIssue) messageType = 'ISSUE_ALERT';
  else if (isMaterial) messageType = 'MATERIAL_REQUEST';
  else if (isCoord) messageType = 'COORDINATION';
  else if (hasMedia || equipo) messageType = 'WORK_REPORT';

  const tags: string[] = [];
  if (hasMedia) tags.push('evidencia_multimedia');
  if (equipo) tags.push(`equipo_${equipo.toLowerCase().replace(/\s+/g, '_')}`);
  if (isIssue) tags.push('alerta_falla');
  if (isMaterial) tags.push('materiales');

  return {
    messageType,
    manPowerEquipo: equipo,
    workOrderFolio: folio,
    title: text.length > 50 ? `${text.slice(0, 50)}...` : (text || (hasMedia ? 'Evidencia fotográfica' : 'Registro operativo')),
    summary: text || (hasMedia ? 'Evidencia fotográfica compartida en grupo' : 'Mensaje operativo'),
    weekendNotes: text || (hasMedia ? 'Evidencia fotográfica compartida en grupo' : 'Registro operativo'),
    equipmentStatus: lower.includes('fuera de servicio') 
      ? 'FUERA_DE_SERVICIO' 
      : lower.includes('degradado') 
      ? 'DEGRADADO' 
      : 'OPERATIVO',
    suggestedAction: null,
    startTime: formattedTime || null,
    endTime: null,
    parts: [],
    tags,
    isOperationalEvent: true,
    isComplete: true,
    missingFields: [],
  };
}

