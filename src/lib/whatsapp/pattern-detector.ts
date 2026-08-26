import { prisma } from '@/lib/prisma';

export interface IncidentPatternData {
  title: string;
  category: 'SEGURIDAD' | 'LOGISTICA' | 'COTIZACIONES' | 'PERMISOS' | 'RECURSOS' | 'PROVEEDORES';
  companyName?: string;
  groupId?: string;
  incidentSummary: string;
  rawContextText: string;
  aiAnalysis?: string;
  proposedImprovement: string;
}

/**
 * Builds a structured, rich prompt optimized to copy-paste directly to Antigravity
 */
export function buildAntigravityCopypastaPrompt(data: {
  title: string;
  category: string;
  companyName?: string;
  recurrenceCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  incidentSummary: string;
  rawContextText: string;
  aiAnalysis?: string;
  proposedImprovement: string;
}): string {
  const firstStr = new Date(data.firstSeenAt).toLocaleDateString('es-MX', { timeZone: 'America/Tijuana' });
  const lastStr = new Date(data.lastSeenAt).toLocaleDateString('es-MX', { timeZone: 'America/Tijuana' });

  return `CONTEXTO DE MEJORA OPERATIVA — PERRY INTELLIGENCE IMPROVEMENTS

📌 PATRÓN DETECTADO: ${data.title.toUpperCase()}
🏢 Empresa / Unidad: ${data.companyName || 'Multiempresa'}
🏷️ Categoría: ${data.category}
🔁 Recurrencia: ${data.recurrenceCount} ocurrencia(s) registrada(s) (Desde: ${firstStr} hasta: ${lastStr})

━━━━ 📄 ANTECEDENTES Y RESUMEN DEL PROBLEMA ━━━━
${data.incidentSummary}

━━━━ 📝 TRANSCRIPCIÓN Y REGISTROS DE ORIGEN ━━━━
${data.rawContextText}

━━━━ 🤖 ANÁLISIS DE CAUSA RAÍZ (PERRY IA) ━━━━
${data.aiAnalysis || 'Se identifica una fricción recurrente en la coordinación y seguimiento del proceso.'}

━━━━ 💡 PROPUESTA DE MEJORA OPERATIVA Y DE SOFTWARE ━━━━
${data.proposedImprovement}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCCIÓN PARA ANTIGRAVITY:
Analiza esta propuesta de mejora y presenta un plan de implementación detallado para ajustar el código, la base de datos o el flujo de Perry App para resolver este patrón recurrente.`;
}

/**
 * Scan recent WhatsApp logs & critical tracking items with Gemini 2.5 Flash to automatically detect new improvement patterns
 */
