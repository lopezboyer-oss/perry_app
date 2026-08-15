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

    const { groupId } = params;
    const decodedGroupId = decodeURIComponent(groupId);

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

    // 2. Fetch recent operational logs for this group
    const logs = await prisma.whatsappMessageLog.findMany({
      where: { groupId: group.groupId },
      take: 80,
      orderBy: { createdAt: 'desc' },
    });

    if (logs.length === 0) {
      return NextResponse.json({
        summary: {
          executiveSummary: "Aún no hay mensajes o reportes suficientes registrados en este grupo de WhatsApp para generar un diagnóstico.",
          workAdvances: [],
          equipmentAlerts: [],
          materialRequests: [],
          operationalRecommendations: ["Continuar registrando los reportes de campo en el grupo de WhatsApp."],
        },
      });
    }

    // 3. Compile prompt data from logs
    let promptData = `GRUPO DE TRABAJO: "${group.groupName || 'Grupo WhatsApp'}" (ID: ${group.groupId})\n`;
    promptData += `CANTIDAD DE REGISTROS ANALIZADOS: ${logs.length}\n\n`;
    promptData += `HISTORIAL DE MENSAJES Y NOTAS DE VOZ TRANSCRITAS:\n`;

    logs.reverse().forEach((log, idx) => {
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
Tu misión es generar un Diagnóstico Ejecutivo de Inteligencia Operativa extremadamente preciso a partir de los mensajes, notas de voz transcritas y fotos recibidas en el grupo de WhatsApp "${group.groupName}".

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

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Error generando resumen IA por grupo:', error);
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}
