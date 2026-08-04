import { GeminiParsedReport } from './types';

export async function parseWhatsappMessageWithGemini(params: {
  messageText: string;
  senderName?: string;
  groupWorkOrderFolio?: string | null;
  timestamp?: number; // epoch ms
}): Promise<GeminiParsedReport> {
  const { messageText, senderName, groupWorkOrderFolio, timestamp } = params;

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
    return fallbackRegexParser(messageText, groupWorkOrderFolio, formattedTime);
  }

  const systemPrompt = `Eres el motor de IA de Perry Co-Pilot, un asistente inteligente para grupos de mantenimiento técnico en WhatsApp donde participan técnicos y clientes.
Tu función es analizar un mensaje y clasificarlo con precisión.

DATOS DEL ENTORNO:
- Remitente: "${senderName || 'Usuario'}"
- Orden de Trabajo (OT) asignada al grupo: "${groupWorkOrderFolio || 'Sin asignar'}"
- Hora del mensaje: "${formattedTime || 'No especificada'}"

REGLAS DE CLASIFICACIÓN Y EXTRACCIÓN:
1. "messageType": Clasifica estrictamente el mensaje en uno de estos tres valores:
   - "WORK_REPORT": Reportes de trabajo ejecutados por técnicos (mantenimiento, reparaciones, inspecciones, cambio de refacciones o evidencias de trabajo).
   - "CLIENT_REQUEST": Peticiones del cliente o de usuarios solicitando atención a un equipo o reportando una falla (ej: "Favor de checar equipo C-10", "La grúa 2 tiene ruido", "Revisar aire acondicionado").
   - "SOCIAL_CHAT": Saludos ("Buenos días", "Hola a todos"), agradecimientos ("Gracias", "Excelente"), confirmaciones de chat ("Ok", "Enterado", "De acuerdo"), o charla social sin reporte de trabajo.

2. "manPowerEquipo": Busca el código de equipo o matrícula (ejemplos: "EQ-0105", "G-02", "C-10", "#EQUIPO 102", "GRÚA 3", "EQ 04"). Si NO se menciona ningún código ni matrícula de equipo, establece manPowerEquipo en null.
3. "workOrderFolio": Si el mensaje menciona una OT (ej: "S06447", "OT-1234"), úsala. De lo contrario, usa la OT asignada al grupo ("${groupWorkOrderFolio || ''}").
4. "title": Un título breve (máx 60 caracteres) que resuma la actividad o petición.
5. "weekendNotes": Descripción completa del mensaje u observaciones.
6. "equipmentStatus": Debe ser uno de: "OPERATIVO", "DEGRADADO", "FUERA_DE_SERVICIO" o null si no se especifica.
7. "parts": Arreglo de refacciones/materiales mencionados. Estructura: [{"name": string, "quantity": number, "providerType": "COTIZAR" | "CLIENTE"}].
8. "isComplete": boolean. 
   - Para "WORK_REPORT": Debe ser false SI Y SOLO SI "manPowerEquipo" es null o vacío.
   - Para "CLIENT_REQUEST" y "SOCIAL_CHAT": Debe ser true (no debe marcar falta de información).
9. "missingFields": Si "messageType" es "WORK_REPORT" y "manPowerEquipo" es null, incluye ["manPowerEquipo"]. De lo contrario, arreglo vacío [].

DEBES RESPONDER ÚNICAMENTE CON UN OBJETO JSON VÁLIDO CON EL SIGUIENTE FORMATO (SIN MARKDOWN NI TEXTO EXTRA):
{
  "messageType": "WORK_REPORT" | "CLIENT_REQUEST" | "SOCIAL_CHAT",
  "manPowerEquipo": string | null,
  "workOrderFolio": string | null,
  "title": string,
  "weekendNotes": string | null,
  "equipmentStatus": "OPERATIVO" | "DEGRADADO" | "FUERA_DE_SERVICIO" | null,
  "suggestedAction": string | null,
  "startTime": string | null,
  "endTime": string | null,
  "parts": [
    { "name": string, "quantity": number, "providerType": "COTIZAR" | "CLIENTE" }
  ],
  "isComplete": boolean,
  "missingFields": string[]
}`;

  const prompt = `${systemPrompt}\n\nMENSAJE EN WHATSAPP:\n"${messageText}"`;

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
      return fallbackRegexParser(messageText, groupWorkOrderFolio, formattedTime);
    }

    const jsonResponse = await res.json();
    const rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return fallbackRegexParser(messageText, groupWorkOrderFolio, formattedTime);
    }

    const parsed: GeminiParsedReport = JSON.parse(rawText);
    if (!parsed.startTime && formattedTime) {
      parsed.startTime = formattedTime;
    }

    if (!parsed.messageType) {
      parsed.messageType = 'WORK_REPORT';
    }

    if (parsed.messageType === 'SOCIAL_CHAT') {
      parsed.manPowerEquipo = null;
      parsed.isComplete = true;
      parsed.missingFields = [];
    } else if (parsed.messageType === 'CLIENT_REQUEST') {
      parsed.isComplete = true;
      parsed.missingFields = [];
      if (parsed.manPowerEquipo) {
        parsed.manPowerEquipo = parsed.manPowerEquipo.trim().toUpperCase();
      }
    } else {
      if (!parsed.manPowerEquipo || !parsed.manPowerEquipo.trim()) {
        parsed.manPowerEquipo = null;
        parsed.isComplete = false;
        parsed.missingFields = ['manPowerEquipo'];
      } else {
        parsed.manPowerEquipo = parsed.manPowerEquipo.trim().toUpperCase();
        parsed.isComplete = true;
        parsed.missingFields = [];
      }
    }

    return parsed;
  } catch (err) {
    console.error('Error procesando respuesta de Gemini:', err);
    return fallbackRegexParser(messageText, groupWorkOrderFolio, formattedTime);
  }
}

