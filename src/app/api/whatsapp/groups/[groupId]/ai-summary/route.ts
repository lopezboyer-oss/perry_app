import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessWhatsappCoPilot } from '@/lib/permissions';

export async function POST(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Access control: only authorized email (Ivan Lopez)
    const userEmail = (session.user as any)?.email || '';
    if (!canAccessWhatsappCoPilot(userEmail)) {
      return NextResponse.json({ error: 'No tienes acceso a esta función' }, { status: 403 });
    }

    const { groupId } = params;
    const decodedGroupId = decodeURIComponent(groupId);

    // Parse period from request body
    let body: any = {};
    try {
      body = await req.json();
    } catch {}
    const period: string = body.period || 'today';

    // 1. Resolve Group Mapping FIRST
    let group = await prisma.whatsappGroupMapping.findUnique({
      where: { groupId: decodedGroupId },
    });

    if (!group) {
      group = await prisma.whatsappGroupMapping.findFirst({
        where: {
          OR: [
            { id: decodedGroupId },
            { groupId: decodedGroupId },
          ],
        },
      });
    }

    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
    }

    // 1b. Security Check: Financial, Consorcio or Reserved groups require Ivan Lopez permissions
    if (['ADMINISTRATIVO_FINANCIERO', 'CONSORCIO', 'RESERVADO_DIRECCION'].includes(group.groupCategory)) {
      const email = (session?.user as any)?.email || '';
      if (!canAccessTreasuryDashboard(email)) {
        return NextResponse.json({ error: 'Acceso restringido a este grupo de administración/finanzas' }, { status: 403 });
      }
    }

    // 2. Calculate date range based on period (Tijuana timezone — DST-aware)
    const TIMEZONE = 'America/Tijuana';
    const now = new Date();

    const localDateStr = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
    const [localYear, localMonth, localDay] = localDateStr.split('-').map(Number);

    const getOffsetMs = (y: number, m: number, d: number) => {
      const refDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const utcStr = refDate.toLocaleString('en-US', { timeZone: 'UTC' });
      const localStr = refDate.toLocaleString('en-US', { timeZone: TIMEZONE });
      return new Date(utcStr).getTime() - new Date(localStr).getTime();
    };

    const startOfDay = (y: number, m: number, d: number) => {
      const offsetMs = getOffsetMs(y, m, d);
      return new Date(Date.UTC(y, m - 1, d) + offsetMs);
    };

    let whereClause: any = { groupId: group.groupId };
    let periodLabel = '';

    if (period === 'yesterday') {
      const yDate = new Date(Date.UTC(localYear, localMonth - 1, localDay - 1));
      const yY = yDate.getUTCFullYear(), yM = yDate.getUTCMonth() + 1, yD = yDate.getUTCDate();
      const startYesterday = startOfDay(yY, yM, yD);
      const endYesterday = new Date(startOfDay(localYear, localMonth, localDay).getTime() - 1);
      whereClause.createdAt = { gte: startYesterday, lte: endYesterday };
      periodLabel = `Ayer (${String(yD).padStart(2,'0')}/${String(yM).padStart(2,'0')}/${yY})`;
    } else if (period === 'week') {
      const wDate = new Date(Date.UTC(localYear, localMonth - 1, localDay - 7));
      const start7Days = startOfDay(wDate.getUTCFullYear(), wDate.getUTCMonth() + 1, wDate.getUTCDate());
      whereClause.createdAt = { gte: start7Days };
      periodLabel = 'Últimos 7 Días';
    } else if (period === 'month') {
      const startMonth = startOfDay(localYear, localMonth, 1);
      whereClause.createdAt = { gte: startMonth };
      const monthName = now.toLocaleDateString('es-MX', { timeZone: TIMEZONE, month: 'long', year: 'numeric' });
      periodLabel = `Mes Actual (${monthName})`;
    } else if (period === 'all') {
      periodLabel = 'Histórico Completo';
    } else {
      // 'today' default
      const startToday = startOfDay(localYear, localMonth, localDay);
      whereClause.createdAt = { gte: startToday };
      periodLabel = `Hoy (${String(localDay).padStart(2,'0')}/${String(localMonth).padStart(2,'0')}/${localYear})`;
    }

    let logs = await prisma.whatsappMessageLog.findMany({
      where: whereClause,
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    // If 0 logs found for specific period (e.g. today has no activity yet), return a helpful structured fallback
    if (logs.length === 0) {
      const totalGroupLogsCount = await prisma.whatsappMessageLog.count({
        where: { groupId: group.groupId },
      });

      return NextResponse.json({
        summary: {
          executiveSummary: `No se registraron mensajes en este grupo durante el período: ${periodLabel}.${
            totalGroupLogsCount > 0
              ? ' El grupo cuenta con mensajes en otros períodos (prueba consultar "Ayer", "7 Días" o "Histórico").'
              : ' Aún no hay mensajes respaldados en este grupo.'
          }`,
          workAdvances: [],
          equipmentAlerts: [],
          materialRequests: [],
          operationalRecommendations: [
            totalGroupLogsCount > 0
              ? 'Selecciona "7 Días" o "Histórico" para analizar la actividad pasada del grupo.'
              : 'Verifica que el bot de Perry esté agregado al grupo y activo para comenzar a registrar la actividad.',
          ],
          period: periodLabel,
          messageCount: 0,
        },
      });
    }

    // 3. Compile prompt data from logs
    const groupName = group.groupName || 'Grupo WhatsApp';
    let promptData = `GRUPO DE TRABAJO: "${groupName}" (ID: ${group.groupId})\n`;
    promptData += `PERÍODO DEL RESUMEN: ${periodLabel}\n`;
    promptData += `CANTIDAD DE REGISTROS ANALIZADOS: ${logs.length}\n\n`;
    promptData += `HISTORIAL DE MENSAJES Y NOTAS DE VOZ TRANSCRITAS:\n`;

    logs.reverse().forEach((log: any, idx: number) => {
      let parsed: any = {};
      try {
        parsed = JSON.parse(log.parsedData || '{}');
      } catch {}

      promptData += `--- Registro ${idx + 1} [${new Date(log.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}] ---\n`;
      promptData += `Remitente: ${log.senderName || log.senderPhone}\n`;
      promptData += `Tipo de Evento: ${parsed.messageType || 'GENERAL_OPERATIONAL'}\n`;
      if (parsed.workOrderFolio) promptData += `Orden de Trabajo (OT): ${parsed.workOrderFolio}\n`;
      if (parsed.manPowerEquipo) promptData += `Equipo Afectado: ${parsed.manPowerEquipo} (Estatus: ${parsed.equipmentStatus || 'N/A'})\n`;
      if (parsed.transcription) promptData += `🎙️ Transcripción Nota de Voz: "${parsed.transcription}"\n`;
      if (log.rawMessage) promptData += `Mensaje: "${log.rawMessage}"\n`;
      if (parsed.summary) promptData += `Resumen IA: ${parsed.summary}\n`;
      if (parsed.parts && parsed.parts.length > 0) {
        promptData += `Materiales/Refacciones:\n`;
        parsed.parts.forEach((p: any) => {
          promptData += ` - ${p.quantity}x ${p.name} (${p.providerType || 'COTIZAR'})\n`;
        });
      }
      promptData += `\n`;
    });

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'Configurado_En_Netlify') {
      return NextResponse.json({
        summary: {
          executiveSummary: `Diagnóstico operativo para ${periodLabel}: Se analizaron ${logs.length} registros del grupo "${groupName}". (Nota: GEMINI_API_KEY requiere configuración en el archivo .env local o en el panel de Netlify).`,
          workAdvances: logs.slice(0, 3).map((l: any) => `${l.senderName || l.senderPhone}: ${l.rawMessage || 'Evidencia enviada'}`),
          equipmentAlerts: [],
          materialRequests: [],
          operationalRecommendations: ['Configurar GEMINI_API_KEY para habilitar el análisis sintético profundo con Gemini 2.5 Flash.'],
          period: periodLabel,
          messageCount: logs.length,
        },
      });
    }

    const systemPrompt = `Eres el copiloto de inteligencia operacional senior de Perry Intelligence.
Tu misión es generar un Diagnóstico Ejecutivo de Inteligencia Operativa extremadamente preciso a partir de los mensajes, notas de voz transcritas y fotos recibidas en el grupo de WhatsApp "${groupName}".
PERÍODO DE ANÁLISIS: ${periodLabel}

ESTRUCTURA DE RESPUESTA EN JSON OBLIGATORIA:
Responde ÚNICAMENTE con un objeto JSON válido con las siguientes llaves:
{
  "executiveSummary": "Resumen narrativo claro y profesional de 3 a 4 oraciones sobre el estado global del grupo, áreas atendidas, ritmo de trabajo y supervisor o personal clave activo.",
  "workAdvances": [
    "Viñeta concisa 1 de trabajo completado o avance reportado",
    "Viñeta concisa 2"
  ],
  "equipmentAlerts": [
    {
      "equipo": "Código de equipo ej: EQ-0105",
      "status": "FUERA_DE_SERVICIO" | "DEGRADADO" | "OPERATIVO",
      "issue": "Descripción técnica concisa del problema o falla reportada"
    }
  ],
  "materialRequests": [
    {
      "name": "Nombre del material/refacción",
      "quantity": 1,
      "providerType": "COTIZAR" | "CLIENTE"
    }
  ],
  "operationalRecommendations": [
    "Recomendación táctica 1 para supervisión o compras",
    "Recomendación táctica 2"
  ]
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://perryapp.netlify.app/',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\nDATOS OPERATIVOS DEL GRUPO:\n${promptData}` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Error en API Gemini:', res.status, errText);
      return NextResponse.json({ error: 'Error comunicando con Gemini IA' }, { status: 500 });
    }

    const jsonResponse = await res.json();
    const rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json({ error: 'Respuesta vacía de Gemini IA' }, { status: 500 });
    }

    const summary = JSON.parse(rawText);

    return NextResponse.json({
      summary: {
        ...summary,
        period: periodLabel,
        messageCount: logs.length,
      },
    });
  } catch (error: any) {
    console.error('Error generando resumen IA por grupo:', error);
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}
