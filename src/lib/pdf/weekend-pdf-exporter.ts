import { parseLocalDate } from '@/lib/timezone';

interface ExportPDFParams {
  activities: any[];
  techAssignments: any[];
  safetyAssignments: any[];
  userSafetyAssignments: any[];
  equipAssignments: any[];
  technicians?: any[];
  weekendOf: string;
  companyName: string;
}

export function exportWeekendPDFClient({
  activities,
  techAssignments,
  safetyAssignments,
  userSafetyAssignments,
  equipAssignments,
  weekendOf,
  companyName,
}: ExportPDFParams) {
  // Calculate Saturday and Sunday dates
  const [year, month, day] = weekendOf.split('-').map(Number);
  const satDateObj = new Date(year, month - 1, day);
  const sunDateObj = new Date(satDateObj);
  sunDateObj.setDate(sunDateObj.getDate() + 1);

  const formatDayNum = (d: Date) => String(d.getDate()).padStart(2, '0');
  const monthNamesEs = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const monthNamesEsShort = [
    'AGO', 'AGO', 'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
  ];

  const satDayNum = formatDayNum(satDateObj);
  const sunDayNum = formatDayNum(sunDateObj);
  const monthName = monthNamesEs[satDateObj.getMonth()];
  const satMonthShort = monthNamesEsShort[satDateObj.getMonth() + 1] || 'AGO';
  const sunMonthShort = monthNamesEsShort[sunDateObj.getMonth() + 1] || 'AGO';

  const satStr = weekendOf;
  const sunStr = `${sunDateObj.getFullYear()}-${String(sunDateObj.getMonth() + 1).padStart(2, '0')}-${String(sunDateObj.getDate()).padStart(2, '0')}`;

  // Helper mappings
  const getTechsForActivity = (actId: string) => {
    const assigned = techAssignments.filter(t => t.activityId === actId);
    if (assigned.length > 0) {
      return assigned.map(t => t.technician?.name || t.technicianName || 'Técnico').join(', ');
    }
    return '—';
  };

  const getSafetyForActivity = (actId: string) => {
    const assignedUser = userSafetyAssignments.find(u => u.activityId === actId);
    if (assignedUser?.user?.name) {
      return { isDedicated: true, name: assignedUser.user.name };
    }
    const assignedExt = safetyAssignments.find(s => s.activityId === actId);
    if (assignedExt?.safetyDedicado?.name) {
      return { isDedicated: true, name: assignedExt.safetyDedicado.name };
    }
    return { isDedicated: false, name: 'NO DEDICADO' };
  };

  const getEquipForActivity = (actId: string) => {
    const assigned = equipAssignments.find(e => e.activityId === actId);
    if (assigned?.equip) {
      const typeStr = assigned.equip.type || 'EQUIPO';
      const ownership = assigned.equip.ownership === 'RENTADO' ? 'RENTADO' : 'PROPIO';
      return `${typeStr} ${assigned.equip.name} (${ownership})`;
    }
    return 'N/A';
  };

  // Group activities into multiday vs Saturday vs Sunday
  const satActs: any[] = [];
  const sunActs: any[] = [];
  const multiActs: any[] = [];

  const actMap = new Map<string, { sat?: any; sun?: any }>();
  activities.forEach(act => {
    const actDateStr = typeof act.date === 'string' ? act.date.substring(0, 10) : new Date(act.date).toISOString().substring(0, 10);
    const key = (act.workOrderFolio ? `FOLIO_${act.workOrderFolio}` : `TITLE_${act.title}`).toLowerCase().trim();

    if (!actMap.has(key)) actMap.set(key, {});
    const item = actMap.get(key)!;
    if (actDateStr === satStr) item.sat = act;
    else if (actDateStr === sunStr) item.sun = act;
  });

  const processedIds = new Set<string>();

  actMap.forEach((val) => {
    if (val.sat && val.sun) {
      processedIds.add(val.sat.id);
      processedIds.add(val.sun.id);
      multiActs.push({
        title: val.sat.title,
        folio: val.sat.workOrderFolio || val.sun.workOrderFolio || null,
        client: val.sat.client?.name || val.sat.contact?.name || '—',
        supervisor: val.sat.user?.name || val.sun.user?.name || '—',
        responsible: val.sat.user?.name || 'Carlos Lopez',
        loto: val.sat.loto || val.sun.loto,
        equip: getEquipForActivity(val.sat.id) !== 'N/A' ? getEquipForActivity(val.sat.id) : getEquipForActivity(val.sun.id),
        satTime: `${val.sat.startTime || '14:00'} - ${val.sat.endTime || '20:00'} HRS`,
        satTechs: getTechsForActivity(val.sat.id),
        satSafety: getSafetyForActivity(val.sat.id),
        sunTime: `${val.sun.startTime || '08:00'} - ${val.sun.endTime || '14:00'} HRS`,
        sunTechs: getTechsForActivity(val.sun.id),
        sunSafety: getSafetyForActivity(val.sun.id),
      });
    }
  });

  activities.forEach(act => {
    if (processedIds.has(act.id)) return;
    const actDateStr = typeof act.date === 'string' ? act.date.substring(0, 10) : new Date(act.date).toISOString().substring(0, 10);
    const itemData = {
      id: act.id,
      title: act.title,
      folio: act.workOrderFolio,
      time: `${act.startTime || '08:00'} - ${act.endTime || '17:00'} hrs${act.startTime && Number(act.startTime.substring(0, 2)) >= 18 ? ' (Nocturno)' : ''}`,
      client: act.client?.name || act.contact?.name || '—',
      supervisor: act.user?.name || '—',
      techs: getTechsForActivity(act.id),
      loto: act.loto,
      safety: getSafetyForActivity(act.id),
      equip: getEquipForActivity(act.id),
      notes: act.weekendNotes,
    };

    if (actDateStr === satStr) {
      satActs.push(itemData);
    } else {
      sunActs.push(itemData);
    }
  });

  // KPI Counts
  const totalActsCount = activities.length;
  const multidayCount = multiActs.length;
  const elevationEquipCount = activities.filter(a => getEquipForActivity(a.id) !== 'N/A').length;
  const safetyDedicatedCount = activities.filter(a => getSafetyForActivity(a.id).isDedicated).length;

  const generationTime = new Date().toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Plan de Trabajo Fin de Semana — ${companyName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    @page {
      size: letter landscape;
      margin: 8mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      line-height: 1.35;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      padding: 12px;
    }

    .header-banner {
      background: #0f172a !important;
      color: #ffffff !important;
      padding: 14px 18px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .title-group h1 {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #ffffff !important;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-group p {
      font-size: 10.5px;
      color: #38bdf8 !important;
      font-weight: 600;
      margin-top: 2px;
    }

    .kpi-container {
      display: flex;
      gap: 6px;
    }

    .kpi-box {
      background: #1e293b !important;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 4px 10px;
      text-align: center;
      min-width: 72px;
    }

    .kpi-val {
      font-size: 14px;
      font-weight: 900;
      color: #ffffff !important;
    }

    .kpi-lbl {
      font-size: 7.5px;
      font-weight: 800;
      color: #94a3b8 !important;
      text-transform: uppercase;
    }

    .act-card {
      background: #ffffff !important;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .multiday-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 12px;
      background: #f8fafc !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .header-banner {
      background: #0f172a !important;
      color: #ffffff !important;
      padding: 14px 18px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .section-bar {
      background: #1e293b !important;
      color: #ffffff !important;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 800;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    .act-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 3px;
    }

    .act-num-time {
      font-size: 9.5px;
      font-weight: 900;
      color: #0284c7;
      background: #e0f2fe !important;
      padding: 1px 5px;
      border-radius: 4px;
    }

    .act-odoo {
      font-size: 8.5px;
      font-weight: 700;
      color: #64748b;
    }

    .act-card-title {
      font-size: 10.5px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
      line-height: 1.2;
    }

    .act-meta {
      font-size: 9px;
      color: #475569;
      line-height: 1.35;
      margin-bottom: 5px;
    }

    .badges-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 8px;
      font-weight: 800;
    }

    .badge {
      background: #f1f5f9 !important;
      color: #475569 !important;
      border: 1px solid #cbd5e1;
      padding: 1px 5px;
      border-radius: 4px;
    }

    .badge.yellow {
      background: #fef3c7 !important;
      color: #92400e !important;
      border-color: #fde68a;
    }

    .badge.green {
      background: #dcfce7 !important;
      color: #166534 !important;
      border-color: #86efac;
    }

    .note-tag {
      font-size: 8.5px;
      color: #0369a1;
      background: #f0f9ff !important;
      border-left: 3px solid #0284c7;
      padding: 2px 5px;
      margin-top: 4px;
      border-radius: 0 4px 4px 0;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8px;
      color: #64748b;
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 10px;
    }
  </style>
</head>
<body>

  <!-- HEADER BANNER -->
  <div class="header-banner">
    <div class="title-group">
      <h1>PLAN DE TRABAJO FIN DE SEMANA | ${companyName.toUpperCase()}</h1>
      <p>Ventana Operativa: Sábado ${satDayNum} de ${monthName} - Domingo ${sunDayNum} de ${monthName} de ${satDateObj.getFullYear()}</p>
    </div>
    <div class="kpi-container">
      <div class="kpi-box">
        <div class="kpi-val">${String(totalActsCount).padStart(2, '0')}</div>
        <div class="kpi-lbl">ACT. TOTALES</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val">${String(multidayCount).padStart(2, '0')}</div>
        <div class="kpi-lbl">AMBOS DÍAS</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val">${String(elevationEquipCount).padStart(2, '0')}</div>
        <div class="kpi-lbl">EQ. ELEVACIÓN</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val">${String(safetyDedicatedCount).padStart(2, '0')}</div>
        <div class="kpi-lbl">SAFETY DEDICADO</div>
      </div>
    </div>
  </div>

  <!-- MULTI-DAY SECTION -->
  ${multiActs.length > 0 ? `
    <div class="section-bar blue">
      <span>🌀 ACTIVIDAD CONTINUA / MULTIDÍA (SÁBADO ${satDayNum} Y DOMINGO ${sunDayNum} DE ${monthName.toUpperCase()})</span>
    </div>

    ${multiActs.map((m, idx) => `
      <div class="multiday-card">
        <div class="multiday-header">
          <div class="multiday-title">Items #${String(idx + 1).padStart(2, '0')} — ${m.title}</div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span class="pill-green">EJECUCIÓN SÁBADO + DOMINGO</span>
            <span class="pill-blue">ODOO: #${m.folio || 'N/A'}</span>
          </div>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><strong>CONTACTO / CLIENTE:</strong> ${m.client}</div>
          <div class="meta-item"><strong>ING. RESPONSABLE:</strong> ${m.responsible}</div>
          <div class="meta-item"><strong>SUP. OPERATIVO:</strong> ${m.supervisor}</div>
          <div class="meta-item"><strong>CONDICIONES:</strong> LOTO: ${m.loto ? 'SI' : 'NO'} | ELEVACIÓN: ${m.equip}</div>
        </div>

        <div class="days-grid">
          <div class="day-subcard">
            <div class="day-subcard-header pill-blue">SÁBADO ${satDayNum} ${satMonthShort} • ${m.satTime}</div>
            <div style="font-size:9px; color:#475569;">
              <div><strong>TÉCNICOS:</strong> ${m.satTechs}</div>
              <div><strong>SAFETY:</strong> ${m.satSafety.isDedicated ? `<span class="pill-green">🛡️ ${m.satSafety.name} (DEDICADO)</span>` : 'NO DEDICADO'}</div>
            </div>
          </div>
          <div class="day-subcard">
            <div class="day-subcard-header pill-green">DOMINGO ${sunDayNum} ${sunMonthShort} • ${m.sunTime}</div>
            <div style="font-size:9px; color:#475569;">
              <div><strong>TÉCNICOS:</strong> ${m.sunTechs}</div>
              <div><strong>SAFETY:</strong> ${m.sunSafety.isDedicated ? `<span class="pill-green">🛡️ ${m.sunSafety.name} (DEDICADO)</span>` : 'NO DEDICADO'}</div>
            </div>
          </div>
        </div>
      </div>
    `).join('')}
  ` : ''}

  <!-- INDIVIDUAL DAYS 2-COLUMN GRID -->
  <div class="grid-2col">
    <!-- SATURDAY COLUMN -->
    <div>
      <div class="section-bar dark-blue">
        <span>SÁBADO ${satDayNum} DE ${monthName.toUpperCase()} ${satDateObj.getFullYear()}</span>
        <span>${satActs.length} ACTIVIDADES INDIVIDUALES</span>
      </div>

      ${satActs.length === 0 ? '<div style="font-size:9px; color:#94a3b8; padding:8px;">Sin actividades registradas para este día.</div>' : ''}
      ${satActs.map((act, idx) => `
        <div class="act-card">
          <div class="act-card-header">
            <span class="act-num-time">#${String(idx + 1).padStart(2, '0')} &nbsp; ${act.time}</span>
            <span class="act-odoo">ODOO: #${act.folio || 'N/A'}</span>
          </div>
          <div class="act-card-title">${act.title}</div>
          <div class="act-meta">
            <div><strong>CONTACTO:</strong> ${act.client}</div>
            <div><strong>ING / SUP:</strong> ${act.supervisor}</div>
            <div><strong>TÉCNICOS:</strong> ${act.techs}</div>
          </div>
          <div class="badges-row">
            <span class="badge">LOTO: ${act.loto ? 'SI' : 'NO'}</span>
            <span class="badge ${act.safety.isDedicated ? 'green' : ''}">SAFETY: ${act.safety.isDedicated ? act.safety.name : 'NO'}</span>
            <span class="badge ${act.equip !== 'N/A' ? 'yellow' : ''}">ELEVACIÓN: ${act.equip !== 'N/A' ? `🚜 ${act.equip}` : 'N/A'}</span>
          </div>
          ${act.notes ? `<div class="note-tag"><strong>Nota Ing:</strong> ${act.notes}</div>` : ''}
        </div>
      `).join('')}
    </div>

    <!-- SUNDAY COLUMN -->
    <div>
      <div class="section-bar dark-blue">
        <span>DOMINGO ${sunDayNum} DE ${monthName.toUpperCase()} ${sunDateObj.getFullYear()}</span>
        <span>${sunActs.length} ACTIVIDADES INDIVIDUALES</span>
      </div>

      ${sunActs.length === 0 ? '<div style="font-size:9px; color:#94a3b8; padding:8px;">Sin actividades registradas para este día.</div>' : ''}
      ${sunActs.map((act, idx) => `
        <div class="act-card">
          <div class="act-card-header">
            <span class="act-num-time">#${String(idx + 1 + satActs.length).padStart(2, '0')} &nbsp; ${act.time}</span>
            <span class="act-odoo">ODOO: #${act.folio || 'N/A'}</span>
          </div>
          <div class="act-card-title">${act.title}</div>
          <div class="act-meta">
            <div><strong>CONTACTO:</strong> ${act.client}</div>
            <div><strong>ING / SUP:</strong> ${act.supervisor}</div>
            <div><strong>TÉCNICOS:</strong> ${act.techs}</div>
          </div>
          <div class="badges-row">
            <span class="badge">LOTO: ${act.loto ? 'SI' : 'NO'}</span>
            <span class="badge ${act.safety.isDedicated ? 'green' : ''}">SAFETY: ${act.safety.isDedicated ? act.safety.name : 'NO'}</span>
            <span class="badge ${act.equip !== 'N/A' ? 'yellow' : ''}">ELEVACIÓN: ${act.equip !== 'N/A' ? `🚜 ${act.equip}` : 'N/A'}</span>
          </div>
          ${act.notes ? `<div class="note-tag"><strong>Nota Ing:</strong> ${act.notes}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>${companyName.toUpperCase()} • Control Operativo de Fin de Semana | Perry Intelligence | Generado: ${generationTime} hrs</span>
    <span>Página 1 de 1</span>
  </div>

</body>
</html>`;

  // Open print popup window
  const printWindow = window.open('', '_blank', 'width=1100,height=850');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    alert('Por favor habilita las ventanas emergentes en tu navegador para generar el PDF.');
  }
}
