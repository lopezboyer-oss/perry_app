import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessWhatsappCoPilot } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    // Allow cron jobs to call this endpoint with a secret token
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronCall) {
      const session = await auth();
      if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const email = (session.user as any)?.email || '';
      if (!canAccessWhatsappCoPilot(email)) {
        return NextResponse.json({ error: 'Acceso restringido a dirección' }, { status: 403 });
      }
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {}
    const period: string = body.period || 'today';

    // 1. Fetch all WhatsApp group mappings + company metadata
    const [groups, companies] = await Promise.all([
      prisma.whatsappGroupMapping.findMany({
        where: { isActive: true },
      }),
      prisma.company.findMany({
        select: { id: true, name: true, shortName: true, color: true },
      }),
    ]);

    const companyMap = new Map(companies.map((c) => [c.id, c.name]));
    const groupNameMap = new Map(groups.map((g) => [g.groupId, g.groupName || g.groupId]));

    // 2. Compute date range (Tijuana timezone — America/Tijuana, handles DST automatically)
    const TIMEZONE = 'America/Tijuana';
    const now = new Date();

    // Get today's date components in Tijuana timezone
    const localDateStr = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // 'YYYY-MM-DD'
    const [localYear, localMonth, localDay] = localDateStr.split('-').map(Number);

    // Calculate timezone offset in ms for a given date (DST-aware)
    const getOffsetMs = (y: number, m: number, d: number) => {
      const refDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // noon UTC avoids DST edge cases
      const utcStr = refDate.toLocaleString('en-US', { timeZone: 'UTC' });
      const localStr = refDate.toLocaleString('en-US', { timeZone: TIMEZONE });
      return new Date(utcStr).getTime() - new Date(localStr).getTime();
    };

    // Get start of day (midnight) in Tijuana as a UTC Date
    const startOfDay = (y: number, m: number, d: number) => {
      const offsetMs = getOffsetMs(y, m, d);
      return new Date(Date.UTC(y, m - 1, d) + offsetMs);
    };

    let whereClause: any = {};
    let periodLabel = '';

    if (period === 'yesterday') {
      const yDate = new Date(Date.UTC(localYear, localMonth - 1, localDay - 1));
      const yY = yDate.getUTCFullYear(), yM = yDate.getUTCMonth() + 1, yD = yDate.getUTCDate();
      const startYesterday = startOfDay(yY, yM, yD);
      const endYesterday = new Date(startOfDay(localYear, localMonth, localDay).getTime() - 1);
      whereClause.createdAt = { gte: startYesterday, lte: endYesterday };
      periodLabel = `Ayer (${String(yD).padStart(2,'0')}/${String(yM).padStart(2,'0')}/${yY})`;
    } else if (period === 'weekend') {
      // Get day of week in Tijuana (0=Sun, 6=Sat)
      const dayOfWeekStr = now.toLocaleDateString('en-US', { timeZone: TIMEZONE, weekday: 'short' });
      const dayOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(dayOfWeekStr);

      let satDate: Date;
      if (dayOfWeek === 6) {
        // Saturday: show only Saturday (today)
        satDate = new Date(Date.UTC(localYear, localMonth - 1, localDay));
      } else if (dayOfWeek === 0) {
        // Sunday: show Sat + Sun (yesterday + today)
        satDate = new Date(Date.UTC(localYear, localMonth - 1, localDay - 1));
      } else {
        // Mon-Fri: show last Sat + Sun
        const daysSinceSat = dayOfWeek + 1; // Mon=2, Tue=3, ..., Fri=6
        satDate = new Date(Date.UTC(localYear, localMonth - 1, localDay - daysSinceSat));
      }
      const satY = satDate.getUTCFullYear(), satM = satDate.getUTCMonth() + 1, satD = satDate.getUTCDate();
      const sunDate = new Date(Date.UTC(satY, satM - 1, satD + 1));
      const sunY = sunDate.getUTCFullYear(), sunM = sunDate.getUTCMonth() + 1, sunD = sunDate.getUTCDate();

      const startWeekend = startOfDay(satY, satM, satD);
      // End of Sunday = start of Monday - 1ms
      const monDate = new Date(Date.UTC(satY, satM - 1, satD + 2));
      const endWeekend = new Date(startOfDay(monDate.getUTCFullYear(), monDate.getUTCMonth() + 1, monDate.getUTCDate()).getTime() - 1);

      whereClause.createdAt = { gte: startWeekend, lte: endWeekend };
      periodLabel = `Fin de Semana (${String(satD).padStart(2,'0')}/${String(satM).padStart(2,'0')} - ${String(sunD).padStart(2,'0')}/${String(sunM).padStart(2,'0')})`;
    } else if (period === '3days') {
      const d3 = new Date(Date.UTC(localYear, localMonth - 1, localDay - 3));
      const start3Days = startOfDay(d3.getUTCFullYear(), d3.getUTCMonth() + 1, d3.getUTCDate());
      whereClause.createdAt = { gte: start3Days };
      periodLabel = 'Últimos 3 Días';
    } else {
      // 'today'
      const startToday = startOfDay(localYear, localMonth, localDay);
      whereClause.createdAt = { gte: startToday };
      periodLabel = `Hoy (${String(localDay).padStart(2,'0')}/${String(localMonth).padStart(2,'0')}/${localYear})`;
    }

    // Compute date range for activities (using the same period)
    const activityDateStart = whereClause.createdAt?.gte || new Date(0);
    const activityDateEnd = whereClause.createdAt?.lte || new Date();

    // 3. Fetch logs for ALL groups within period
    const logs = await prisma.whatsappMessageLog.findMany({
      where: whereClause,
      take: 150,
      orderBy: { createdAt: 'desc' },
      include: {
        activity: {
          select: {
            id: true,
            title: true,
            workOrderFolio: true,
            manPowerEquipo: true,
          },
        },
      },
    });

    // 3b. Fetch Perry App activities for the same period
    const activities = await prisma.activity.findMany({
      where: { date: { gte: activityDateStart, lte: activityDateEnd } },
      select: {
        title: true, type: true, status: true, date: true,
        result: true, nextStep: true, notes: true, weekendNotes: true,
        workOrderFolio: true, location: true, projectArea: true,
        equipmentStatus: true, cancelReason: true, cancelNotes: true,
        company: { select: { name: true } },
        client: { select: { name: true } },
        user: { select: { name: true } },
        parts: { select: { name: true, quantity: true, status: true } },
      },
      orderBy: [{ company: { name: 'asc' } }, { user: { name: 'asc' } }],
    });

    // 3c. Fetch active critical items with logs
    const criticalItems = await prisma.criticalItemTracking.findMany({
      where: {
        currentStatus: { in: ['ABIERTO', 'EN_PROCESO'] },
      },
      include: {
        logs: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { itemNumber: 'asc' },
    });

    if (logs.length === 0 && activities.length === 0) {
      return NextResponse.json({
        summary: {
          executiveSummary: `No se registraron mensajes ni actividades durante el período: ${periodLabel}.`,
          resolvedCrossIssues: [],
          unresolvedCriticalPending: [],
          globalEquipmentStatus: [],
          globalMaterialRequests: [],
          directorRecommendations: [
            'Verifica que el bot de Perry esté integrado en los grupos clave de operaciones.',
          ],
          period: periodLabel,
          messageCount: 0,
          activityCount: 0,
          totalGroupsAnalyzed: groups.length,
        },
      });
    }

    // 4. Categorize logs by group type & map to Company
    const groupCompanyMap = new Map<string, string>();
    groups.forEach((g) => {
      const cName = g.companyId ? companyMap.get(g.companyId) : undefined;
      groupCompanyMap.set(g.groupId, cName || 'Empresa General / Operaciones');
    });

    let promptData = `=== REPORTE MULTI-GRUPO DE PERRY INTELLIGENCE PARA DIRECCIÓN ===\n`;
    promptData += `PERÍODO DE ANÁLISIS: ${periodLabel}\n`;
    promptData += `GRUPOS REGISTRADOS: ${groups.length}\n`;
    promptData += `REGISTROS ENCONTRADOS EN EL PERÍODO: ${logs.length}\n\n`;

    // Group logs by group name / JID
    const logsByGroup = new Map<string, { company: string; logs: any[] }>();
    logs.forEach((log) => {
      const gName = log.groupId ? (groupNameMap.get(log.groupId) || log.groupId) : 'Chat Directo 1-a-1';
      const cName = log.groupId ? (groupCompanyMap.get(log.groupId) || 'Empresa General') : 'Directo';
      if (!logsByGroup.has(gName)) logsByGroup.set(gName, { company: cName, logs: [] });
      logsByGroup.get(gName)!.logs.push(log);
    });

    logsByGroup.forEach((groupData, groupNameKey) => {
      promptData += `>>> GRUPO: "${groupNameKey}" [Empresa: ${groupData.company}] (${groupData.logs.length} mensajes) <<<\n`;
      groupData.logs.reverse().forEach((log: any) => {
        let parsed: any = {};
        try {
          parsed = JSON.parse(log.parsedData || '{}');
        } catch {}

        const senderDisplayName = log.senderName || log.senderPhone || 'Usuario Remitente';
        promptData += `  [${new Date(log.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}] Remitente: "${senderDisplayName}": `;
        if (parsed.messageType) promptData += `[Tipo: ${parsed.messageType}] `;
        if (parsed.workOrderFolio) promptData += `[OT: ${parsed.workOrderFolio}] `;
        if (parsed.manPowerEquipo) promptData += `[Equipo: ${parsed.manPowerEquipo} (${parsed.equipmentStatus || 'N/A'})] `;
        if (parsed.transcription) promptData += `🎙️ Audio de ${senderDisplayName}: "${parsed.transcription}" `;
        if (log.rawMessage) promptData += `"${log.rawMessage}" `;
        if (parsed.parts && parsed.parts.length > 0) {
          promptData += `| Refacciones: ${parsed.parts.map((p: any) => `${p.quantity}x ${p.name}`).join(', ')}`;
        }
        promptData += `\n`;
      });
      promptData += `\n`;
    });

    // 5. Append Perry App Activities data to prompt
    if (activities.length > 0) {
      promptData += `\n=== ACTIVIDADES PERRY APP (${activities.length}) ===\n`;

      // Group by company
      const actsByCompany = new Map<string, typeof activities>();
      activities.forEach(a => {
        const cName = a.company?.name || 'Sin empresa';
        if (!actsByCompany.has(cName)) actsByCompany.set(cName, []);
        actsByCompany.get(cName)!.push(a);
      });

      actsByCompany.forEach((acts, compName) => {
        promptData += `--- ${compName} (${acts.length}) ---\n`;
        acts.forEach(a => {
          const parts: string[] = [];
          parts.push(a.user?.name || '?');
          parts.push(`"${a.title}"`);
          parts.push(a.status);
          if (a.workOrderFolio) parts.push(`OT:${a.workOrderFolio}`);
          if (a.location) parts.push(a.location);
          if (a.result) parts.push(`R:"${a.result.substring(0, 80)}"`);
          if (a.nextStep) parts.push(`Sig:"${a.nextStep.substring(0, 60)}"`);
          if (a.cancelReason) parts.push(`❌${a.cancelReason}`);
          if (a.equipmentStatus) parts.push(`Eq:${a.equipmentStatus}`);
          if (a.parts && a.parts.length > 0) parts.push(`Refs:${a.parts.length}`);
          promptData += `  ${parts.join(' | ')}\n`;
        });
      });
    }

    // 6. Append Critical Items Tracking data (compact)
    if (criticalItems.length > 0) {
      promptData += `\n=== PUNTOS CRÍTICOS ACTIVOS (${criticalItems.length}) ===\n`;
      criticalItems.forEach(item => {
        const icon = item.currentStatus === 'EN_PROCESO' ? '🔄' : '⛔';
        const lastLog = item.logs.length > 0 ? item.logs[item.logs.length - 1] : null;
        const lastUpdate = lastLog
          ? `${(lastLog as any).updatedBy}: "${((lastLog as any).comment || '').substring(0, 60)}"`
          : (item.feedbackBy ? `${item.feedbackBy}: "${(item.feedbackText || '').substring(0, 60)}"` : 'Sin update');
        promptData += `  #${item.itemNumber} ${icon} [${item.currentStatus}] ${item.issueText} | ${item.companyName || 'N/A'} | Último: ${lastUpdate}\n`;
      });
    }

    console.log(`[Director Summary] Prompt size: ${promptData.length} chars | Logs: ${logs.length} | Activities: ${activities.length} | Critical: ${criticalItems.length}`);

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'Configurado_En_Netlify') {
      return NextResponse.json({
        summary: {
          executiveSummary: `Síntesis Directiva (${periodLabel}): Se recopilaron ${logs.length} mensajes en ${logsByGroup.size} grupos activos de Perry Intelligence.`,
          companySummaries: Array.from(new Set(Array.from(logsByGroup.values()).map(v => v.company))).map(cName => ({
            companyName: cName,
            summary: `Actividad registrada en el periodo para los grupos pertenecientes a ${cName}.`
          })),
          sharedTopicsSummary: `Coordinación transversal entre empresas y logística unificada registrada en Perry Intelligence.`,
          resolvedCrossIssues: [],
          unresolvedCriticalPending: logs.slice(0, 3).map((l: any) => ({
            issue: l.rawMessage || 'Requerimiento de campo',
            reportedGroup: groupNameMap.get(l.groupId) || 'Grupo Operativo',
            status: 'EN_REVISIÓN',
          })),
          globalEquipmentStatus: [],
          globalMaterialRequests: [],
          directorRecommendations: ['Verificar la integración de los bots en los grupos de coordinación directiva.'],
          period: periodLabel,
          messageCount: logs.length,
          totalGroupsAnalyzed: logsByGroup.size,
        },
      });
    }

    const systemPrompt = `Eres el sistema de Inteligencia Operativa y Estratégica C-Suite de Perry Intelligence.
Tu función es generar el "Resumen Ejecutivo para Dirección" mediante una SÍNTESIS Y CONCILIACIÓN de TRES fuentes de datos:
1. Mensajes de WhatsApp (grupos de campo/técnicos y coordinación/gerencia)
2. Actividades formales registradas en Perry App por los ingenieros
3. Puntos Críticos activos en seguimiento

REGLAS DE ANÁLISIS Y ESTRUCTURA OBLIGATORIAS:
1. IDENTIFICACIÓN DE REMITENTES POR NOMBRE: Atribuye las confirmaciones, avances y acuerdos directamente al nombre del remitente. Usa siempre el nombre de la persona.
2. ANÁLISIS ESTRUCTURADO POR EMPRESA: Para cada empresa, redacta un párrafo sintético que combine la información de WhatsApp Y de las actividades Perry App. INCLUYE la fecha (día/mes) y folios de OT cuando estén disponibles.
3. CONCILIACIÓN WHATSAPP ↔ PERRY APP: Si un tema aparece en WhatsApp Y en una actividad formal de Perry, CRÚZALOS y prioriza la versión formal de Perry App. Si algo aparece SOLO en WhatsApp, inclúyelo como información informal. Si algo aparece SOLO en Perry App, inclúyelo como reporte formal. Menciona el folio de OT cuando esté disponible.
4. RECURSOS Y TEMAS TRANSVERSALES: Párrafo dedicado a temas en común entre empresas.
5. CONCILIACIÓN DE ASUNTOS (Cruzar Grupos Técnicos vs Coordinación vs Actividades Perry): clasifícalo como "resolvedCrossIssues" cuando se detecte resolución.
6. PENDIENTES CRÍTICOS REALES: Incluye los PUNTOS CRÍTICOS EN SEGUIMIENTO que aparecen en la sección correspondiente. Estos ya están siendo monitoreados — inclúyelos con su status actual y último comentario.
7. RECOMENDACIONES DIRECTIVAS: Genera recomendaciones estratégicas concisas para alta dirección, considerando tanto la información de WhatsApp como las actividades de Perry App.

ESTRUCTURA DE RESPUESTA EN JSON OBLIGATORIA (responde ÚNICAMENTE con este JSON sin markdown adicional):
{
  "executiveSummary": "Síntesis ejecutiva C-Level general del estado de la operación directiva...",
  "companySummaries": [
    {
      "companyName": "Nombre de la Empresa (ej: Caseme)",
      "summary": "Párrafo dedicado con las novedades, estatus operativo y avances de esta empresa, mencionando a los remitentes involucrados por su nombre..."
    }
  ],
  "sharedTopicsSummary": "Párrafo dedicado a los recursos compartidos, logística transversal y temas comunes entre empresas...",
  "resolvedCrossIssues": [
    {
      "issue": "Descripción del requerimiento reportado en campo",
      "originGroup": "Grupo donde nació la necesidad",
      "resolutionGroup": "Grupo donde se resolvió",
      "resolutionDetails": "Detalle indicando quién (nombre de persona) y cómo se resolvió"
    }
  ],
  "unresolvedCriticalPending": [
    {
      "issue": "Descripción del problema abierto sin resolver",
      "reportedGroup": "Grupo donde se reportó",
      "reportedBy": "Nombre de la persona que reportó el problema",
      "status": "SIN_SEGUIMIENTO" | "EN_ESPERA_DE_MATERIAL" | "REQUIERE_DECISION_GERENCIAL"
    }
  ],
  "globalMaterialRequests": [
    {
      "name": "Nombre de refacción/material",
      "quantity": 1,
      "providerType": "COTIZAR" | "CLIENTE",
      "requestedInGroup": "Nombre del grupo",
      "requestedBy": "Nombre de la persona que solicitó el material"
    }
  ],
  "directorRecommendations": [
    "Recomendación estratégica 1 para alta dirección",
    "Recomendación estratégica 2"
  ]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Referer: 'https://perryapp.netlify.app/',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: `${systemPrompt}\n\nHISTORIAL CONSOLIDADO DE TODOS LOS GRUPOS:\n${promptData}` }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
          signal: controller.signal,
        }
      );
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        console.error('Director Summary: Gemini API timeout (55s)');
        return NextResponse.json({ error: 'La solicitud a Gemini IA tardó demasiado (timeout 55s). Intenta con un periodo más corto como "Día" o "Ayer".' }, { status: 504 });
      }
      console.error('Director Summary: Fetch error:', fetchErr.message);
      return NextResponse.json({ error: `Error de conexión con Gemini IA: ${fetchErr.message}` }, { status: 502 });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('Error en API Gemini Director Summary:', res.status, errText);
      return NextResponse.json({ error: `Error de Gemini IA (HTTP ${res.status}): ${errText.substring(0, 200)}` }, { status: 500 });
    }

    const jsonResponse = await res.json();
    const rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      const blockReason = jsonResponse.candidates?.[0]?.finishReason || jsonResponse.promptFeedback?.blockReason || 'desconocido';
      console.error('Director Summary: Respuesta vacía de Gemini. Razón:', blockReason, JSON.stringify(jsonResponse).substring(0, 500));
      return NextResponse.json({ error: `Gemini IA no generó contenido. Razón: ${blockReason}` }, { status: 500 });
    }

    let summary: any;
    try {
      summary = JSON.parse(rawText);
    } catch (parseErr: any) {
      console.error('Director Summary: Error parseando JSON de Gemini:', parseErr.message, 'Raw:', rawText.substring(0, 300));
      return NextResponse.json({ error: 'Gemini IA devolvió una respuesta con formato inválido (JSON parse error)' }, { status: 500 });
    }

    return NextResponse.json({
      summary: {
        ...summary,
        period: periodLabel,
        messageCount: logs.length,
        activityCount: activities.length,
        criticalItemsCount: criticalItems.length,
        totalGroupsAnalyzed: logsByGroup.size,
      },
    });
  } catch (error: any) {
    console.error('Error generando resumen para dirección:', error);
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}
