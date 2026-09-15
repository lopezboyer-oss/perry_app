import { normalizeCompanyName } from './financial-parser';

export type FinancialDocumentType =
  | 'NOMINA'
  | 'PAGO_PROVEEDORES'
  | 'REVISION_HORAS_EXTRA'
  | 'SALDOS_BANCARIOS'
  | 'OTRO_NO_APROBACION';

export interface ClassificationAndParseResult {
  documentType: FinancialDocumentType;
  confidence: 'ALTA' | 'MEDIA' | 'BAJA';
  reasoning: string;
  companyName: string;
  titleOrPeriod: string;
  reportDate: string;
  totalAmountMXN: number;
  totalAmountUSD: number;
  itemsCount: number;
  bankBreakdown: Array<{
    bankOrSource: string;
    amount: number;
  }>;
  keyEntities: string[];
  observations: string | null;
  requiresApproval: boolean;
}

export async function classifyAndParseFinancialDocument(params: {
  mediaUrl?: string | null;
  messageText?: string;
  groupName?: string;
  senderName?: string;
  timestamp?: number;
}): Promise<ClassificationAndParseResult> {
  const { mediaUrl, messageText = '', groupName = '', senderName = '', timestamp } = params;

  let formattedDate: string = new Date().toISOString().split('T')[0];
  if (timestamp) {
    const d = new Date(timestamp > 1e11 ? timestamp : timestamp * 1000);
    formattedDate = d.toISOString().split('T')[0];
  }

  // Pre-detección de empresa según nombre del grupo
  let defaultCompany = 'GRUPO CASEME';
  const groupUpper = groupName.toUpperCase();
  if (groupUpper.includes('DROBOT')) defaultCompany = 'DROBOTS';
  else if (groupUpper.includes('OPUS')) defaultCompany = 'OPUS INGENIUM';
  else if (groupUpper.includes('VULCAN') || groupUpper.includes('BEHEMOTH')) defaultCompany = 'VULCAN FORGE';
  else if (groupUpper.includes('SAINPRO')) defaultCompany = 'SAINPRO';

  // Heurística rápida sobre el texto del mensaje
  const lowerText = messageText.toLowerCase();
  const isExplicitSupplierText = /(pago\s*a?\s*proveedores?|relaci[oó]n\s*de\s*pagos?|facturas?\s*pendientes?|cuentas\s*por\s*pagar|programaci[oó]n\s*de\s*pagos?|orden\s*de\s*compra)/i.test(lowerText);
  const isExplicitOvertimeText = /(horas?\s*extras?|tiempo\s*extra|asistencia\s*fin\s*de\s*semana|jornadas?\s*extraordinarias?)/i.test(lowerText);
  const isExplicitPayrollText = /(n[oó]mina|raya\s*\d+|lista\s*de\s*raya|dispersi[oó]n\s*de\s*sueldos?|finiquito|pago\s*de\s*raya)/i.test(lowerText);
  const isExplicitBalanceText = /(saldos?\s*bancarios?|corte\s*de\s*caja|saldos?\s*del?\s*d[ií]a|estado\s*de\s*cuenta)/i.test(lowerText);

  const apiKey = process.env.GEMINI_API_KEY;

  // Descargar imagen si existe
  let imagePart: { inlineData: { mimeType: string; data: string } } | null = null;
  if (mediaUrl) {
    try {
      const res = await fetch(mediaUrl);
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
      console.warn('[CLASSIFIER] No se pudo descargar la imagen:', fetchErr);
    }
  }

  // Si no hay API key o falló la conexión, usar clasificador heurístico
  if (!apiKey || apiKey === 'Configurado_En_Netlify') {
    return fallbackClassifier({
      messageText,
      hasMedia: Boolean(imagePart),
      defaultCompany,
      formattedDate,
      isExplicitSupplierText,
      isExplicitOvertimeText,
      isExplicitPayrollText,
      isExplicitBalanceText,
    });
  }

  const prompt = `Eres el Clasificador y Extractor Inteligente de Documentos Financieros y Operativos de Perry App para un consorcio industrial (DROBOTS, OPUS INGENIUM, GRUPO CASEME, VULCAN FORGE).

Tu objetivo es clasificar de forma EXACTA e INFALIBLE el documento recibido (imagen o texto) en una de las siguientes categorías:

1. "PAGO_PROVEEDORES":
   - Documento que programa o relaciona pagos a empresas externas, compras de materiales, rentas de equipo, facturas de proveedores, cuotas patronales SUA/IMSS, SAT, pólizas de seguros (ej. CHUBB), o liquidaciones de órdenes de compra (PO / folios Odoo).
   - Columnas comunes: "Proveedor", "Concepto / Descripción", "Importe", "Divisa (MXN / USD)", "Fecha Factura", "Folio Odoo".
   - Totales: Suele tener totales en MXN y/o USD (ej. "TOTAL MX", "TOTAL US").
   - ⚠️ REGLA DE ORO: Si contiene pagos a personas morales o proveedores externos para insumos/servicios, es PAGO_PROVEEDORES, NUNCA nómina.

2. "NOMINA":
   - Documento que detalla el pago de SUELDOS, RAYA SEMANAL o FINIQUITOS a los TRABAJADORES o EMPLEADOS directos de la empresa.
   - Columnas comunes: "Nombre del Trabajador", "Puesto", "Sueldo", "Percepciones", "Deducciones", "Neto a Pagar", "Firma Empleado", "Contpaqi", "Santander", "Efectivo".
   - Títulos comunes: "Raya 34", "Raya Semanal", "Nómina de Empleados", "Cálculo del finiquito", "Dispersión de Nómina".
   - ⚠️ REGLA DE ORO: Si la lista enumera proveedores comerciales o compras de materiales, NO es nómina.

3. "REVISION_HORAS_EXTRA":
   - Documento que contiene el reporte o validación previa de HORAS EXTRA / TIEMPO EXTRA de técnicos u operarios.
   - Columnas comunes: "Técnico", "Horas Extras", "TE", "Horas Dobles/Triples", "Turno", "Firmas de Supervisor".
   - No es la dispersión de nómina completa, sino el soporte de tiempo extraordinario.

4. "SALDOS_BANCARIOS":
   - Reporte diario de saldos en cuentas bancarias de la empresa (Saldo Inicial, Abonos/Ingresos, Cargos/Egresos, Saldo Final).

5. "OTRO_NO_APROBACION":
   - Fotografías de trabajos de campo, tickets individuales de gasolina/comida, capturas de chat ordinario, memes o documentos sin relación de pagos agrupados.

DATOS DEL CONTEXTO:
- Grupo de procedencia: "${groupName || 'Administración'}"
- Remitente: "${senderName || 'Administrador'}"
- Empresa por defecto si no es visible: "${defaultCompany}"
- Fecha del reporte: "${formattedDate}"
- Texto que acompaña al mensaje: "${messageText}"

INSTRUCCIONES DE EXTRACCIÓN:
- "documentType": "PAGO_PROVEEDORES" | "NOMINA" | "REVISION_HORAS_EXTRA" | "SALDOS_BANCARIOS" | "OTRO_NO_APROBACION".
- "confidence": "ALTA" | "MEDIA" | "BAJA".
- "reasoning": Justificación concisa de la clasificación (1 o 2 oraciones).
- "companyName": Empresa identificada ("DROBOTS", "OPUS INGENIUM", "GRUPO CASEME", "VULCAN FORGE").
- "titleOrPeriod": Título exacto del reporte o periodo (ej. "PROGRAMACION LUNES 14 SEPTIEMBRE 2026", "Raya 34", "Finiquito MANRIQUEZ ESPINOZA", "Semana 34 - Horas Extra").
- "totalAmountMXN": Gran total a pagar en pesos mexicanos (número decimal). Si no hay pesos pero sí dólares, 0.
- "totalAmountUSD": Gran total a pagar en dólares estadounidenses (número decimal, 0 si no aplica).
- "itemsCount": Número de pagos, proveedores o empleados listados en el documento.
- "bankBreakdown": Desglose por banco o fuente si está disponible (ej. [{"bankOrSource": "SANTANDER", "amount": 50000}, {"bankOrSource": "EFECTIVO", "amount": 12000}]).
- "keyEntities": Lista de nombres de los proveedores principales, empleados clave o conceptos más relevantes encontrados (ej. ["CHUBB", "KM 57", "SUA", "JOSE JAVIER MURILLO"]).
- "observations": Notas adicionales visibles (ej. "BUSCAR FACTURA EN SAT", "Actividad S02330", etc.).
- "requiresApproval": true si es NOMINA, PAGO_PROVEEDORES o REVISION_HORAS_EXTRA con importes válidos a autorizar; false si es solo saldos u otro.

Responde ÚNICAMENTE un objeto JSON plano válido con la siguiente estructura:
{
  "documentType": "PAGO_PROVEEDORES" | "NOMINA" | "REVISION_HORAS_EXTRA" | "SALDOS_BANCARIOS" | "OTRO_NO_APROBACION",
  "confidence": "ALTA" | "MEDIA" | "BAJA",
  "reasoning": string,
  "companyName": string,
  "titleOrPeriod": string,
  "totalAmountMXN": number,
  "totalAmountUSD": number,
  "itemsCount": number,
  "bankBreakdown": [
    { "bankOrSource": string, "amount": number }
  ],
  "keyEntities": string[],
  "observations": string | null,
  "requiresApproval": boolean
}`;

  try {
    const parts: any[] = [{ text: prompt }];
    if (imagePart) parts.push(imagePart);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://perryapp.netlify.app/',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      console.warn('[CLASSIFIER] Error HTTP en Gemini API. Usando clasificador de respaldo.');
      return fallbackClassifier({
        messageText,
        hasMedia: Boolean(imagePart),
        defaultCompany,
        formattedDate,
        isExplicitSupplierText,
        isExplicitOvertimeText,
        isExplicitPayrollText,
        isExplicitBalanceText,
      });
    }

    const jsonResponse = await res.json();
    const rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return fallbackClassifier({
        messageText,
        hasMedia: Boolean(imagePart),
        defaultCompany,
        formattedDate,
        isExplicitSupplierText,
        isExplicitOvertimeText,
        isExplicitPayrollText,
        isExplicitBalanceText,
      });
    }

    const parsed: ClassificationAndParseResult = JSON.parse(rawText);
    parsed.companyName = normalizeCompanyName(parsed.companyName || defaultCompany);
    parsed.reportDate = formattedDate;

    // Validación post-parse con texto explícito (guardarraíl de texto del usuario)
    if (isExplicitSupplierText && parsed.documentType !== 'PAGO_PROVEEDORES') {
      parsed.documentType = 'PAGO_PROVEEDORES';
      parsed.requiresApproval = true;
      parsed.reasoning = 'Reclasificado por indicación textual explícita de Pago a Proveedores.';
    } else if (isExplicitOvertimeText && parsed.documentType !== 'REVISION_HORAS_EXTRA') {
      parsed.documentType = 'REVISION_HORAS_EXTRA';
      parsed.requiresApproval = true;
      parsed.reasoning = 'Reclasificado por indicación textual explícita de Horas Extra.';
    }

    return parsed;
  } catch (err) {
    console.error('[CLASSIFIER] Error al ejecutar clasificador Gemini:', err);
    return fallbackClassifier({
      messageText,
      hasMedia: Boolean(imagePart),
      defaultCompany,
      formattedDate,
      isExplicitSupplierText,
      isExplicitOvertimeText,
      isExplicitPayrollText,
      isExplicitBalanceText,
    });
  }
}

