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

  const systemPrompt = `Eres el motor de IA de Perry Co-Pilot, un asistente para técnicos de mantenimiento en campo.
Tu función es analizar un mensaje enviado por un técnico en WhatsApp y convertirlo en un objeto JSON perfectamente estructurado para la base de datos de Perry App.

DATOS DEL ENTORNO:
- Técnico remitente: "${senderName || 'Técnico'}"
- Orden de Trabajo (OT) asignada al grupo: "${groupWorkOrderFolio || 'Sin asignar'}"
- Hora del mensaje: "${formattedTime || 'No especificada'}"

REGLAS DE EXTRACCIÓN:
1. "manPowerEquipo": Busca el código de equipo o matrícula (ejemplos: "EQ-0105", "G-02", "#EQUIPO 102", "GRÚA 3", "EQ 04"). Si NO se menciona ningún código ni matrícula de equipo, establece manPowerEquipo en null.
2. "workOrderFolio": Si el mensaje menciona una OT (ej: "S06447", "OT-1234"), úsala. De lo contrario, usa la OT asignada al grupo ("${groupWorkOrderFolio || ''}").
3. "title": Un título breve (máx 60 caracteres) que resuma la actividad (ej: "Mantenimiento preventivo y cambio de empaques").
4. "weekendNotes": Descripción completa de los trabajos realizados, observaciones y detalles mencionados por el técnico.
5. "equipmentStatus": Debe ser uno de: "OPERATIVO", "DEGRADADO", "FUERA_DE_SERVICIO" o null si no se especifica.
6. "startTime": Si se menciona la hora de inicio o la hora del mensaje es válida, usa el formato "HH:MM".
7. "endTime": Si se menciona la hora de finalización, usa el formato "HH:MM", de lo contrario null.
8. "parts": Arreglo de refacciones/materiales mencionados. Estructura: [{"name": string, "quantity": number, "providerType": "COTIZAR" | "CLIENTE"}].
9. "isComplete": boolean. Debe ser false SI Y SOLO SI "manPowerEquipo" es null o vacío.
10. "missingFields": Si "manPowerEquipo" es null, incluye ["manPowerEquipo"]. De lo contrario, arreglo vacío [].

DEBES RESPONDER ÚNICAMENTE CON UN OBJETO JSON VÁLIDO CON EL SIGUIENTE FORMATO (SIN MARKDOWN NI TEXTO EXTRA):
{
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

  const prompt = `${systemPrompt}\n\nMENSAJE DEL TÉCNICO EN WHATSAPP:\n"${messageText}"`;

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

    if (!parsed.manPowerEquipo || !parsed.manPowerEquipo.trim()) {
      parsed.manPowerEquipo = null;
      parsed.isComplete = false;
      parsed.missingFields = ['manPowerEquipo'];
    } else {
      parsed.manPowerEquipo = parsed.manPowerEquipo.trim().toUpperCase();
      parsed.isComplete = true;
      parsed.missingFields = [];
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
  // Regex to match EQ-1234, EQ1234, G-01, EQUIPO 102, #EQ-01
  const equipoMatch = text.match(/(?:#|\bEQUIPO\b|\bEQ-?|\bG-)\s*([A-Z0-9-]{2,10})/i);
  let equipo: string | null = null;
  if (equipoMatch) {
    const raw = equipoMatch[0].toUpperCase().replace(/\s+/g, '');
    equipo = raw.startsWith('#') ? raw.slice(1) : raw;
    if (!equipo.startsWith('EQ') && !equipo.startsWith('G-')) {
      equipo = `EQ-${equipoMatch[1].toUpperCase()}`;
    }
  }

  // Regex to match Work Order S06447, OT-1234, etc.
  const folioMatch = text.match(/\b(S\d{5}|V\d{3,5}|OT-?\d+)\b/i);
  const folio = folioMatch ? folioMatch[1].toUpperCase() : groupFolio || null;

  const isComplete = Boolean(equipo);

  return {
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