export async function scanAndGenerateRealTimeImprovements() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[PATTERN-DETECTOR] No GEMINI_API_KEY available for live scan.');
      return { status: 'No API Key' };
    }

    // Fetch recent 40 WhatsApp logs and Critical tracking items
    const [recentMsgs, criticalItems] = await Promise.all([
      prisma.whatsappMessageLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 35,
      }),
      prisma.criticalItemTracking.findMany({
        where: { currentStatus: { in: ['ABIERTO', 'EN_PROCESO'] } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    let logContext = '--- RECIENTES REPORTES DE PUNTOS CRÍTICOS ---\n';
    criticalItems.forEach(i => {
      logContext += `[${i.companyName || 'General'}] Punto #${i.itemNumber}: "${i.issueText}" (Estado: ${i.currentStatus}, Reportó: ${i.reportedBy || 'Personal'})\n`;
    });

    logContext += '\n--- RECIENTE ACTIVIDAD EN GRUPOS DE WHATSAPP ---\n';
    recentMsgs.forEach(m => {
      if (m.rawMessage && !m.rawMessage.startsWith('🚨') && !m.rawMessage.includes('NÓMINA')) {
        logContext += `[${m.senderName || 'Operativo'}]: "${m.rawMessage.substring(0, 200)}"\n`;
      }
    });

    const prompt = `Analiza detenidamente esta bitácora reciente de WhatsApp y puntos críticos reportados en las empresas del consorcio (GRUPO CASEME, DROBOTS, OPUS INGENIUM, VULCAN FORGE):

${logContext}

INSTRUCCIONES DE ANÁLISIS DE CAUSA RAÍZ Y PATRONES DE MEJORA:
1. Identifica de 1 a 3 patrones reales o potenciales de fricción operativa, problemas de seguridad, retraso en cotizaciones, demoras con proveedores, fallas de equipo o trámites/planos pendientes.
2. Para cada patrón identificado, genera un objeto JSON con la siguiente estructura:
   - "title": Título descriptivo y profesional del patrón de fricción (ej. "Demora en reparación de equipos por respuesta lenta de proveedores").
   - "category": Una de las siguientes opciones válidas: ["SEGURIDAD", "LOGISTICA", "COTIZACIONES", "PERMISOS", "RECURSOS", "PROVEEDORES"].
   - "companyName": Nombre de la empresa involucrada ("GRUPO CASEME", "DROBOTS", "OPUS INGENIUM", "VULCAN FORGE" o "COORDINACIÓN").
   - "incidentSummary": Resumen de los antecedentes y por qué se presenta el problema.
   - "rawContextText": Frases, evidencia o citas textuales extraídas de los mensajes.
   - "aiAnalysis": Análisis de Causa Raíz realizado por Perry IA sobre la falla del proceso.
   - "proposedImprovement": Propuesta concreta de mejora operativa o de módulo de software en Perry App para resolver este patrón a futuro.

Responde ÚNICAMENTE un array JSON plano válido sin marcas de markdown:
[
  {
    "title": "string",
    "category": "SEGURIDAD | LOGISTICA | COTIZACIONES | PERMISOS | RECURSOS | PROVEEDORES",
    "companyName": "string",
    "incidentSummary": "string",
    "rawContextText": "string",
    "aiAnalysis": "string",
    "proposedImprovement": "string"
  }
]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const resJson = await response.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = rawText.replace(/```json\n?|```/gi, '').trim();

    const parsedPatterns: IncidentPatternData[] = JSON.parse(jsonStr);
    let createdCount = 0;
    let updatedCount = 0;

    for (const p of parsedPatterns) {
      if (!p.title || !p.proposedImprovement) continue;

      // Check if pattern with similar title exists
      const existing = await prisma.perryIncidentPattern.findFirst({
        where: {
          OR: [
            { title: { contains: p.title.substring(0, 25), mode: 'insensitive' } },
            { incidentSummary: { contains: (p.incidentSummary || '').substring(0, 30), mode: 'insensitive' } },
          ],
        },
      });

      const now = new Date();

      if (existing) {
        // Increment recurrence & update lastSeenAt
        const newCount = existing.recurrenceCount + 1;
        const prompt = buildAntigravityCopypastaPrompt({
          title: existing.title,
          category: existing.category,
          companyName: existing.companyName || undefined,
          recurrenceCount: newCount,
          firstSeenAt: existing.firstSeenAt,
          lastSeenAt: now,
          incidentSummary: p.incidentSummary || existing.incidentSummary,
          rawContextText: `${existing.rawContextText}\n---\n[Reciente]: ${p.rawContextText}`,
          aiAnalysis: p.aiAnalysis || existing.aiAnalysis || undefined,
          proposedImprovement: p.proposedImprovement || existing.proposedImprovement,
        });

        await prisma.perryIncidentPattern.update({
          where: { id: existing.id },
          data: {
            recurrenceCount: newCount,
            lastSeenAt: now,
            copypastaPrompt: prompt,
            rawContextText: `${existing.rawContextText}\n---\n[Reciente]: ${p.rawContextText}`,
          },
        });
        updatedCount++;
      } else {
        // Create new pattern
        const prompt = buildAntigravityCopypastaPrompt({
          title: p.title,
          category: p.category || 'LOGISTICA',
          companyName: p.companyName || 'COORDINACIÓN',
          recurrenceCount: 1,
          firstSeenAt: now,
          lastSeenAt: now,
          incidentSummary: p.incidentSummary,
          rawContextText: p.rawContextText || 'Reportado en bitácora reciente de WhatsApp.',
          aiAnalysis: p.aiAnalysis,
          proposedImprovement: p.proposedImprovement,
        });

        await prisma.perryIncidentPattern.create({
          data: {
            title: p.title,
            category: p.category || 'LOGISTICA',
            companyName: p.companyName || 'COORDINACIÓN',
            incidentSummary: p.incidentSummary,
            recurrenceCount: 1,
            rawContextText: p.rawContextText || 'Reportado en bitácora reciente de WhatsApp.',
            aiAnalysis: p.aiAnalysis,
            proposedImprovement: p.proposedImprovement,
            copypastaPrompt: prompt,
            status: 'DETECTADO',
          },
        });
        createdCount++;
      }
    }

    console.log(`[PATTERN-DETECTOR] Live scan completed: Created ${createdCount}, Updated ${updatedCount}`);
    return { status: 'Live scan complete', createdCount, updatedCount };
  } catch (error: any) {
    console.error('[PATTERN-DETECTOR] Live scan error:', error);
    return { error: error.message };
  }
}

/**
 * Scan recent logs and seed/update initial incident patterns
 */
export async function seedOrAnalyzeInitialPatterns() {
  try {
    const existingCount = await prisma.perryIncidentPattern.count();
    if (existingCount === 0) {
      // Seed initial representative patterns if empty
      const seedPatterns: IncidentPatternData[] = [
        {
          title: 'Interrupción de trabajos por discrepancia en bordes de caída y seguridad',
          category: 'SEGURIDAD',
          companyName: 'COORDINACIÓN',
          incidentSummary: 'Suspensión o freno de actividades por observaciones de supervisores de seguridad de planta respecto a bordes de caída o arneses (ej: reporte de Ing. Jorge López en Pintura Deck).',
          rawContextText: 'Ing. Jorge López refirió que no se podía trabajar por estar en un borde de caída sin línea de vida adecuada. Actividad: Retiro de interferencia / Pintura deck.',
          aiAnalysis: 'Falta de pre-validación de líneas de vida en el AST/Permiso de Trabajo antes del inicio de la jornada, generando paros no planificados en sitio.',
          proposedImprovement: 'Agregar una casilla obligatoria de verificación de Puntos de Anclaje / Línea de Vida en el formulario de campo de Perry App antes de permitir el inicio de la actividad.',
        },
        {
          title: 'Retraso recurrente en la entrega de cotizaciones y partes por proveedores (ej. Aidco)',
          category: 'PROVEEDORES',
          companyName: 'GLOBAL SUPPORT',
          incidentSummary: 'Demora de más de 48 horas en recibir cotizaciones de reparación o reemplazo de equipos/piezas dañadas en maniobras (ej: cristal/cámara protectora).',
          rawContextText: 'Cámara dañada accidentalmente en maniobra. Se solicitó cotización a proveedor AIDCO; seguimiento tomó 3 días entre confirmación e instalación.',
          aiAnalysis: 'Falta de escalamiento automático si el proveedor no responde en un plazo de 24 horas con la cotización formal.',
          proposedImprovement: 'Implementar una alerta automática de 24h en Perry App que notifique al Auditor (P1) para presionar al proveedor o buscar un proveedor secundario.',
        },
        {
          title: 'Dependencia de aprobación/dibujos actualizados de fabricantes para SCI (Infineon)',
          category: 'PERMISOS',
          companyName: 'OPUS INGENIUM',
          incidentSummary: 'Esperas prolongadas para recibir la versión definitiva de los dibujos/planos de bombas SCI de los fabricantes para proceder con la validación de campo.',
          rawContextText: 'Planos de fabricante recibidos. Se requiere junta urgente de revisión de planos actualizados con contratistas e ingenieros.',
          aiAnalysis: 'La falta de un repositorio centralizado de versiones de planos en Perry App obliga a realizar juntas de emergencia para validar cambios.',
          proposedImprovement: 'Crear un módulo de Control de Dibujos y Planos dentro de la OT en Perry App con versión final y estado de aprobación en tiempo real.',
        },
      ];

      for (const pattern of seedPatterns) {
        const now = new Date();
        const prompt = buildAntigravityCopypastaPrompt({
          title: pattern.title,
          category: pattern.category,
          companyName: pattern.companyName,
          recurrenceCount: 2,
          firstSeenAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          lastSeenAt: now,
          incidentSummary: pattern.incidentSummary,
          rawContextText: pattern.rawContextText,
          aiAnalysis: pattern.aiAnalysis,
          proposedImprovement: pattern.proposedImprovement,
        });

        await prisma.perryIncidentPattern.create({
          data: {
            title: pattern.title,
            category: pattern.category,
            companyName: pattern.companyName || 'COORDINACIÓN',
            incidentSummary: pattern.incidentSummary,
            recurrenceCount: 2,
            rawContextText: pattern.rawContextText,
            aiAnalysis: pattern.aiAnalysis,
            proposedImprovement: pattern.proposedImprovement,
            copypastaPrompt: prompt,
            status: 'DETECTADO',
          },
        });
      }
    }

    // Always execute live AI scan on current WhatsApp activity!
    return await scanAndGenerateRealTimeImprovements();
  } catch (error: any) {
    console.error('[PATTERN-DETECTOR] Error in pattern analysis:', error);
    return { error: error.message };
  }
}
