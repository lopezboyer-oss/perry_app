/**
 * Reglas heurísticas para clasificar actividades desde texto libre.
 * Cada regla contiene palabras clave que se buscan en el texto (case-insensitive)
 * y el tipo de actividad que se asigna si hay coincidencia.
 * 
 * Las reglas se evalúan en orden de prioridad (primera coincidencia gana).
 * Para agregar nuevas reglas, simplemente añadir entradas al array.
 */

// Tipos de actividad como constantes
export const ACTIVITY_TYPES = ['VISITA_CAMPO', 'COTIZACION', 'EJECUCION', 'PLANEACION', 'DISENO'] as const;
export type ActivityTypeValue = typeof ACTIVITY_TYPES[number];

interface ClassificationRule {
  keywords: string[];
  type: ActivityTypeValue;
  priority: number;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // VISITA_CAMPO - reuniones, visitas, levantamientos
  {
    keywords: ['reunión', 'reunion', 'visita', 'levantamiento', 'recorrido', 'atiende reunión', 'se atiende'],
    type: 'VISITA_CAMPO',
    priority: 1,
  },
  // COTIZACION - cotizaciones, propuestas, presupuestos
  {
    keywords: ['cotización', 'cotizacion', 'propuesta', 'presupuesto', 'precio', 'envía cotización', 'elaboración de cotización'],
    type: 'COTIZACION',
    priority: 2,
  },
  // EJECUCION - trabajos físicos, instalaciones, reparaciones
  {
    keywords: ['instalación', 'instalacion', 'reemplazo', 'conexión', 'conexion', 'mantenimiento', 'reparación', 'reparacion', 'montaje', 'desmontaje', 'prueba', 'calibración', 'soldadura', 'pintura', 'limpieza'],
    type: 'EJECUCION',
    priority: 3,
  },
  // PLANEACION - planeación, coordinación, documentación
  {
    keywords: ['planeación', 'planeacion', 'permisos', 'materiales', 'solicitud', 'coordinación', 'coordinacion', 'documentación', 'documentacion', 'programación', 'programacion', 'revisión', 'revision', 'envía documentación', 'anexa solicitud'],
    type: 'PLANEACION',
    priority: 4,
  },
  // DISENO - diseño, planos, cálculo, modelado, ingeniería
  {
    keywords: ['diseño', 'diseno', 'plano', 'planos', 'cálculo', 'calculo', 'modelado', 'render', 'autocad', 'solidworks', 'dibujo', 'esquema', 'layout', 'ingeniería de detalle', 'ingenieria de detalle', 'memoria de cálculo', 'memoria de calculo'],
    type: 'DISENO',
    priority: 5,
  },
];

/**
 * Clasifica una línea de texto en un tipo de actividad
 * usando las reglas heurísticas definidas.
 * 
 * @param text - Línea de texto a clasificar
 * @returns El tipo de actividad detectado, o EJECUCION como default
 */
export function classifyActivity(text: string): string {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Ordenar por prioridad
  const sortedRules = [...CLASSIFICATION_RULES].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    for (const kw of rule.keywords) {
      const normalizedKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower.includes(normalizedKw)) {
        return rule.type;
      }
    }
  }

  // Default: EJECUCION (actividad operativa general)
  return 'EJECUCION';
}

/**
 * Detecta posibles nombres de contacto en una línea de texto.
 * Busca patrones como "Ing.", "Lic.", "Arq." seguidos de nombres.
 */
export function detectContact(text: string): string | null {
  const patterns = [
    /(?:Ing\.?|Lic\.?|Arq\.?|Dr\.?|C\.P\.?)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/,
    /(?:con\s+)([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}
