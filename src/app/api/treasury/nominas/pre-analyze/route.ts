import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccessTreasuryDashboard } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function reconcileAndFormatAuditData(rawParsed: any): any {
  let detectedCompany = String(rawParsed?.detectedCompany || '').trim();
  let detectedPeriod = String(rawParsed?.detectedPeriod || 'Raya Semanal').trim();
  let employeeCount = parseInt(String(rawParsed?.employeeCount), 10) || 0;
  let totalAmount = typeof rawParsed?.totalAmount === 'number'
    ? rawParsed.totalAmount
    : parseFloat(String(rawParsed?.totalAmount || '0').replace(/,/g, '')) || 0;

  let bankBreakdown = Array.isArray(rawParsed?.bankBreakdown) ? rawParsed.bankBreakdown : [];

  // 1. Sanitizar y limpiar bankBreakdown
  const cleanBanks = bankBreakdown
    .map((b: any) => ({
      bankOrSource: String(b?.bankOrSource || 'Banco').trim().toUpperCase(),
      amount: typeof b?.amount === 'number'
        ? b.amount
        : parseFloat(String(b?.amount || '0').replace(/,/g, '')) || 0,
    }))
    .filter((b: any) => b.amount > 0 || b.bankOrSource.length > 0);

  const bankSum = cleanBanks.reduce((acc: number, b: any) => acc + b.amount, 0);

  // 2. Conciliación de Coherencia Aritmética:
  // Si los bancos suman un monto positivo y hay discrepancia con totalAmount:
  if (bankSum > 0) {
    if (totalAmount <= 0 || Math.abs(totalAmount - bankSum) > 0.5) {
      // Priorizamos la suma de las fuentes netas para evitar que totalAmount sea el bruto/percepciones
      totalAmount = Math.round(bankSum * 100) / 100;
    }
  } else if (totalAmount > 0 && cleanBanks.length === 0) {
    // Si la IA identificó el total pero no desglosó bancos, asignamos la fuente principal
    cleanBanks.push({
      bankOrSource: 'SANTANDER (CONTPAQ)',
      amount: totalAmount,
    });
  }

  // 3. Generar nota de auditoría cuantitativa consistente y legible
  const fmt = (num: number) =>
    `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

  const breakdownSummary = cleanBanks
    .map((b: any) => `${b.bankOrSource}: $${b.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`)
    .join(' + ');

  const auditNotes = `Nómina ${detectedCompany || ''} (${detectedPeriod}): Gran Total Neto a Dispersar ${fmt(totalAmount)} [${breakdownSummary}] para ${employeeCount} empleados.`;

  return {
    detectedCompany,
    detectedPeriod,
    totalAmount,
    employeeCount,
    bankBreakdown: cleanBanks,
    auditNotes,
  };
}

function parseAuditResponse(rawText: string): any {
  let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 1. Direct JSON parse
  try {
    const direct = JSON.parse(cleaned);
    return reconcileAndFormatAuditData(direct);
  } catch {}

  // 2. Repair bracket/quote unbalance if cut off
  try {
    let repaired = cleaned.replace(/,\s*([\}\]])/g, '$1');
    const quotes = (repaired.match(/(?<!\\)"/g) || []).length;
    if (quotes % 2 !== 0) repaired += '"';
    const openSquare = (repaired.match(/\[/g) || []).length;
    const closeSquare = (repaired.match(/\]/g) || []).length;
    for (let i = 0; i < openSquare - closeSquare; i++) repaired += ']';
    const openCurl = (repaired.match(/\{/g) || []).length;
    const closeCurl = (repaired.match(/\}/g) || []).length;
    for (let i = 0; i < openCurl - closeCurl; i++) repaired += '}';
    const repairedJson = JSON.parse(repaired);
    return reconcileAndFormatAuditData(repairedJson);
  } catch {}

  // 3. Robust Regex Extraction fallback
  const totalMatch = rawText.match(/["']?totalAmount["']?\s*:\s*([\d,.]+)/i);
  const employeeMatch = rawText.match(/["']?employeeCount["']?\s*:\s*(\d+)/i);
  const periodMatch = rawText.match(/["']?detectedPeriod["']?\s*:\s*["']([^"']+)["']/i);
  const companyMatch = rawText.match(/["']?detectedCompany["']?\s*:\s*["']([^"']+)["']/i);

  const parsedTotal = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;

  return reconcileAndFormatAuditData({
    detectedCompany: companyMatch ? companyMatch[1] : '',
    detectedPeriod: periodMatch ? periodMatch[1] : 'Raya Semanal',
    totalAmount: isNaN(parsedTotal) ? 0 : parsedTotal,
    employeeCount: employeeMatch ? parseInt(employeeMatch[1], 10) : 0,
    bankBreakdown: [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    const userRole = (session.user as any)?.role || '';
    const isDirector = canAccessTreasuryDashboard(email) || userRole === 'ADMIN';

    if (!isDirector) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { accessNominas: true },
      });
      if (!dbUser?.accessNominas) {
        return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 });
      }
    }

    const { fileData, companyHint } = await req.json();

    if (!fileData || typeof fileData !== 'string') {
      return NextResponse.json({ error: 'Archivo de nómina requerido' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 });
    }

    let mimeType = 'image/jpeg';
    let base64Content = fileData;

    if (fileData.startsWith('data:')) {
      const parts = fileData.split(',');
      const header = parts[0];
      base64Content = parts[1] || '';
      const mimeMatch = header.match(/data:([^;]+);/);
      if (mimeMatch) mimeType = mimeMatch[1];
    }

    const prompt = `Eres un Auditor Contable y Financiero. Analiza detenidamente este documento de nómina ${companyHint ? `de la empresa "${companyHint}"` : ''} y extrae en JSON plano con EXACTITUD MATEMÁTICA:

REGLAS CRÍTICAS DE EXTRACCIÓN Y CUADRE:
1. "totalAmount": GRAN TOTAL NETO A DISPERSAR (número decimal, ej. 137414.12 o 46941.40).
   - IMPORTANTE: Debe ser el "NETO A PAGAR", "TOTAL A DISPERSAR" o "LÍQUIDO A RECIBIR" (el dinero real que sale del banco o caja para pagar sueldos).
   - NUNCA uses "Total Percepciones", "Subtotal Bruto", ni subtotales parciales de una sola página.
   - Si el documento contiene dispersión bancaria y pago en efectivo, "totalAmount" es la SUMA de ambas fuentes (Bancos + Efectivo).

2. "bankBreakdown": Lista de desembolsos por cada banco o fuente de pago:
   - "bankOrSource": Nombre de la fuente (ej. "SANTANDER", "BANAMEX", "BBVA", "EFECTIVO", "CHEQUE").
   - "amount": Monto en número decimal para esa fuente.
   - REGLA DE ORO DE CUADRE: La suma de todos los "amount" en "bankBreakdown" DEBE COINCIDIR EXACTAMENTE con "totalAmount".

3. "detectedCompany": Empresa ("GRUPO CASEME", "DROBOTS", "OPUS INGENIUM", "VULCAN FORGE", etc.).
4. "detectedPeriod": Periodo o raya (ej. "Raya 35", "Semana 35", "Período 35").
5. "employeeCount": Conteo total de trabajadores o renglones listados.
6. "auditNotes": Resumen ejecutivo breve indicando: Gran Total Neto extraído, desglose por bancos/efectivo, y empleados.

Responde ÚNICAMENTE en JSON válido con esta estructura:
{
  "detectedCompany": string,
  "detectedPeriod": string,
  "totalAmount": number,
  "employeeCount": number,
  "bankBreakdown": [{"bankOrSource": string, "amount": number}],
  "auditNotes": string
}`;

    const parts: any[] = [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Content,
        },
      },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 24000);

    let geminiRes: Response;
    try {
      geminiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://perryapp.netlify.app/',
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json({ error: 'Error del motor de IA', details: errText }, { status: 502 });
    }

    const json = await geminiRes.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json({ error: 'No se obtuvo respuesta de la IA' }, { status: 502 });
    }

    const detected = parseAuditResponse(rawText);

    return NextResponse.json({
      success: true,
      detected,
    });
  } catch (error: any) {
    console.error('[PRE-ANALYZE ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error analizando documento' }, { status: 500 });
  }
}
