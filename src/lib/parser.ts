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
