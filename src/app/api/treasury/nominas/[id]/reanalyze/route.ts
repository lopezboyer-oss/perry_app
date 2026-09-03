import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessTreasuryDashboard } from '@/lib/permissions';

export const maxDuration = 26; // Netlify max serverless execution duration

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
        { error: 'Este registro no cuenta con imagen adjunta ni texto para analizar.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY no configurada en el servidor' }, { status: 500 });
    }

    // Download image with strict 8s timeout to avoid serverless timeout
    let imagePart: { inlineData: { mimeType: string; data: string } } | null = null;
    if (targetImageUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const imgRes = await fetch(targetImageUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString('base64');
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          imagePart = {
            inlineData: {
              mimeType: contentType.split(';')[0].trim(),
              data: base64Data,
            },
          };
        }
      } catch (err: any) {
        console.warn('[REANALYZE] Error o timeout descargando imagen de nómina:', err.message);
      }
    }

    const auditPrompt = `Actúa como un Auditor Contable y Especialista Forense en Dispersión de Nóminas Industriales y de Construcción.
Tu tarea es auditar detalladamente esta hoja / documento de nómina para validar si es una nómina completa o un fragmento, y extraer las cifras cuantitativas con exactitud matemática.

DATOS ACTUALES EN LA FICHA DE PERRY APP:
- Empresa Asignada: "${payroll.companyName}"
- Periodo Asignado: "${payroll.periodNumber || 'N/A'}"
- Monto Registrado Actualmente: $${payroll.totalAmount} MXN
- Mensaje original en el chat: "${payroll.rawMessage || ''}"

INSTRUCCIONES DE AUDITORÍA Y CLASIFICACIÓN ESTRICTA:
1. "classification": Clasifica taxativamente el documento en uno de estos 3 valores:
   - "NOMINA_COMPLETA": Si es la nómina semanal/quincenal principal o concentrado de dispersión con el total de sueldos de la plantilla.
   - "REPORTE_PARCIAL_HORAS_EXTRA": Si el documento es ÚNICAMENTE un listado de Horas Extras, Tiempo Extraordinario, Asistencia, o un comprobante/finiquito individual de un solo trabajador, y NO la dispersión total de sueldos.
   - "NO_ES_NOMINA": Si la imagen corresponde a una factura, comprobante bancario, foto de material, cotización o texto irrelevante que fue detectado erróneamente.

2. "confidence": Nivel de certeza de la lectura: "ALTA", "MEDIA", o "BAJA".

3. "detectedCompany": Nombre de la empresa identificada en el documento ("GRUPO CASEME", "DROBOTS", "OPUS INGENIUM", "VULCAN FORGE", u otra visible).

4. "detectedPeriod": Periodo o raya identificado en el documento (ej. "Raya 34", "Semana 34").

5. "totalAmount": Gran Total Neto a Dispersar en número decimal.
   - ATENCIÓN: Si hay columnas separadas de dispersión bancaria (CONTPAQ / SANTANDER) y EFECTIVO, el total debe ser la suma de ambos componentes.
   - Si es "NO_ES_NOMINA" o solo horas extra, indica la suma cuantitativa que realmente contiene el documento.

6. "employeeCount": Número de personas o filas con empleados listados.

7. "bankBreakdown": Arreglo de fuentes y montos:
   [
     { "bankOrSource": "SANTANDER (CONTPAQ)", "amount": 35200.00 },
     { "bankOrSource": "EFECTIVO", "amount": 7650.00 }
   ]

8. "auditNotes": Explicación ejecutiva y clara para Dirección sobre lo que se observa:
   - ¿Coinciden las sumas aritméticas visibles?
   - ¿Es nómina completa o solo tiempo extra?
   - ¿Qué discrepancias existen con los $${payroll.totalAmount} registrados originalmente?

9. "hasDiscrepancies": boolean (true si el total detectado difiere del monto registrado previamente o si hay errores de suma en el documento).

Responde ÚNICAMENTE con un JSON plano válido con la siguiente estructura:
{
  "classification": "NOMINA_COMPLETA" | "REPORTE_PARCIAL_HORAS_EXTRA" | "NO_ES_NOMINA",
  "confidence": "ALTA" | "MEDIA" | "BAJA",
  "detectedCompany": string,
  "detectedPeriod": string,
  "totalAmount": number,
  "employeeCount": number,
  "bankBreakdown": [
    { "bankOrSource": string, "amount": number }
  ],
  "observations": string,
  "auditNotes": string,
  "hasDiscrepancies": boolean
}`;

    const parts: any[] = [{ text: auditPrompt }];
    if (imagePart) parts.push(imagePart);

    // ESTRATEGIA HÍBRIDA:
    // 1. Intentar primero con el modelo avanzado de mayor precisión forense (gemini-2.5-pro)
    // 2. Si hay error o falta de cuota en Pro, fallback automático a gemini-2.5-flash
    const modelsToTry = ['gemini-2.5-pro', 'gemini-2.5-flash'];
    let rawText: string | null = null;
    let usedModel = '';

    for (const modelName of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const geminiController = new AbortController();
      const geminiTimeout = setTimeout(() => geminiController.abort(), 15000);

      try {
        const geminiRes = await fetch(url, {
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
          signal: geminiController.signal,
        });
        clearTimeout(geminiTimeout);

        if (geminiRes.ok) {
          const jsonResponse = await geminiRes.json();
          rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text || null;
          if (rawText) {
            usedModel = modelName;
            console.log(`[REANALYZE] Auditoría exitosa utilizando modelo: ${modelName}`);
            break;
          }
        } else {
          const errStatus = geminiRes.status;
          const errBody = await geminiRes.text();
          console.warn(`[REANALYZE] Modelo ${modelName} devolvió ${errStatus}: ${errBody.substring(0, 150)}. Intentando siguiente modelo...`);
        }
      } catch (callErr: any) {
        clearTimeout(geminiTimeout);
        console.warn(`[REANALYZE] Error o timeout en llamada a ${modelName}:`, callErr.message);
      }
    }

    if (!rawText) {
      return NextResponse.json(
        { error: 'No se pudo obtener respuesta del servicio de IA de Gemini. Por favor reintenta.' },
        { status: 502 }
      );
    }

    // Clean any accidental markdown code fence wrapping
    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    let auditData: any;
    try {
      auditData = JSON.parse(cleanJson);
    } catch (parseErr: any) {
      console.error('[REANALYZE JSON PARSE ERROR]', rawText);
      return NextResponse.json(
        { error: 'La respuesta de IA no tuvo un formato JSON válido', rawText },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      audit: auditData,
      modelUsed: usedModel,
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
