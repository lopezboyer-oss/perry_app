import { normalizeCompanyName } from './financial-parser';

export interface GeminiParsedPayrollReport {
  isPayrollReport: boolean;
  isMainPayrollReport: boolean; // true si es la nomina principal con dispersión total, false si es solo reporte de asistencia/horas extra
  companyName: string;
  periodNumber: string;
  reportDate: string;
  totalAmount: number;
  employeeCount: number;
  bankBreakdown: Array<{
    bankOrSource: string;
    amount: number;
  }>;
  observations: string | null;
}

export async function parsePayrollMessageWithGemini(params: {
  messageText: string;
  senderName?: string;
  groupName?: string;
  timestamp?: number;
  imageUrl?: string | null;
}): Promise<GeminiParsedPayrollReport> {
  const { messageText, senderName, groupName, timestamp, imageUrl } = params;

  let formattedDate: string = new Date().toISOString().split('T')[0];
  if (timestamp) {
    const d = new Date(timestamp > 1e11 ? timestamp : timestamp * 1000);
    formattedDate = d.toISOString().split('T')[0];
  }

  let defaultCompany = 'GRUPO CASEME';
  const groupUpper = (groupName || '').toUpperCase();
  if (groupUpper.includes('DROBOTS')) defaultCompany = 'DROBOTS';
  else if (groupUpper.includes('OPUS')) defaultCompany = 'OPUS INGENIUM';
  else if (groupUpper.includes('VULCAN') || groupUpper.includes('BEHEMOTH')) defaultCompany = 'VULCAN FORGE';

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackPayrollParser(messageText, defaultCompany, formattedDate);
  }

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
    } catch (fetchErr) {
      console.warn('[PAYROLL PARSER] No se pudo descargar la imagen de nómina:', fetchErr);
    }
  }

  const prompt = `Analiza detenidamente esta imagen y/o texto recibido en el grupo de WhatsApp "${groupName || 'ADMINISTRACION'}":

INSTRUCCIONES DE EXTRACCIÓN DE NÓMINA / RAYA SEMANAL:
1. "isPayrollReport": boolean (true si la imagen o texto corresponde a un reporte de Nómina, Raya Semanal, Dispersión de Sueldos, Asistencia o Finiquitos. false si es un estado de cuenta o saldo bancario).
2. "isMainPayrollReport": boolean (true si el documento es la NÓMINA PRINCIPAL / DISPERSIÓN COMPLETA DE SUELDOS. false si es ÚNICAMENTE un reporte auxiliar de Tiempo Extra, Horas Extra o Asistencia).
3. "companyName": Nombre de la empresa ("GRUPO CASEME", "DROBOTS", "OPUS INGENIUM", "VULCAN FORGE"). Si no se especifica, usa "${defaultCompany}".
4. "periodNumber": Período o número de raya (ej. "Raya 34", "Raya 35", "Semana 34"). Extrae del texto o del título de la hoja.
5. "reportDate": Fecha del reporte en formato "YYYY-MM-DD" (por defecto "${formattedDate}").
6. "totalAmount": Gran Total a pagar de la nómina en número decimal (ej. 35150.60).
7. "employeeCount": Número total de empleados o renglones listados en la nómina (0 si no es visible).
8. "bankBreakdown": Lista de desembolsos por banco o fuente de pago:
   - "bankOrSource": Nombre de la fuente/banco (ej. "SANTANDER", "BANAMEX", "BBVA", "CAJA CHICA", "EFECTIVO").
   - "amount": Monto asignado a esa fuente en número decimal.
9. "observations": Notas adicionales, faltas, vacaciones o comentarios visibles (ej. "Periodo de vacaciones de ORNELAS TORRES YESSENIA").

⚠️ REGLA DE PERÍODO OFICIAL VIGENTE:
- El período oficial de nómina para esta semana para TODAS las empresas (OPUS INGENIUM, DROBOTS, GRUPO CASEME, VULCAN FORGE) es "Raya 34". Si el documento o plantilla indica por error de dedo o plantilla desactualizada "Raya 33" o "Semana 33", estandarízalo siempre a "Raya 34".

⚠️ CONSIDERACIÓN DE VARIACIÓN MULTIEMPRESA Y FORMATOS DE EXCEL:
- Las 4 empresas (GRUPO CASEME, DROBOTS, OPUS INGENIUM, VULCAN FORGE) manejan plantillas de Excel/imágenes con estructuras de columnas diferentes y distinta cantidad de personal (desde 3 hasta más de 50 empleados).
- Realiza una lectura semántica visual del documento: busca el "Gran Total", "Total Neto", "Total a Pagar", "Líquido a Recibir" o "Total Raya" sin importar el orden o posición de las columnas. Suma adecuadamente la dispersión por banco y por efectivo.
- Extrae el desglose por banco o fuente de pago (Santander, Banamex, BBVA, Afirme, Monex, Efectivo/Caja Chica) sumando los totales por columna o sección de dispersión.

TEXTO ACOMPAÑANTE EN EL MENSAJE:
"${messageText}"

Responde ÚNICAMENTE en formato JSON plano válido sin marcas de markdown:
{
  "isPayrollReport": boolean,
  "isMainPayrollReport": boolean,
  "companyName": string,
  "periodNumber": string,
  "reportDate": "YYYY-MM-DD",
  "totalAmount": number,
  "employeeCount": number,
  "bankBreakdown": [
    { "bankOrSource": string, "amount": number }
  ],
  "observations": string | null
}`;

  try {
    const parts: any[] = [{ text: prompt }];
    if (imagePart) parts.push(imagePart);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      console.warn('[PAYROLL PARSER] Error en API Gemini. Ejecutando fallback.');
      return fallbackPayrollParser(messageText, defaultCompany, formattedDate);
    }

    const jsonResponse = await res.json();
    const rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return fallbackPayrollParser(messageText, defaultCompany, formattedDate);

    const parsed: GeminiParsedPayrollReport = JSON.parse(rawText);
    parsed.companyName = normalizeCompanyName(parsed.companyName || defaultCompany);
    return parsed;
  } catch (err) {
    console.error('[PAYROLL PARSER] Error procesando nómina con Gemini:', err);
    return fallbackPayrollParser(messageText, defaultCompany, formattedDate);
  }
}

function fallbackPayrollParser(
  text: string,
  companyName: string,
  dateStr: string
): GeminiParsedPayrollReport {
  // Regex to capture "Raya 34", "Raya 35", etc.
  const rayaMatch = text.match(/raya\s*(\d+)/i) || text.match(/semana\s*(\d+)/i);
  const periodNumber = rayaMatch ? `Raya ${rayaMatch[1]}` : 'Raya Semanal';

  return {
    isPayrollReport: true,
    isMainPayrollReport: true,
    companyName: normalizeCompanyName(companyName),
    periodNumber,
    reportDate: dateStr,
    totalAmount: 0,
    employeeCount: 0,
    bankBreakdown: [],
    observations: text,
  };
}
