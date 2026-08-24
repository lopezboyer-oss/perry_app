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
 * Scan recent logs and seed/update initial incident patterns
 */
export async function seedOrAnalyzeInitialPatterns() {
  try {
    const existingCount = await prisma.perryIncidentPattern.count();
    if (existingCount > 0) {
      return { status: 'Patterns already exist', count: existingCount };
    }

    // Seed representative real patterns extracted from history
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

    return { status: 'Seeded initial patterns', count: seedPatterns.length };
  } catch (error: any) {
    console.error('[PATTERN-DETECTOR] Error seeding patterns:', error);
    return { error: error.message };
  }
}