function fallbackClassifier(params: {
  messageText: string;
  hasMedia: boolean;
  defaultCompany: string;
  formattedDate: string;
  isExplicitSupplierText: boolean;
  isExplicitOvertimeText: boolean;
  isExplicitPayrollText: boolean;
  isExplicitBalanceText: boolean;
}): ClassificationAndParseResult {
  const {
    messageText,
    defaultCompany,
    formattedDate,
    isExplicitSupplierText,
    isExplicitOvertimeText,
    isExplicitPayrollText,
    isExplicitBalanceText,
  } = params;

  if (isExplicitSupplierText) {
    return {
      documentType: 'PAGO_PROVEEDORES',
      confidence: 'MEDIA',
      reasoning: 'Clasificado como Pago a Proveedores por palabras clave en el mensaje.',
      companyName: normalizeCompanyName(defaultCompany),
      titleOrPeriod: 'Programación de Pago a Proveedores',
      reportDate: formattedDate,
      totalAmountMXN: 0,
      totalAmountUSD: 0,
      itemsCount: 0,
      bankBreakdown: [],
      keyEntities: [],
      observations: messageText || null,
      requiresApproval: true,
    };
  }

  if (isExplicitOvertimeText) {
    return {
      documentType: 'REVISION_HORAS_EXTRA',
      confidence: 'MEDIA',
      reasoning: 'Clasificado como Horas Extra por palabras clave en el mensaje.',
      companyName: normalizeCompanyName(defaultCompany),
      titleOrPeriod: 'Reporte de Horas Extra',
      reportDate: formattedDate,
      totalAmountMXN: 0,
      totalAmountUSD: 0,
      itemsCount: 0,
      bankBreakdown: [],
      keyEntities: [],
      observations: messageText || null,
      requiresApproval: true,
    };
  }

  if (isExplicitPayrollText) {
    const rayaMatch = messageText.match(/raya\s*(\d+)/i) || messageText.match(/semana\s*(\d+)/i);
    const titleOrPeriod = rayaMatch ? `Raya ${rayaMatch[1]}` : 'Raya Semanal';
    return {
      documentType: 'NOMINA',
      confidence: 'MEDIA',
      reasoning: 'Clasificado como Nómina por palabras clave en el mensaje.',
      companyName: normalizeCompanyName(defaultCompany),
      titleOrPeriod,
      reportDate: formattedDate,
      totalAmountMXN: 0,
      totalAmountUSD: 0,
      itemsCount: 0,
      bankBreakdown: [],
      keyEntities: [],
      observations: messageText || null,
      requiresApproval: true,
    };
  }

  if (isExplicitBalanceText) {
    return {
      documentType: 'SALDOS_BANCARIOS',
      confidence: 'MEDIA',
      reasoning: 'Clasificado como Saldos Bancarios por palabras clave en el mensaje.',
      companyName: normalizeCompanyName(defaultCompany),
      titleOrPeriod: 'Saldos Bancarios',
      reportDate: formattedDate,
      totalAmountMXN: 0,
      totalAmountUSD: 0,
      itemsCount: 0,
      bankBreakdown: [],
      keyEntities: [],
      observations: messageText || null,
      requiresApproval: false,
    };
  }

  return {
    documentType: 'OTRO_NO_APROBACION',
    confidence: 'BAJA',
    reasoning: 'Documento u archivo no clasificado como solicitud de aprobación.',
    companyName: normalizeCompanyName(defaultCompany),
    titleOrPeriod: 'Documento Operativo',
    reportDate: formattedDate,
    totalAmountMXN: 0,
    totalAmountUSD: 0,
    itemsCount: 0,
    bankBreakdown: [],
    keyEntities: [],
    observations: messageText || null,
    requiresApproval: false,
  };
}
