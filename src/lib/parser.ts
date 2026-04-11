import { classifyActivity, detectContact } from './classifier';

export interface ParsedLine {
  index: number;
  originalText: string;
  cleanText: string;
  suggestedType: string;
  suggestedContact: string | null;
  isHeader: boolean;
}

/**
 * Parsea un texto libre tipo WhatsApp en líneas individuales,
 * limpia el formato y sugiere clasificación automática.
 * 
 * @param rawText - Texto pegado del reporte
 * @returns Array de líneas parseadas con sugerencias
 */
export function parseWhatsAppReport(rawText: string): ParsedLine[] {
  if (!rawText || rawText.trim() === '') return [];

  const lines = rawText.split('\n');
  const results: ParsedLine[] = [];
  let index = 0;

  for (const line of lines) {
    // Limpiar la línea
    let clean = line.trim();
    
    // Remover marcadores de lista: -, *, •, números con punto o paréntesis
    clean = clean.replace(/^[\-\*•·]\s*/, '');
    clean = clean.replace(/^\d+[\.\)]\s*/, '');
    clean = clean.trim();

    // Saltar líneas vacías
    if (clean === '') continue;

    // Detectar si es encabezado (típicamente la primera línea tipo "Buena tarde...")
    const isHeader = isHeaderLine(clean);

    if (!isHeader) {
      const suggestedType = classifyActivity(clean);
      const suggestedContact = detectContact(line);

      results.push({
        index: index++,
        originalText: line.trim(),
        cleanText: clean,
        suggestedType,
        suggestedContact,
        isHeader: false,
      });
    }
  }

  return results;
}

/**
 * Detecta si una línea es un encabezado/saludo y no una actividad.
 */
function isHeaderLine(text: string): boolean {
  const headerPatterns = [
    /^(buena|buen)\s+(tarde|día|dia|noche|mañana)/i,
    /^(hola|saludos|estimad)/i,
    /^reporte\s+(de|del)\s+(actividades|día|dia)/i,
    /^anexo\s+reporte/i,
    /^reporte\s+del\s+día/i,
  ];

  return headerPatterns.some((p) => p.test(text));
}

/**
 * Convierte texto raw a CSV para exportación
 */
export function activitiesToCSV(activities: any[]): string {
  const headers = [
    'Fecha',
    'Responsable',
    'Tipo',
    'Cliente',
    'Contacto',
    'Título',
    'Resultado',
    'Siguiente Paso',
    'Estatus',
    'Hora Inicio',
    'Hora Fin',
    'Duración (min)',
    'Ubicación',
    'Oportunidad',
    'OT',
    'Notas',
  ];

  const rows = activities.map((a) => [
    a.date ? new Date(a.date).toLocaleDateString('es-MX') : '',
    a.user?.name || '',
    a.type || '',
    a.client?.name || '',
    a.contact?.name || '',
    (a.title || '').replace(/"/g, '""'),
    (a.result || '').replace(/"/g, '""'),
    (a.nextStep || '').replace(/"/g, '""'),
    a.status || '',
    a.startTime || '',
    a.endTime || '',
    a.durationMinutes?.toString() || '',
    (a.location || '').replace(/"/g, '""'),
    a.opportunity?.folio || '',
    a.workOrderFolio || '',
    (a.notes || '').replace(/"/g, '""'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return '\uFEFF' + csvContent; // BOM for Excel UTF-8
}

/**
 * Convierte oportunidades a CSV
 */
export function opportunitiesToCSV(opportunities: any[]): string {
  const headers = [
    'Folio',
    'Cliente',
    'Contacto',
    'Responsable',
    'Título',
    'Estatus',
    'Fecha Solicitud',
    'Visita Programada',
    'Visita Realizada',
    'Info Completa',
    'Fecha Compromiso Cotización',
    'Cotización Enviada',
    'Lead Time (días)',
    'Motivo de Atraso',
    'Notas',
  ];

  const rows = opportunities.map((o) => {
    let leadTime = '';
    if (o.actualVisitDate && o.quotationSentDate) {
      const days = Math.ceil(
        (new Date(o.quotationSentDate).getTime() - new Date(o.actualVisitDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      leadTime = days.toString();
    }

    return [
      o.folio || '',
      o.client?.name || '',
      o.contact?.name || '',
      o.user?.name || '',
      (o.title || '').replace(/"/g, '""'),
      o.status || '',
      o.requestDate ? new Date(o.requestDate).toLocaleDateString('es-MX') : '',
      o.scheduledVisitDate ? new Date(o.scheduledVisitDate).toLocaleDateString('es-MX') : '',
      o.actualVisitDate ? new Date(o.actualVisitDate).toLocaleDateString('es-MX') : '',
      o.infoCompleteDate ? new Date(o.infoCompleteDate).toLocaleDateString('es-MX') : '',
      o.quotationDueDate ? new Date(o.quotationDueDate).toLocaleDateString('es-MX') : '',
      o.quotationSentDate ? new Date(o.quotationSentDate).toLocaleDateString('es-MX') : '',
      leadTime,
      (o.delayReason || '').replace(/"/g, '""'),
      (o.notes || '').replace(/"/g, '""'),
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return '\uFEFF' + csvContent;
}
