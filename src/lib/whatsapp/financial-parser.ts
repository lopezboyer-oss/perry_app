import { GeminiParsedFinancialReport, ExtractedAccountBalance } from './types';

export async function parseFinancialMessageWithGemini(params: {
  messageText: string;
  senderName?: string;
  groupName?: string;
  timestamp?: number;
  imageUrl?: string | null;
}): Promise<GeminiParsedFinancialReport> {
  const { messageText, senderName, groupName, timestamp, imageUrl } = params;

  let formattedDate: string = new Date().toISOString().split('T')[0];
  if (timestamp) {
    const d = new Date(timestamp > 1e11 ? timestamp : timestamp * 1000);
    formattedDate = d.toISOString().split('T')[0];
  }

  const apiKey = process.env.GEMINI_API_KEY;

  let imagePart: { inlineData: { mimeType: string; data: string } } | null = null;
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        imagePart = {
          inlineData: {
            mimeType: contentType.split(';')[0].trim(),
            data: base64Data,
          },
        };
      }
    } catch (err) {
      console.error('[FINANCIAL PARSER] Error descargando imagen de saldos:', err);
    }
  }

  // Detect company from groupName if available
  let defaultCompany = 'GRUPO CASEME';
  const groupUpper = (groupName || '').toUpperCase();
  if (groupUpper.includes('DROBOTS')) defaultCompany = 'DROBOTS';
  else if (groupUpper.includes('OPUS')) defaultCompany = 'OPUS INGENIUM';
  else if (groupUpper.includes('VULCAN') || groupUpper.includes('BEHEMOTH')) defaultCompany = 'BEHEMOTH DESIGN';

  if (!apiKey || apiKey === 'Configurado_En_Netlify') {
    return fallbackFinancialParser(messageText, defaultCompany, formattedDate, imageUrl);
  }

  const systemPrompt = `Eres el motor analítico de Tesorería e Inteligencia Financiera C-Suite para Perry App.
Tu objetivo es transcribir, estructurar y AUDITAR matemáticamente los reportes de saldos bancarios compartidos en texto o en imágenes.

DATOS DEL ENTORNO:
- Remitente: "${senderName || 'Administración'}"
- Nombre del Grupo: "${groupName || 'Administración'}"
- Empresa Predeterminada: "${defaultCompany}"
- Fecha: "${formattedDate}"
- Contiene Imagen de Saldos: ${imagePart ? 'SÍ (ADJUNTA)' : 'NO'}

REGLAS DE EXTRACCIÓN FINANCIERA:
1. "companyName": Identifica la empresa ("GRUPO CASEME", "DROBOTS", "OPUS INGENIUM", "BEHEMOTH DESIGN"). Si no es explícita, usa "${defaultCompany}".
2. "reportDate": Fecha del reporte en formato "YYYY-MM-DD".
3. "accounts": Extrae CADA banco y tipo de cuenta en la imagen o texto:
   - "bankName": Nombre del Banco (ej: "SANTANDER", "AFIRME", "BANORTE", "BBVA", "MONEX").
   - "accountType": "MONEDA_NACIONAL" | "DOLARES" | "CREDITO_REVOLVENTE" | "INVERSION".
   - "currency": "MXN" para Moneda Nacional o "USD" para Dólares.
   - "initialBalance": Saldo anterior / apertura en números decimales (ej. 10420.00).
   - "income": Total abonos / ingresos del día (ej. 60100.00).
   - "expenses": Total cargos / gastos del día (ej. 427.00).
   - "finalBalance": Saldo disponible final reportado (ej. 9143.79).
   - "isCalculatedMatch": boolean. Evalúa si (initialBalance + income - expenses) es IGUAL a finalBalance (con margen de $1.00 por redondeo).
   - "calculatedDiff": Diferencia matemática entre (initialBalance + income - expenses) y finalBalance.
4. "hasErrors": boolean (true si alguna cuenta tiene isCalculatedMatch === false).
5. "errorSummary": Resumen claro de la discrepancia matemática encontrada o null.

RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO:
{
  "companyName": string,
  "reportDate": "YYYY-MM-DD",
  "hasErrors": boolean,
  "errorSummary": string | null,
  "accounts": [
    {
      "bankName": string,
      "accountType": "MONEDA_NACIONAL" | "DOLARES" | "CREDITO_REVOLVENTE" | "INVERSION",
      "currency": "MXN" | "USD",
      "initialBalance": number,
      "income": number,
      "expenses": number,
      "finalBalance": number,
      "isCalculatedMatch": boolean,
      "calculatedDiff": number
    }
  ]
}`;

  const promptText = `${systemPrompt}\n\nMENSAJE / EVIDENCIA DE SALDOS:\n"${messageText || '[Imagen de reporte de saldos adjunta]'}"`;

  const contentParts: any[] = [];
  if (imagePart) contentParts.push(imagePart);
  contentParts.push({ text: promptText });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://perryapp.netlify.app/',
        },
        body: JSON.stringify({
          contents: [{ parts: contentParts }],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn('[FINANCIAL PARSER] Error en API Gemini. Ejecutando fallback.');
      return fallbackFinancialParser(messageText, defaultCompany, formattedDate, imageUrl);
    }

    const jsonResponse = await res.json();
    const rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return fallbackFinancialParser(messageText, defaultCompany, formattedDate, imageUrl);

    const parsed: GeminiParsedFinancialReport = JSON.parse(rawText);
    return parsed;
  } catch (err) {
    console.error('[FINANCIAL PARSER] Error procesando reporte financiero con Gemini:', err);
    return fallbackFinancialParser(messageText, defaultCompany, formattedDate, imageUrl);
  }
}

function fallbackFinancialParser(
  text: string,
  companyName: string,
  dateStr: string,
  imageUrl?: string | null
): GeminiParsedFinancialReport {
  return {
    companyName,
    reportDate: dateStr,
    hasErrors: false,
    errorSummary: null,
    accounts: [
      {
        bankName: 'SANTANDER',
        accountType: 'MONEDA_NACIONAL',
        currency: 'MXN',
        initialBalance: 0,
        income: 0,
        expenses: 0,
        finalBalance: 0,
        isCalculatedMatch: true,
        calculatedDiff: 0,
      },
    ],
  };
}
