import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessWhatsappCoPilot } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessWhatsappCoPilot(email)) {
      return NextResponse.json({ error: 'Acceso restringido a dirección' }, { status: 403 });
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

    // 2. Compute date range (Mexico City timezone UTC-6)
    const now = new Date();
    const getMexicoDate = (d: Date) => {
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      return new Date(utc - (360 * 60000));
    };
    const mxNow = getMexicoDate(now);

    let whereClause: any = {};
    let periodLabel = '';

    if (period === 'yesterday') {
      const mxYesterday = new Date(mxNow);
      mxYesterday.setDate(mxYesterday.getDate() - 1);
      const startYesterday = new Date(Date.UTC(mxYesterday.getFullYear(), mxYesterday.getMonth(), mxYesterday.getDate(), 6, 0, 0));
      const endYesterday = new Date(Date.UTC(mxYesterday.getFullYear(), mxYesterday.getMonth(), mxYesterday.getDate() + 1, 5, 59, 59));
      whereClause.createdAt = { gte: startYesterday, lte: endYesterday };
      periodLabel = `Ayer (${mxYesterday.toLocaleDateString('es-MX')})`;
    } else if (period === 'week') {
      const mx7Days = new Date(mxNow);
      mx7Days.setDate(mx7Days.getDate() - 7);
      const start7Days = new Date(Date.UTC(mx7Days.getFullYear(), mx7Days.getMonth(), mx7Days.getDate(), 6, 0, 0));
      whereClause.createdAt = { gte: start7Days };
      periodLabel = 'Últimos 7 Días';
    } else if (period === 'month') {
      const startMonth = new Date(Date.UTC(mxNow.getFullYear(), mxNow.getMonth(), 1, 6, 0, 0));
      whereClause.createdAt = { gte: startMonth };
      periodLabel = `Mes Actual (${mxNow.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })})`;
    } else if (period === 'all') {
      periodLabel = 'Histórico Completo';
    } else {
      // 'today'
      const startToday = new Date(Date.UTC(mxNow.getFullYear(), mxNow.getMonth(), mxNow.getDate(), 6, 0, 0));
      whereClause.createdAt = { gte: startToday };
      periodLabel = `Hoy (${mxNow.toLocaleDateString('es-MX')})`;
    }

    // 3. Fetch logs for ALL groups within period
    const logs = await prisma.whatsappMessageLog.findMany({
      where: whereClause,
      take: 300,
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

    if (logs.length === 0) {
      const totalLogsCount = await prisma.whatsappMessageLog.count();
      return NextResponse.json({
        summary: {
          executiveSummary: `No se registraron mensajes en ningún grupo de WhatsApp durante el período: ${periodLabel}.${
            totalLogsCount > 0
              ? ' Hay actividad registrada en otros períodos (prueba consultar "Ayer", "7 Días" o "Histórico").'
              : ' Aún no hay mensajes respaldados en Perry App.'
          }`,
          resolvedCrossIssues: [],
          unresolvedCriticalPending: [],
          globalEquipmentStatus: [],
          globalMaterialRequests: [],
          directorRecommendations: [
            totalLogsCount > 0
              ? 'Selecciona "7 Días" o "Histórico" para analizar la actividad directiva de períodos anteriores.'
              : 'Verifica que el bot de Perry esté integrado en los grupos clave de operaciones y coordinación.',
          ],
          period: periodLabel,
          messageCount: 0,
          totalGroupsAnalyzed: groups.length,
        },
      });
    }

    // 4. Categorize logs by group type
    let promptData = `=== REPORTE MULTI-GRUPO DE INTELIGENCIA OPERATIVA PARA DIRECCIÓN ===\n`;
    promptData += `PERÍODO DE ANÁLISIS: ${periodLabel}\n`;
    promptData += `GRUPOS REGISTRADOS: ${groups.length}\n`;
    promptData += `REGISTROS ENCONTRADOS EN EL PERÍODO: ${logs.length}\n\n`;

    // Group logs by group name / JID
    const logsByGroup = new Map<string, any[]>();
    logs.forEach((log) => {
      const gName = log.groupId ? (groupNameMap.get(log.groupId) || log.groupId) : 'Chat Directo 1-a-1';
      if (!logsByGroup.has(gName)) logsByGroup.set(gName, []);
      logsByGroup.get(gName)!.push(log);
    });

    logsByGroup.forEach((groupLogs, groupNameKey) => {
      promptData += `>>> GRUPO: "${groupNameKey}" (${groupLogs.length} mensajes) <<<\n`;
      groupLogs.reverse().forEach((log: any, idx: number) => {
        let parsed: any = {};
        try {
          parsed = JSON.parse(log.parsedData || '{}');
        } catch {}

        promptData += `  [${new Date(log.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}] ${log.senderName || log.senderPhone}: `;
        if (parsed.messageType) promptData += `[Tipo: ${parsed.messageType}] `;
        if (parsed.workOrderFolio) promptData += `[OT: ${parsed.workOrderFolio}] `;
        if (parsed.manPowerEquipo) promptData += `[Equipo: ${parsed.manPowerEquipo} (${parsed.equipmentStatus || 'N/A'})] `;
        if (parsed.transcription) promptData += `🎙️ Audio: "${parsed.transcription}" `;
        if (log.rawMessage) promptData += `"${log.rawMessage}" `;
        if (parsed.parts && parsed.parts.length > 0) {
          promptData += `| Refacciones: ${parsed.parts.map((p: any) => `${p.quantity}x ${p.name}`).join(', ')}`;
        }
        promptData += `\n`;
      });
      promptData += `\n`;
    });

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'Configurado_En_Netlify') {
      return NextResponse.json({
        summary: {
          executiveSummary: `Síntesis Directiva (${periodLabel}): Se recopilaron ${logs.length} mensajes en ${logsByGroup.size} grupos activos. (Nota: GEMINI_API_KEY no configurada localmente).`,
          resolvedCrossIssues: [],
          unresolvedCriticalPending: logs.slice(0, 3).map((l: any) => ({
            issue: l.rawMessage || 'Requerimiento de campo',
            reportedGroup: groupNameMap.get(l.groupId) || 'Grupo Operativo',
            status: 'EN_REVISIÓN',
          })),
          globalEquipmentStatus: [],
          globalMaterialRequests: [],
          directorRecommendations: ['Configurar GEMINI_API_KEY en Netlify para síntesis inteligente multicanal.'],
          period: periodLabel,
          messageCount: logs.length,
          totalGroupsAnalyzed: logsByGroup.size,
        },
      });
    }

    const systemPrompt = `Eres el copiloto senior de Inteligencia Operativa y Estratégica C-Suite de Perry Intelligence.
Tu función es generar el "Resumen para Dirección" mediante una SÍNTESIS Y CONCILIACIÓN MULTI-GRUPO de todos los chats de WhatsApp (tanto grupos de campo/técnicos como grupos de coordinación/gerencia).

INSTRUCCIONES CLAVE DE CONCILIACIÓN:
1. CONCILIACIÓN DE ASUNTOS (Cruzar Grupos Técnicos vs Coordinación): Si en un grupo técnico/operativo se reportó una necesidad, falta de personal o problema (ej. "falta técnico asignado para la OT S06447"), pero en un grupo de coordinación o gerencia se confirmó la asignación o solución (ej. "Juan asignado a la OT S06447"), debes clasificarlo como un "Asunto Resuelto Cruzado" (resolvedCrossIssues), indicando el grupo de origen y el de solución.
2. PENDIENTES CRÍTICOS REALES: Identifica asuntos, fallas o faltantes abiertos en campo que NO muestren ninguna resolución ni seguimiento en los grupos de coordinación (unresolvedCriticalPending).
3. CONSOLIDADO DE EQUIPOS Y REFACCIONES: Compila el estado global de equipos fuera de servicio y la lista unificada de materiales solicitados.
4. RESUMEN NARRATIVO C-LEVEL: Redacta una síntesis ejecutiva de alto nivel de 3 a 4 párrafos orientada a Directores.

ESTRUCTURA DE RESPUESTA EN JSON OBLIGATORIA (responde ÚNICAMENTE con este JSON):
{
  "executiveSummary": "Párrafo narrativo C-Level detallando el pulso global de la operación, ritmo de trabajo en campo y coordinación directiva...",
  "resolvedCrossIssues": [
    {
      "issue": "Descripción del problema o requerimiento reportado en campo",
      "originGroup": "Nombre del grupo de campo/técnicos donde nació la necesidad",
      "resolutionGroup": "Nombre del grupo de coordinación/gerencia donde se resolvió",
      "resolutionDetails": "Detalle de cómo se resolvió o quién dio la solución"
    }
  ],
  "unresolvedCriticalPending": [
    {
      "issue": "Descripción del problema abierto sin resolver",
      "reportedGroup": "Nombre del grupo donde se reportó",
      "status": "SIN_SEGUIMIENTO" | "EN_ESPERA_DE_MATERIAL" | "REQUIERE_DECISION_GERENCIAL"
    }
  ],
  "globalEquipmentStatus": [
    {
      "equipo": "Código o nombre del equipo (ej: EQ-0105)",
      "status": "FUERA_DE_SERVICIO" | "DEGRADADO" | "OPERATIVO",
      "issue": "Descripción técnica concisa del problema"
    }
  ],
  "globalMaterialRequests": [
    {
      "name": "Nombre de refacción/material",
      "quantity": 1,
      "providerType": "COTIZAR" | "CLIENTE",
      "requestedInGroup": "Nombre del grupo"
    }
  ],
  "directorRecommendations": [
    "Recomendación estratégica 1 para alta dirección",
    "Recomendación estratégica 2"
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
              parts: [{ text: `${systemPrompt}\n\nHISTORIAL CONSOLIDADO DE TODOS LOS GRUPOS:\n${promptData}` }],
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
      console.error('Error en API Gemini Director Summary:', res.status, errText);
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
        totalGroupsAnalyzed: logsByGroup.size,
      },
    });
  } catch (error: any) {
    console.error('Error generando resumen para dirección:', error);
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}
