import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessTreasuryDashboard } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

function reconcileReanalyzeData(raw: any, fallbackRecord: any): any {
  let totalAmount = typeof raw?.totalAmount === 'number'
    ? raw.totalAmount
    : parseFloat(String(raw?.totalAmount || '0').replace(/,/g, '')) || fallbackRecord.totalAmount || 0;

  let bankBreakdown = Array.isArray(raw?.bankBreakdown) ? raw.bankBreakdown : [];
  const cleanBanks = bankBreakdown
    .map((b: any) => ({
      bankOrSource: String(b?.bankOrSource || 'Banco').trim().toUpperCase(),
      amount: typeof b?.amount === 'number'
        ? b.amount
        : parseFloat(String(b?.amount || '0').replace(/,/g, '')) || 0,
    }))
    .filter((b: any) => b.amount > 0 || b.bankOrSource.length > 0);

  const bankSum = cleanBanks.reduce((acc: number, b: any) => acc + b.amount, 0);
  if (bankSum > 0 && Math.abs(totalAmount - bankSum) > 0.5) {
    totalAmount = Math.round(bankSum * 100) / 100;
  }

  return {
    ...raw,
    totalAmount,
    bankBreakdown: cleanBanks,
    hasDiscrepancies: Math.abs(totalAmount - fallbackRecord.totalAmount) > 1,
  };
}

