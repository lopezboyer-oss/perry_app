import { parseLocalDate } from '@/lib/timezone';

interface ExportPDFParams {
  activities: any[];
  techAssignments: any[];
  safetyAssignments: any[];
  userSafetyAssignments: any[];
  supervisorAssignments?: any[];
  equipAssignments: any[];
  technicians?: any[];
  weekendOf: string;
  companyName: string;
  personnelStatusList?: {
    id?: string;
    personName: string;
    statusType: string;
    originCompany?: string | null;
    notes?: string | null;
  }[];
}

export function exportWeekendPDFClient({
  activities,
  techAssignments,
  safetyAssignments,
  userSafetyAssignments,
  supervisorAssignments = [],
  equipAssignments,
  weekendOf,
  companyName,
  personnelStatusList = [],
}: ExportPDFParams) {
  const daysOfWeekFull = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
  const daysOfWeekTitle = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNamesEs = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const formatDayNum = (d: Date) => String(d.getDate()).padStart(2, '0');

  // Parse target base date
  const targetDateObj = parseLocalDate(weekendOf);
  const baseDayNameUpper = daysOfWeekFull[targetDateObj.getDay()];
  const baseDayNameTitle = daysOfWeekTitle[targetDateObj.getDay()];
  const baseDayNum = formatDayNum(targetDateObj);
  const baseMonthName = monthNamesEs[targetDateObj.getMonth()];
  const baseYear = targetDateObj.getFullYear();

  // Helper mappings
  const getTechsForActivity = (actId: string) => {
    const assigned = techAssignments.filter(t => t.activityId === actId);
    if (assigned.length > 0) {
      return assigned.map(t => t.technician?.name || t.technicianName || 'Técnico').join(', ');
    }
    return '—';
  };

  const getSupOperativoForActivity = (actId: string) => {
    const sups: string[] = [];
    // Ingenieros / Usuarios asignados como Supervisor Operativo
    const assignedUsers = (userSafetyAssignments || []).filter(u => u.activityId === actId);
    assignedUsers.forEach(u => {
      if (u.user?.name && !sups.includes(u.user.name)) sups.push(u.user.name);
    });
    // Safety Dedicado actuando en rol DESIGNADO (columna Sup Operativo)
    const assignedDesignados = (safetyAssignments || []).filter(s => s.activityId === actId && s.role === 'DESIGNADO');
    assignedDesignados.forEach(s => {
      if (s.safetyDedicado?.name && !sups.includes(s.safetyDedicado.name)) sups.push(s.safetyDedicado.name);
    });
    // Técnico Cruz Verde con rol SAFETY_DESIGNADO si fue asignado en esa columna
    const assignedTechDesignados = (techAssignments || []).filter(t => t.activityId === actId && t.role === 'SAFETY_DESIGNADO');
    assignedTechDesignados.forEach(t => {
      const name = t.technician?.name || t.technicianName;
      if (name && !sups.includes(name)) sups.push(name);
    });

    return sups.length > 0 ? sups.join(', ') : null;
  };

  const getSafetyDedicadoForActivity = (actId: string) => {
    // Exclusivamente personal de la columna Safety Dedicado (rol DEDICADO)
    const dedicados = (safetyAssignments || []).filter(s => s.activityId === actId && s.role !== 'DESIGNADO');
    if (dedicados.length > 0) {
      return dedicados.map(d => d.safetyDedicado?.name || 'Safety').join(', ');
    }
    return null;
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

  // Collect all unique date strings
  const actDates = activities.map(a => typeof a.date === 'string' ? a.date.substring(0, 10) : new Date(a.date).toISOString().substring(0, 10));
  const uniqueDates = [...new Set([weekendOf, ...actDates])].sort();

  // Group activities by date
  const actsByDate: Record<string, any[]> = {};
  uniqueDates.forEach(dStr => { actsByDate[dStr] = []; });

  activities.forEach(act => {
    const actDateStr = typeof act.date === 'string' ? act.date.substring(0, 10) : new Date(act.date).toISOString().substring(0, 10);
    const multiDayBadge = act.multiDayTotalDays && act.multiDayTotalDays > 1 ? `[Día ${act.multiDayIndex || 1}/${act.multiDayTotalDays}] ` : '';
    
    // Multiple supervisors string
    const primarySup = act.user?.name || '';
    const additionalSups = (supervisorAssignments || [])
      .filter((s: any) => s.activityId === act.id)
      .map((s: any) => `${s.user?.name || s.userName} (${s.role === 'CAPACITACION' ? 'Capacitación' : 'Apoyo'})`);
    const allSupervisors = primarySup
      ? (additionalSups.length > 0 ? `${primarySup}, ${additionalSups.join(', ')}` : primarySup)
      : (additionalSups.join(', ') || '—');

    const supOperativoName = getSupOperativoForActivity(act.id);
    const safetyDedicadoName = getSafetyDedicadoForActivity(act.id);

    const itemData = {
      id: act.id,
      title: `${multiDayBadge}${act.title}`,
      folio: act.workOrderFolio,
      time: `${act.startTime || '08:00'} - ${act.endTime || '17:00'} hrs${
        act.startTime && Number(act.startTime.substring(0, 2)) >= 18 ? ' (Nocturno)' : ''
      }`,
      client: act.client?.name || act.contact?.name || '—',
      supervisor: allSupervisors,
      supOperativo: supOperativoName,
      safetyDedicado: safetyDedicadoName,
      techs: getTechsForActivity(act.id),
      loto: act.loto,
      equip: getEquipForActivity(act.id),
      notes: act.weekendNotes,
    };

    if (actsByDate[actDateStr]) {
      actsByDate[actDateStr].push(itemData);
    } else {
      const firstKey = uniqueDates[0];
      if (actsByDate[firstKey]) actsByDate[firstKey].push(itemData);
    }
  });

  // KPI Counts
  const totalActsCount = activities.length;
  const elevationEquipCount = activities.filter(a => getEquipForActivity(a.id) !== 'N/A').length;
  const safetyDedicatedCount = activities.filter(a => getSafetyDedicadoForActivity(a.id) !== null).length;

  const generationTime = new Date().toLocaleString('es-MX', {
    timeZone: 'America/Tijuana',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Build Printable HTML
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor habilita las ventanas emergentes en tu navegador para generar el PDF.');
    return;
  }

  const descansos = (personnelStatusList || []).filter(p => p.statusType === 'DESCANSO');
  const vacaciones = (personnelStatusList || []).filter(p => p.statusType === 'VACACIONES');
  const incapacidades = (personnelStatusList || []).filter(p => p.statusType === 'INCAPACIDAD');
  const hasPersonnelStatus = descansos.length > 0 || vacaciones.length > 0 || incapacidades.length > 0;

  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Plan de Trabajo — ${companyName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      padding: 24px;
    }

    .header-banner {
      background: #0f172a;
      color: #ffffff;
      padding: 16px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .title-group h1 {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-group p {
      font-size: 11px;
      color: #38bdf8;
      font-weight: 600;
      margin-top: 2px;
    }

    .kpi-container {
      display: flex;
      gap: 10px;
    }

    .kpi-box {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 6px 12px;
      text-align: center;
    }

    .kpi-val { font-size: 16px; font-weight: 900; color: #38bdf8; }
    .kpi-lbl { font-size: 8px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; }

    .section-bar {
      color: #ffffff;
      font-weight: 800;
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    .section-bar.dark-blue { background: #0f172a; }

    .grid-2col {
      display: grid;
      grid-template-columns: ${uniqueDates.length > 1 ? 'repeat(2, 1fr)' : '1fr'};
      gap: 14px;
      margin-bottom: 16px;
    }

    .act-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .act-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .act-num-time {
      font-size: 10px;
      font-weight: 900;
      color: #0284c7;
      background: #e0f2fe;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .act-odoo {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
    }

    .act-card-title {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
      line-height: 1.25;
    }

    .act-meta {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.4;
      margin-bottom: 6px;
    }

    .badges-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 8.5px;
      font-weight: 800;
    }

    .badge {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .badge.yellow {
      background: #fef3c7;
      color: #92400e;
      border-color: #fde68a;
    }

    .badge.green {
      background: #dcfce7;
      color: #166534;
      border-color: #86efac;
    }

    .note-tag {
      font-size: 9px;
      color: #0369a1;
      background: #f0f9ff;
      border-left: 3px solid #0284c7;
      padding: 3px 6px;
      margin-top: 6px;
      border-radius: 0 4px 4px 0;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8.5px;
      color: #64748b;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 12px;
    }
  </style>
</head>
<body>

  <!-- HEADER BANNER -->
  <div class="header-banner">
    <div class="title-group">
      <h1>PLAN DE TRABAJO | ${companyName.toUpperCase()}</h1>
      <p>Fecha Operativa: ${baseDayNameTitle} ${baseDayNum} de ${baseMonthName} de ${baseYear}</p>
    </div>
    <div class="kpi-container">
      <div class="kpi-box">
        <div class="kpi-val">${String(totalActsCount).padStart(2, '0')}</div>
        <div class="kpi-lbl">ACT. TOTALES</div>
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

  <!-- INDIVIDUAL DAYS GRID -->
  <div class="grid-2col">
    ${uniqueDates
      .map((dStr) => {
        const dObj = parseLocalDate(dStr);
        const dDayNameUpper = daysOfWeekFull[dObj.getDay()];
        const dDayNum = formatDayNum(dObj);
        const dMonthName = monthNamesEs[dObj.getMonth()];
        const dayActs = actsByDate[dStr] || [];

        return `
        <div>
          <div class="section-bar dark-blue">
            <span>${dDayNameUpper} ${dDayNum} DE ${dMonthName.toUpperCase()} ${dObj.getFullYear()}</span>
            <span>${dayActs.length} ACTIVIDADES</span>
          </div>

          ${
            dayActs.length === 0
              ? '<div style="font-size:9px; color:#94a3b8; padding:8px;">Sin actividades registradas para este día.</div>'
              : ''
          }
          ${dayActs
            .map(
              (act, idx) => `
            <div class="act-card">
              <div class="act-card-header">
                <span class="act-num-time">#${String(idx + 1).padStart(2, '0')} &nbsp; ${act.time}</span>
                <span class="act-odoo">ODOO: #${act.folio || 'N/A'}</span>
              </div>
              <div class="act-card-title">${act.title}</div>
              <div class="act-meta">
                <div><strong>CONTACTO / CLIENTE:</strong> ${act.client}</div>
                <div><strong>RESPONSABLE:</strong> ${act.supervisor}</div>
                <div><strong>SUP. OPERATIVO:</strong> ${act.supOperativo || '—'}</div>
                <div><strong>TÉCNICOS:</strong> ${act.techs}</div>
              </div>
              <div class="badges-row">
                <span class="badge">LOTO: ${act.loto ? 'SI' : 'NO'}</span>
                <span class="badge ${act.supOperativo ? 'green' : ''}">SUP. OPERATIVO: ${
                act.supOperativo || 'NO'
              }</span>
                <span class="badge ${act.safetyDedicado ? 'green' : ''}">SAFETY DEDICADO: ${
                act.safetyDedicado ? act.safetyDedicado : 'no'
              }</span>
                <span class="badge ${act.equip !== 'N/A' ? 'yellow' : ''}">ELEVACIÓN: ${
                act.equip !== 'N/A' ? `🚜 ${act.equip}` : 'N/A'
              }</span>
              </div>
              ${act.notes ? `<div class="note-tag"><strong>Nota Ing:</strong> ${act.notes}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      `;
      })
      .join('')}
  </div>

  <!-- SECCIÓN STATUS PERSONAL (DESCANSOS / VACACIONES / INCAPACIDAD) -->
  ${hasPersonnelStatus ? `
  <div style="margin-top: 14px; margin-bottom: 14px; page-break-inside: avoid !important; break-inside: avoid !important;">
    <div style="font-size: 11px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
      <span>👥 STATUS Y DISPONIBILIDAD DE PERSONAL</span>
      <span style="font-size: 9px; color: #64748b; font-weight: 600;">Total: ${personnelStatusList.length} registros</span>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(${[descansos.length > 0, vacaciones.length > 0, incapacidades.length > 0].filter(Boolean).length || 1}, 1fr); gap: 10px;">
      
      ${descansos.length > 0 ? `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
        <div style="font-size: 11px; font-weight: 900; color: #166534; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>🟢 DESCANSOS</span>
          <span style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; border-radius: 9999px; padding: 1px 6px; font-size: 9px;">${descansos.length}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${descansos.map(d => `
            <div style="background: #ffffff; border: 1px solid #dcfce7; border-radius: 6px; padding: 5px 8px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                <span style="font-size: 10px; font-weight: 800; color: #1e293b;">${d.personName}</span>
                ${d.originCompany ? `<span style="font-size: 8px; font-weight: 700; background: #dcfce7; color: #166534; padding: 1px 4px; border-radius: 4px;">${d.originCompany}</span>` : ''}
              </div>
              ${d.notes ? `<div style="font-size: 8.5px; color: #64748b; font-style: italic; margin-top: 2px;">📝 ${d.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${vacaciones.length > 0 ? `
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
        <div style="font-size: 11px; font-weight: 900; color: #075985; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>🔵 VACACIONES</span>
          <span style="background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; border-radius: 9999px; padding: 1px 6px; font-size: 9px;">${vacaciones.length}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${vacaciones.map(v => `
            <div style="background: #ffffff; border: 1px solid #e0f2fe; border-radius: 6px; padding: 5px 8px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                <span style="font-size: 10px; font-weight: 800; color: #1e293b;">${v.personName}</span>
                ${v.originCompany ? `<span style="font-size: 8px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 1px 4px; border-radius: 4px;">${v.originCompany}</span>` : ''}
              </div>
              ${v.notes ? `<div style="font-size: 8.5px; color: #64748b; font-style: italic; margin-top: 2px;">📝 ${v.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${incapacidades.length > 0 ? `
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
        <div style="font-size: 11px; font-weight: 900; color: #92400e; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>🟠 INCAPACIDAD</span>
          <span style="background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; border-radius: 9999px; padding: 1px 6px; font-size: 9px;">${incapacidades.length}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${incapacidades.map(inc => `
            <div style="background: #ffffff; border: 1px solid #fef3c7; border-radius: 6px; padding: 5px 8px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                <span style="font-size: 10px; font-weight: 800; color: #1e293b;">${inc.personName}</span>
                ${inc.originCompany ? `<span style="font-size: 8px; font-weight: 700; background: #fef3c7; color: #92400e; padding: 1px 4px; border-radius: 4px;">${inc.originCompany}</span>` : ''}
              </div>
              ${inc.notes ? `<div style="font-size: 8.5px; color: #64748b; font-style: italic; margin-top: 2px;">📝 ${inc.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

    </div>
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <span>${companyName.toUpperCase()} • Control Operativo de Trabajo | Perry Intelligence | Generado: ${generationTime} hrs</span>
    <span>Página 1 de 1</span>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
