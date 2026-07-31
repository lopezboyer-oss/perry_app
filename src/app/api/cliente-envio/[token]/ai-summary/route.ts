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

    const systemPrompt = `Eres un Asistente Ejecutivo de Inteligencia Artificial especializado en Gerencia de Mantenimiento Tier 1 (Automotriz e Industrial).
Tu objetivo es redactar un Resumen Ejecutivo claro, profesional, conciso y directo para un Gerente de Mantenimiento.

ESTRUCTURA OBLIGATORIA DEL REPORTE (debes usar Markdown con estos encabezados):

### 📊 1. Resumen Ejecutivo del Servicio
Un párrafo sintetizado (máximo 4 líneas) reportando el avance global en la Orden Odoo #${workOrderFolio}, horas/jornadas evaluadas y nivel de cumplimiento.

### ⚙️ 2. Estado Operativo de Equipos
- **Equipos Operativos:** Listar los equipos intervenidos que quedaron operativos.
- **Equipos Fuera de Servicio (Atención Prioritaria):** Si hay equipos marcados como FUERA DE SERVICIO, destácalos claramente con el motivo o riesgo asociado. Si no hay ninguno, indicar "100% de los equipos intervenidos en condición Operativa".

### 🛠️ 3. Principales Intervenciones Ejecutadas
Enumera con viñetas concisas los trabajos técnicos clave realizados durante este periodo.

### ⚠️ 4. Riesgos, Pendientes y Recomendaciones Operativas
Listar los pendientes o recomendaciones críticas dejados en campo y las acciones sugeridas para asegurar la continuidad operativa de la planta.`;

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