function parseAuditResponse(rawText: string, fallbackRecord: any): any {
  let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Find { and } boundaries
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 1. Direct JSON parse
  try {
    const direct = JSON.parse(cleaned);
    return reconcileReanalyzeData(direct, fallbackRecord);
  } catch {
    console.warn('[REANALYZE] Direct JSON parse failed, attempting syntax repair...');
  }

  // 2. Repair bracket/quote unbalance if cut off
  try {
    let repaired = cleaned;
    // Strip trailing commas before braces: ,} -> } or ,] -> ]
    repaired = repaired.replace(/,\s*([\}\]])/g, '$1');

    // Balance quotes
    const quotes = (repaired.match(/(?<!\\)"/g) || []).length;
    if (quotes % 2 !== 0) repaired += '"';

    // Balance brackets
    const openSquare = (repaired.match(/\[/g) || []).length;
    const closeSquare = (repaired.match(/\]/g) || []).length;
    for (let i = 0; i < openSquare - closeSquare; i++) repaired += ']';

    const openCurl = (repaired.match(/\{/g) || []).length;
    const closeCurl = (repaired.match(/\}/g) || []).length;
    for (let i = 0; i < openCurl - closeCurl; i++) repaired += '}';

    const repairedObj = JSON.parse(repaired);
    return reconcileReanalyzeData(repairedObj, fallbackRecord);
  } catch {
    console.warn('[REANALYZE] Repaired JSON parse failed, using robust regex extraction...');
  }

  // 3. Robust Regex Extraction fallback
  const totalMatch = rawText.match(/["']?totalAmount["']?\s*:\s*([\d,.]+)/i);
  const employeeMatch = rawText.match(/["']?employeeCount["']?\s*:\s*(\d+)/i);
  const classMatch = rawText.match(/["']?classification["']?\s*:\s*["']([^"']+)["']/i);
  const confMatch = rawText.match(/["']?confidence["']?\s*:\s*["']([^"']+)["']/i);
  const periodMatch = rawText.match(/["']?detectedPeriod["']?\s*:\s*["']([^"']+)["']/i);
  const companyMatch = rawText.match(/["']?detectedCompany["']?\s*:\s*["']([^"']+)["']/i);
  const notesMatch = rawText.match(/["']?auditNotes["']?\s*:\s*["']([^"']+)["']/i);

  const parsedTotal = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : fallbackRecord.totalAmount || 0;

  return reconcileReanalyzeData({
    classification: (classMatch ? classMatch[1] : 'NOMINA_COMPLETA') as any,
    confidence: (confMatch ? confMatch[1] : 'ALTA') as any,
    detectedCompany: companyMatch ? companyMatch[1] : fallbackRecord.companyName,
    detectedPeriod: periodMatch ? periodMatch[1] : fallbackRecord.periodNumber || 'Raya Semanal',
    totalAmount: isNaN(parsedTotal) ? fallbackRecord.totalAmount : parsedTotal,
    employeeCount: employeeMatch ? parseInt(employeeMatch[1], 10) : fallbackRecord.employeeCount || 0,
    bankBreakdown: [],
    observations: fallbackRecord.observations || '',
    auditNotes: notesMatch ? notesMatch[1] : 'Auditoría cuantitativa extraída del documento de nómina.',
    hasDiscrepancies: Math.abs(parsedTotal - fallbackRecord.totalAmount) > 1,
  }, fallbackRecord);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    const userRole = (session.user as any)?.role || '';
    if (!canAccessTreasuryDashboard(email) && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso restringido a nóminas' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'ID de nómina requerido' }, { status: 400 });
    }

    const payroll = await prisma.payrollLog.findUnique({
      where: { id },
    });

    if (!payroll) {
      return NextResponse.json({ error: 'Registro de nómina no encontrado' }, { status: 404 });
    }

    const targetImageUrl = payroll.imageUrl || payroll.signedImageUrl;
    if (!targetImageUrl && !payroll.rawMessage) {
      return NextResponse.json(
        { error: 'Este registro no cuenta con imagen/PDF adjunto ni texto para analizar.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY no configurada en el servidor' }, { status: 500 });
    }

    // Download file with strict 6s timeout
    let imagePart: { inlineData: { mimeType: string; data: string } } | null = null;
    let isPdfFile = false;

    if (targetImageUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const imgRes = await fetch(targetImageUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64Data = buffer.toString('base64');

          // Detect true MIME type via magic bytes
          let detectedMime = 'image/jpeg';
          if (buffer.length >= 4) {
            if (buffer.slice(0, 4).toString() === '%PDF') {
              detectedMime = 'application/pdf';
              isPdfFile = true;
            } else if (buffer[0] === 0x89 && buffer[1] === 0x50) {
              detectedMime = 'image/png';
            } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
              detectedMime = 'image/jpeg';
            }
          }

          imagePart = {
            inlineData: {
              mimeType: detectedMime,
              data: base64Data,
            },
          };
        }
      } catch (err: any) {
        console.warn('[REANALYZE] Error o timeout descargando archivo adjunto:', err.message);
      }
    }

    const auditPrompt = `Eres un Auditor Contable. Analiza rápidamente este documento de nómina ${isPdfFile ? '(PDF)' : '(imagen)'} y extrae en JSON plano:

DATOS EN PERRY APP:
- Empresa: "${payroll.companyName}"
- Periodo: "${payroll.periodNumber || 'N/A'}"
- Monto Registrado: $${payroll.totalAmount} MXN

INSTRUCCIONES CLAVE:
1. "classification": "NOMINA_COMPLETA" (si es dispersión de sueldos), "REPORTE_PARCIAL_HORAS_EXTRA" (si es solo tiempo extra/horas extra), o "NO_ES_NOMINA" (si es factura o documento ajeno).
2. "confidence": "ALTA" | "MEDIA" | "BAJA".
3. "detectedCompany": Empresa identificada ("GRUPO CASEME", "DROBOTS", "OPUS INGENIUM", "VULCAN FORGE", etc.).
4. "detectedPeriod": Periodo o raya (ej. "Raya 34").
5. "totalAmount": Gran Total Neto a Dispersar (número decimal). Si hay bancos y efectivo, suma ambos. Si es PDF multipágina, busca el total concentrado neto general.
6. "employeeCount": Número total de trabajadores listados.
7. "bankBreakdown": [{"bankOrSource": string, "amount": number}].
8. "auditNotes": Nota ejecutiva de máximo 1 o 2 oraciones sobre sumas o discrepancias.
9. "hasDiscrepancies": true si el total difiere de $${payroll.totalAmount}.

Responde ÚNICAMENTE este JSON:
{
  "classification": "NOMINA_COMPLETA" | "REPORTE_PARCIAL_HORAS_EXTRA" | "NO_ES_NOMINA",
  "confidence": "ALTA" | "MEDIA" | "BAJA",
  "detectedCompany": string,
  "detectedPeriod": string,
  "totalAmount": number,
  "employeeCount": number,
  "bankBreakdown": [{"bankOrSource": string, "amount": number}],
  "observations": string,
  "auditNotes": string,
  "hasDiscrepancies": boolean
}`;

    const parts: any[] = [{ text: auditPrompt }];
    if (imagePart) parts.push(imagePart);

    // Llamada directa a gemini-2.5-flash con timeout de 24s y 2048 tokens
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const geminiController = new AbortController();
    const geminiTimeout = setTimeout(() => geminiController.abort(), 24000);

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
        signal: geminiController.signal,
      });
    } catch (callErr: any) {
      clearTimeout(geminiTimeout);
      const isTimeout = callErr.name === 'AbortError';
      return NextResponse.json(
        {
          error: isTimeout
            ? 'El análisis de visión con IA excedió el tiempo límite. Por favor reintenta.'
            : `Error de conexión con Gemini: ${callErr.message}`,
        },
        { status: 504 }
      );
    } finally {
      clearTimeout(geminiTimeout);
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[REANALYZE GEMINI ERROR]', geminiRes.status, errText);
      return NextResponse.json(
        { error: 'Error comunicándose con el motor de Gemini', details: errText },
        { status: 502 }
      );
    }

    const jsonResponse = await geminiRes.json();
    const rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json(
        { error: 'No se pudo obtener respuesta del servicio de IA de Gemini. Por favor reintenta.' },
        { status: 502 }
      );
    }

    // Parse with multi-layer fallback to never fail with JSON syntax error
    const auditData = parseAuditResponse(rawText, payroll);

    return NextResponse.json({
      success: true,
      audit: auditData,
      isPdf: isPdfFile,
      modelUsed: 'gemini-2.5-flash',
      currentRecord: {
        id: payroll.id,
        companyName: payroll.companyName,
        periodNumber: payroll.periodNumber,
        totalAmount: payroll.totalAmount,
        employeeCount: payroll.employeeCount,
        imageUrl: targetImageUrl,
      },
    });
  } catch (error: any) {
    console.error('[REANALYZE API ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error en análisis con IA' }, { status: 500 });
  }
}
