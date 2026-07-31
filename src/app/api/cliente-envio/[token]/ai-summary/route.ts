import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await req.json();
    const { periodFilter = 'PERIODO', startDate, endDate } = body;

    // 1) Validate token
    const odooLink = await prisma.odooOrderAccessLink.findFirst({
      where: { OR: [{ clientToken: token }, { techToken1: token }, { techToken2: token }] },
    });

    let workOrderFolio = odooLink?.workOrderFolio;

    if (!workOrderFolio) {
      const act = await prisma.activity.findFirst({
        where: { OR: [{ clientToken: token }, { techToken1: token }, { techToken2: token }] },
        select: { workOrderFolio: true },
      });
      if (act?.workOrderFolio) workOrderFolio = act.workOrderFolio;
    }

    if (!workOrderFolio) {
      return NextResponse.json({ error: 'Enlace inválido o revocado' }, { status: 404 });
    }

    // 2) Fetch activities for this Odoo Order
    const activities = await prisma.activity.findMany({
      where: {
        workOrderFolio: {
          equals: workOrderFolio.trim(),
          mode: 'insensitive',
        },
        OR: [{ isManPower: true }, { type: 'MAN_POWER' }],
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        title: true,
        date: true,
        startTime: true,
        endTime: true,
        actualStartTime: true,
        actualEndTime: true,
        manPowerEquipo: true,
        equipmentStatus: true,
        weekendNotes: true,
        pendingItems: true,
        status: true,
        client: { select: { name: true } },
      },
    });

    if (activities.length === 0) {
      return NextResponse.json({ summary: "No hay actividades registradas en esta Orden Odoo para generar el resumen ejecutivo." });
    }

    // Filter by period (HOY, AYER, PERIODO)
    const todayStr = new Date().toISOString().substring(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().substring(0, 10);

    let filteredActivities = activities;
    let periodLabel = 'Todo el Periodo de la Orden';

    if (periodFilter === 'HOY') {
      periodLabel = `Jornada de Hoy (${todayStr})`;
      filteredActivities = activities.filter((a) => a.date.toISOString().substring(0, 10) === todayStr);
    } else if (periodFilter === 'AYER') {
      periodLabel = `Jornada de Ayer (${yesterdayStr})`;
      filteredActivities = activities.filter((a) => a.date.toISOString().substring(0, 10) === yesterdayStr);
    } else if (periodFilter === 'CUSTOM' && startDate && endDate) {
      periodLabel = `Periodo del ${startDate} al ${endDate}`;
      filteredActivities = activities.filter((a) => {
        const dStr = a.date.toISOString().substring(0, 10);
        return dStr >= startDate && dStr <= endDate;
      });
    }

    if (filteredActivities.length === 0) {
      return NextResponse.json({
        summary: `No se encontraron actividades registradas para el periodo seleccionado (${periodLabel}).`,
        periodLabel,
        activityCount: 0,
      });
    }

    // 3) Construct structured prompt data for Gemini API
    const clientName = activities[0]?.client?.name || 'Cliente';
    let promptData = `INFORMACIÓN DE ORDEN ODOO: #${workOrderFolio}\nCLIENTE: ${clientName}\nPERIODO EVALUADO: ${periodLabel}\nCANTIDAD DE ACTIVIDADES: ${filteredActivities.length}\n\n`;

    filteredActivities.forEach((act, idx) => {
      const start = act.actualStartTime || act.startTime || 'S/H';
      const end = act.actualEndTime || act.endTime || 'S/H';
      const parsedPending = act.pendingItems ? JSON.parse(act.pendingItems) : [];
      const pendingStr = parsedPending.map((p: any) => p.title).join(' | ');

      promptData += `--- ACTIVIDAD ${idx + 1} ---\n`;
      promptData += `Fecha: ${act.date.toISOString().substring(0, 10)}\n`;
      promptData += `Equipo: ${act.manPowerEquipo || 'General'}\n`;
      promptData += `Título/Intervención: ${act.title}\n`;
      promptData += `Horario: ${start} - ${end}\n`;
      promptData += `Estado del Servicio: ${act.status}\n`;
      promptData += `Estatus Final del Equipo: ${act.equipmentStatus || 'OPERATIVO'}\n`;
      if (act.weekendNotes) promptData += `Bitácora Técnico: ${act.weekendNotes}\n`;
      if (pendingStr) promptData += `Pendientes/Recomendaciones: ${pendingStr}\n`;
      promptData += `\n`;
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'Configurado_En_Netlify') {
      return NextResponse.json({ error: 'La API Key de Gemini no está configurada en el servidor' }, { status: 500 });
    }

    // Title formatting based on period
    const activityDates = activities.map((a) => a.date.toISOString().substring(0, 10)).sort();
    let titleHeader = `Resumen Ejecutivo del Día ${todayStr}`;
    if (periodFilter === 'HOY') {
      titleHeader = `Resumen Ejecutivo del Día ${todayStr}`;
    } else if (periodFilter === 'AYER') {
      titleHeader = `Resumen Ejecutivo del Día ${yesterdayStr}`;
    } else if (periodFilter === 'CUSTOM' && startDate && endDate) {
      titleHeader = startDate === endDate ? `Resumen Ejecutivo del Día ${startDate}` : `Resumen Ejecutivo del Periodo ${startDate} al ${endDate}`;
    } else if (activityDates.length > 0) {
      const minD = activityDates[0];
      const maxD = activityDates[activityDates.length - 1];
      titleHeader = minD === maxD ? `Resumen Ejecutivo del Día ${minD}` : `Resumen Ejecutivo del Periodo ${minD} al ${maxD}`;
    }

    const systemPrompt = `Eres un Asistente de Inteligencia Artificial especializado en informes ejecutivos para la Gerencia de Mantenimiento Tier 1 (Automotriz e Industrial).
Tu objetivo es generar un informe formal, serio, directo y estrictamente estructurado sin utilizar íconos ni emojis.

REGLAS DE FORMATO Y ESTRUCTURA OBLIGATORIA:

El título principal debe ser exactamente:
# ${titleHeader}

Seguido de las siguientes secciones en ESTRICTO ORDEN:

## 1. Principales Intervenciones Ejecutadas
- Enumera con viñetas concisas los trabajos técnicos clave y mantenimientos ejecutados en el periodo.

## 2. Estado operativo de los equipos intervenidos
- Lista en viñetas cada uno de los equipos intervenidos con este formato exacto:
  - Equipo #[NUMERO_O_NOMBRE_DE_EQUIPO]: Operativo
  (Si un equipo quedó fuera de servicio, indica: "- Equipo #[NUMERO]: Fuera de Servicio - [Motivo]")
- Al final de la lista de esta sección 2, si NO quedaron equipos fuera de servicio, debes escribir exactamente la leyenda:
  "De los equipos intervenidos no quedó ninguno fuera de servicio."

## 3. Riesgos, Pendientes y Recomendaciones
- Enumera con viñetas concisas los pendientes críticos, riesgos identificados y recomendaciones de mantenimiento.

Cierre del reporte (al final de todo):
Debe incluir la frase literal de cierre:
Servicio de Manpower By DROBOTS

REGLA CRÍTICA DE ESTILO: NO uses ningún ícono ni emoji en todo el documento. El tono debe ser altamente formal y profesional.`;

    const text = `${systemPrompt}\n\nDATOS EXTRAÍDOS DE CAMPO:\n${promptData}`;

    const resGemini = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://perry.netlify.app/',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
        }),
      }
    );

    const dataGemini = await resGemini.json();
    const generatedText =
      dataGemini?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No se pudo generar el resumen ejecutivo por IA. Intente nuevamente.';

    return NextResponse.json({
      summary: generatedText,
      periodLabel,
      activityCount: filteredActivities.length,
    });
  } catch (error: any) {
    console.error('Error generating AI summary for client:', error);
    return NextResponse.json({ error: 'Error al generar resumen ejecutivo con IA' }, { status: 500 });
  }
}