// Fallback Heuristic Regex Parser for offline / dev mode
function fallbackRegexParser(
  text: string,
  groupFolio?: string | null,
  formattedTime?: string | null
): GeminiParsedReport {
  const lower = text.toLowerCase().trim();
  const isSocial = /^(buenos días|buenos dias|buenas tardes|buenas noches|hola|gracias|ok|enterado|de acuerdo|saludos)/i.test(lower) && text.length < 40;

  if (isSocial) {
    return {
      messageType: 'SOCIAL_CHAT',
      manPowerEquipo: null,
      workOrderFolio: groupFolio || null,
      title: 'Saludo / Chat Social',
      weekendNotes: text,
      equipmentStatus: null,
      suggestedAction: null,
      startTime: formattedTime || null,
      endTime: null,
      parts: [],
      isComplete: true,
      missingFields: [],
    };
  }

  const isClientReq = lower.includes('favor de') || lower.includes('apóyennos') || lower.includes('apoyennos') || lower.includes('revisar') || lower.includes('checar');

  // Regex to match EQ-1234, EQ1234, G-01, C-10, EQUIPO 102, #EQ-01
  const equipoMatch = text.match(/(?:#|\bEQUIPO\b|\bEQ-?|\bG-|\bC-)\s*([A-Z0-9-]{2,10})/i);
  let equipo: string | null = null;
  if (equipoMatch) {
    const raw = equipoMatch[0].toUpperCase().replace(/\s+/g, '');
    equipo = raw.startsWith('#') ? raw.slice(1) : raw;
    if (!equipo.startsWith('EQ') && !equipo.startsWith('G-') && !equipo.startsWith('C-')) {
      equipo = `EQ-${equipoMatch[1].toUpperCase()}`;
    }
  }

  const folioMatch = text.match(/\b(S\d{5}|V\d{3,5}|OT-?\d+)\b/i);
  const folio = folioMatch ? folioMatch[1].toUpperCase() : groupFolio || null;

  const messageType = isClientReq ? 'CLIENT_REQUEST' : 'WORK_REPORT';
  const isComplete = messageType === 'CLIENT_REQUEST' ? true : Boolean(equipo);

  return {
    messageType,
    manPowerEquipo: equipo,
    workOrderFolio: folio,
    title: text.length > 50 ? `${text.slice(0, 50)}...` : text,
    weekendNotes: text,
    equipmentStatus: text.toLowerCase().includes('fuera de servicio') 
      ? 'FUERA_DE_SERVICIO' 
      : text.toLowerCase().includes('degradado') 
      ? 'DEGRADADO' 
      : 'OPERATIVO',
    suggestedAction: null,
    startTime: formattedTime || null,
    endTime: null,
    parts: [],
    isComplete,
    missingFields: isComplete ? [] : ['manPowerEquipo'],
  };
}
