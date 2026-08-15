import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Access control: only Ivan Lopez
    const userEmail = (session.user as any)?.email;
    if (userEmail !== 'lopezboyer@gmail.com') {
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

    // Calculate date range based on period (Mexico City timezone: UTC-6)
    const now = new Date();
    const mexicoOffset = -6 * 60; // UTC-6 in minutes
    const localNow = new Date(now.getTime() + (mexicoOffset + now.getTimezoneOffset()) * 60000);
    
    let startDate: Date;
    let periodLabel: string;

    switch (period) {
      case 'yesterday': {
        const yesterday = new Date(localNow);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(localNow);
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
        yesterdayEnd.setHours(23, 59, 59, 999);
        // Convert back to UTC for DB query
        startDate = new Date(yesterday.getTime() - (mexicoOffset + now.getTimezoneOffset()) * 60000);
        const endDate = new Date(yesterdayEnd.getTime() - (mexicoOffset + now.getTimezoneOffset()) * 60000);
        periodLabel = `Ayer (${yesterday.toLocaleDateString('es-MX')})`;
        // Special case: yesterday has an end bound
        const logs = await getFilteredLogs(decodedGroupId, startDate, endDate);
        return await generateSummary(req, decodedGroupId, logs, periodLabel);
      }
      case 'week': {
        const weekAgo = new Date(localNow);
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        startDate = new Date(weekAgo.getTime() - (mexicoOffset + now.getTimezoneOffset()) * 60000);
        periodLabel = 'Últimos 7 días';
        break;
      }
      case 'month': {
        const monthStart = new Date(localNow.getFullYear(), localNow.getMonth(), 1, 0, 0, 0, 0);
        startDate = new Date(monthStart.getTime() - (mexicoOffset + now.getTimezoneOffset()) * 60000);
        periodLabel = `Mes actual (${localNow.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })})`; 
        break;
      }
      case 'today':
      default: {
        const todayStart = new Date(localNow);
        todayStart.setHours(0, 0, 0, 0);
        startDate = new Date(todayStart.getTime() - (mexicoOffset + now.getTimezoneOffset()) * 60000);
        periodLabel = `Hoy (${localNow.toLocaleDateString('es-MX')})`;
        break;
      }
    }

    // 1. Fetch group mapping
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

    // 2. Fetch logs filtered by date range
    const logs = await prisma.whatsappMessageLog.findMany({
      where: {
        groupId: group.groupId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    return await generateSummary(req, group.groupId, logs, periodLabel, group.groupName);
  } catch (error: any) {
    console.error('Error generando resumen IA por grupo:', error);
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}

async function getFilteredLogs(groupId: string, startDate: Date, endDate: Date) {
  return prisma.whatsappMessageLog.findMany({
    where: {
      groupId,
      createdAt: { gte: startDate, lte: endDate },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function generateSummary(req: NextRequest, groupId: string, logs: any[], periodLabel: string, groupName?: string | null) {
    if (logs.length === 0) {
      return NextResponse.json({
        summary: {
          executiveSummary: `No hay mensajes registrados para el período: ${periodLabel}. El grupo no tuvo actividad reportada en ese rango.`,
          workAdvances: [],
          equipmentAlerts: [],
          materialRequests: [],
          operationalRecommendations: ["No se detectó actividad en este período. Verificar si los equipos de campo están reportando correctamente."],
          period: periodLabel,
          messageCount: 0,
        },
      });
    }

    // 3. Compile prompt data from logs
    const resolvedGroupName = groupName || 'Grupo WhatsApp';
    let promptData = `GRUPO DE TRABAJO: "${resolvedGroupName}" (ID: ${groupId})\n`;
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
      return NextResponse.json({ error: 'GEMINI_API_KEY no configurada localmente' }, { status: 500 });
    }

    const systemPrompt = `Eres el copiloto de inteligencia operacional senior de Perry Intelligence.
Tu misión es generar un Diagnóstico Ejecutivo de Inteligencia Operativa extremadamente preciso a partir de los mensajes, notas de voz transcritas y fotos recibidas en el grupo de WhatsApp "${resolvedGroupName}".
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
}
