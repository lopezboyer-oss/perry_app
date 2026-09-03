import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccessTreasuryDashboard } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function parseAuditResponse(rawText: string): any {
  let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 1. Direct JSON parse
  try {
    return JSON.parse(cleaned);
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
    return JSON.parse(repaired);
  } catch {}

  // 3. Robust Regex Extraction fallback
  const totalMatch = rawText.match(/["']?totalAmount["']?\s*:\s*([\d,.]+)/i);
  const employeeMatch = rawText.match(/["']?employeeCount["']?\s*:\s*(\d+)/i);
  const classMatch = rawText.match(/["']?classification["']?\s*:\s*["']([^"']+)["']/i);
  const periodMatch = rawText.match(/["']?detectedPeriod["']?\s*:\s*["']([^"']+)["']/i);
  const companyMatch = rawText.match(/["']?detectedCompany["']?\s*:\s*["']([^"']+)["']/i);
  const notesMatch = rawText.match(/["']?auditNotes["']?\s*:\s*["']([^"']+)["']/i);

  const parsedTotal = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;

  return {
    classification: classMatch ? classMatch[1] : 'NOMINA_COMPLETA',
    detectedCompany: companyMatch ? companyMatch[1] : '',
    detectedPeriod: periodMatch ? periodMatch[1] : 'Raya Semanal',
    totalAmount: isNaN(parsedTotal) ? 0 : parsedTotal,
    employeeCount: employeeMatch ? parseInt(employeeMatch[1], 10) : 0,
    bankBreakdown: [],
    auditNotes: notesMatch ? notesMatch[1] : 'Documento analizado con visión artificial.',
  };
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

    const prompt = `Eres un Auditor Contable. Analiza este documento de nómina ${companyHint ? `de la empresa "${companyHint}"` : ''} y extrae en JSON plano:
1. "detectedCompany": Empresa ("GRUPO CASEME", "DROBOTS", "OPUS INGENIUM", "VULCAN FORGE", etc.).
2. "detectedPeriod": Periodo o raya (ej. "Raya 35").
3. "totalAmount": Gran Total Neto a Dispersar (número decimal). Si hay bancos y efectivo, suma ambos. Si es PDF multipágina, busca el gran total concentrado neto general.
4. "employeeCount": Número total de empleados/trabajadores listados.
5. "bankBreakdown": [{"bankOrSource": string, "amount": number}].
6. "auditNotes": Breve resumen de 1 o 2 oraciones sobre lo detectado en la hoja.

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
