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

  // Heurística de detección de facturación a clientes / operaciones de entrega / PO cliente (Cuentas por cobrar)
  const isClientBillingText = /(se\s*van\s*a\s*facturar|vamos\s*a\s*facturar|para\s*facturar(\s*al\s*cliente)?|facturar\s*(de\s*la\s*po|material|piezas|pcs)|cierre\s*de\s*po|entrega\s*(parcial|total)\s*de\s*la\s*cantidad\s*faltante|se\s*factura\s*la\s*po|orden\s*abierta)/i.test(messageText);

  // Si es un mensaje ordinario de facturación a clientes o cierre de PO y no trae imagen/documento,
  // descartar inmediatamente como solicitud de pago para evitar falsos positivos
  if (isClientBillingText && !mediaUrl) {
    return {
      documentType: 'OTRO_NO_APROBACION',
      confidence: 'ALTA',
      reasoning: 'Instrucción operativa de facturación a cliente o cierre de PO de venta. No representa desembolso ni solicitud de pago.',
      companyName: normalizeCompanyName(defaultCompany),
      titleOrPeriod: 'Facturación / Despacho a Clientes',
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

  // Heurística rápida sobre el texto del mensaje
  const lowerText = messageText.toLowerCase();
  const isExplicitSupplierText = !isClientBillingText && /(pago\s*(a|de)?\s*proveedores?|relaci[oó]n\s*de\s*pagos?|facturas?\s*por\s*pagar|cuentas\s*por\s*pagar|programaci[oó]n\s*de\s*pagos?|dispersi[oó]n\s*a\s*proveedores)/i.test(lowerText);
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
   - Documento que programa o relaciona pagos/egresos a empresas externas, compras de materiales, rentas de equipo, facturas de proveedores, cuotas patronales SUA/IMSS, SAT, pólizas de seguros (ej. CHUBB), o liquidaciones de órdenes de compra (PO / folios Odoo de proveedores).
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
   - Conversaciones casuales, avisos de entrega, instrucciones operativas de facturación a clientes o cobros.

REGLAS CRÍTICAS DE PREVENCIÓN DE FALSOS POSITIVOS (LEER CON MÁXIMA PRIORIDAD):
1. FACTURACIÓN A CLIENTES / DESPACHO / CIERRE DE PO:
   - Si el mensaje habla de "facturar piezas/cubrecalzado/material al cliente", "se van a facturar de la PO...", "cerrar lo pendiente de la PO", "entrega parcial de piezas":
     ESTO ES FACTURACIÓN DE VENTA / CUENTAS POR COBRAR (SALES/RECEIVABLE), NUNCA PAGO A PROVEEDORES NI NÓMINA.
     DEBE clasificarse OBLIGATORIAMENTE como "OTRO_NO_APROBACION" con requiresApproval: false.
2. MENSAJES DE TEXTO SIN DOCUMENTO ADJUNTO Y SIN DESEMBOLSOS MONETARIOS REALES:
   - Una solicitud de autorización de PAGO_PROVEEDORES o NOMINA requiere OBLIGATORIAMENTE un importe monetario a pagar mayor a cero ($ > 0.00) O un documento/imagen adjunta con la relación de pagos.
   - Si el mensaje es solo texto en una conversación ordinaria con monto $0.00 o sin importes monetarios claros, o es un comentario casual ("¿ya llegó la factura?", "avisa al proveedor", "facturamos mañana"):
     DEBE clasificarse OBLIGATORIAMENTE como "OTRO_NO_APROBACION" con requiresApproval: false.
3. CONVERSACIONES CASUALES:
   - Mencionar palabras sueltas como "factura", "proveedor", "nómina", "pagar" en un chat o hacer preguntas casuales NO constituye una solicitud de autorización.

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
- "requiresApproval": true ÚNICAMENTE si es NOMINA, PAGO_PROVEEDORES o REVISION_HORAS_EXTRA Y además cumple una de dos condiciones:
  a) Cuenta con importes monetarios reales mayores a cero (totalAmountMXN > 0 o totalAmountUSD > 0).
  b) O bien cuenta con una imagen o documento adjunto con una lista de pagos / personal a autorizar.
  Si NO hay imagen adjunta y los montos son 0 o no especificados, requiresApproval DEBE SER false y documentType "OTRO_NO_APROBACION".

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

    // Guardarraíl estricto contra falsos positivos:
    // Si no hay imagen ni documento adjunto, y no hay montos a desembolsar (> 0),
    // NUNCA debe considerarse una solicitud de aprobación.
    const hasAttachedMedia = Boolean(imagePart);
    const hasDisbursementAmount = (Number(parsed.totalAmountMXN) > 0 || Number(parsed.totalAmountUSD) > 0);

    if (!hasAttachedMedia && !hasDisbursementAmount) {
      parsed.requiresApproval = false;
      parsed.documentType = 'OTRO_NO_APROBACION';
      parsed.reasoning = parsed.reasoning || 'Mensaje de texto sin archivo adjunto ni importes monetarios cuantificables para autorizar.';
    } else {
      // Validación post-parse con texto explícito (solo si hay montos o imagen adjunta)
      if (isExplicitSupplierText && parsed.documentType !== 'PAGO_PROVEEDORES') {
        parsed.documentType = 'PAGO_PROVEEDORES';
        parsed.requiresApproval = true;
        parsed.reasoning = 'Reclasificado por indicación textual explícita de Pago a Proveedores.';
      } else if (isExplicitOvertimeText && parsed.documentType !== 'REVISION_HORAS_EXTRA') {
        parsed.documentType = 'REVISION_HORAS_EXTRA';
        parsed.requiresApproval = true;
        parsed.reasoning = 'Reclasificado por indicación textual explícita de Horas Extra.';
      }
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
    hasMedia,
    defaultCompany,
    formattedDate,
    isExplicitSupplierText,
    isExplicitOvertimeText,
    isExplicitPayrollText,
    isExplicitBalanceText,
  } = params;

  // Extraer montos numéricos aproximados si existen en el texto
  const amountMatch = messageText.match(/\$\s*([\d,]+(?:\.\d+)?)/) || messageText.match(/\b([\d]{1,3}(?:,\d{3})+(?:\.\d{2})?)\s*(?:mxn|pesos|usd|d[oó]lares)?\b/i);
  let extractedAmount = 0;
  if (amountMatch) {
    extractedAmount = parseFloat(amountMatch[1].replace(/,/g, '')) || 0;
  }
  const isUSD = /usd|d[oó]lares/i.test(messageText);

  // Si no hay archivo/imagen y el monto es 0, NO puede requerir aprobación
  const canRequireApproval = hasMedia || extractedAmount > 0;

  if (isExplicitSupplierText && canRequireApproval) {
    return {
      documentType: 'PAGO_PROVEEDORES',
      confidence: 'MEDIA',
      reasoning: 'Clasificado como Pago a Proveedores por palabras clave e importe/documento en el mensaje.',
      companyName: normalizeCompanyName(defaultCompany),
      titleOrPeriod: 'Programación de Pago a Proveedores',
      reportDate: formattedDate,
      totalAmountMXN: isUSD ? 0 : extractedAmount,
      totalAmountUSD: isUSD ? extractedAmount : 0,
      itemsCount: 1,
      bankBreakdown: [],
      keyEntities: [],
      observations: messageText || null,
      requiresApproval: true,
    };
  }

  if (isExplicitOvertimeText && canRequireApproval) {
    return {
      documentType: 'REVISION_HORAS_EXTRA',
      confidence: 'MEDIA',
      reasoning: 'Clasificado como Horas Extra por palabras clave y documento/importe en el mensaje.',
      companyName: normalizeCompanyName(defaultCompany),
      titleOrPeriod: 'Reporte de Horas Extra',
      reportDate: formattedDate,
      totalAmountMXN: extractedAmount,
      totalAmountUSD: 0,
      itemsCount: 0,
      bankBreakdown: [],
      keyEntities: [],
      observations: messageText || null,
      requiresApproval: true,
    };
  }

  if (isExplicitPayrollText && canRequireApproval) {
    const rayaMatch = messageText.match(/raya\s*(\d+)/i) || messageText.match(/semana\s*(\d+)/i);
    const titleOrPeriod = rayaMatch ? `Raya ${rayaMatch[1]}` : 'Raya Semanal';
    return {
      documentType: 'NOMINA',
      confidence: 'MEDIA',
      reasoning: 'Clasificado como Nómina por palabras clave y documento/importe en el mensaje.',
      companyName: normalizeCompanyName(defaultCompany),
      titleOrPeriod,
      reportDate: formattedDate,
      totalAmountMXN: extractedAmount,
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
    reasoning: 'Mensaje ordinario o documento sin requerimiento de aprobación directiva.',
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
