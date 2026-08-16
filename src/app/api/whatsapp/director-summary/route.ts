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
Tu función es generar el "Resumen Ejecutivo para Dirección" mediante una SÍNTESIS Y CONCILIACIÓN MULTI-GRUPO de todos los chats de WhatsApp (tanto grupos de campo/técnicos como grupos de coordinación/gerencia).

REGLAS DE ANÁLISIS Y ESTRUCTURA OBLIGATORIAS:
1. IDENTIFICACIÓN DE REMITENTES POR NOMBRE: Atribuye las confirmaciones, avances y acuerdos directamente al nombre del remitente (ej: "Carlos López confirmó la atención...", "Ing. Javier autorizó el cambio..."). Usa siempre el nombre de la persona que envió el mensaje si está disponible.
2. ANÁLISIS ESTRUCTURADO POR EMPRESA: Para cada empresa presente en los grupos (ej: Caseme, Perry, Consorcio, etc.), redacta un párrafo sintético exclusivo enfocado en las actividades, estado de trabajos y novedades de esa empresa.
3. RECURSOS Y TEMAS TRANSVERSALES COMPARTIDOS: Redacta un párrafo dedicado a los temas en común entre empresas, como logística unificada, cuadrillas móviles itinerantes, herramientas o maquinaria compartidas y coordinación interempresarial.
4. CONCILIACIÓN DE ASUNTOS (Cruzar Grupos Técnicos vs Coordinación): Si en un grupo técnico/operativo se reportó una necesidad o problema, pero en un grupo de coordinación se confirmó la asignación o solución, clasifícalo como "resolvedCrossIssues".
5. PENDIENTES CRÍTICOS REALES: Identifica asuntos abiertos en campo que NO muestren resolución ni seguimiento en los grupos de coordinación (unresolvedCriticalPending).
6. RECOMENDACIONES DIRECTIVAS: Genera recomendaciones estratégicas concisas para alta dirección (directorRecommendations).

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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let res: Response;
    try {
      res = await fetch(
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
          signal: controller.signal,
        }
      );
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        console.error('Director Summary: Gemini API timeout (25s)');
        return NextResponse.json({ error: 'La solicitud a Gemini IA tardó demasiado (timeout 25s). Intenta con un periodo más corto como "Día" o "Ayer".' }, { status: 504 });
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
        totalGroupsAnalyzed: logsByGroup.size,
      },
    });
  } catch (error: any) {
    console.error('Error generando resumen para dirección:', error);
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}
