import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { parseLocalDate } from '@/lib/timezone';
import puppeteer from 'puppeteer';

export const maxDuration = 60; // Netlify function timeout

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const weekendOf = body.weekendOf || '2026-08-22';
    const companyId = body.companyId || null;

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

    // Fetch Extra Plan Days
    const extraDays = await prisma.extraPlanDay.findMany({
      where: { weekendOf },
      orderBy: { date: 'asc' }
    });

    const allDates = [...new Set([
      weekendOf,
      `${sunDateObj.getFullYear()}-${String(sunDateObj.getMonth() + 1).padStart(2, '0')}-${String(sunDateObj.getDate()).padStart(2, '0')}`,
      ...extraDays.map(d => d.date)
    ])].sort();

    const dateRanges = allDates.map(dateStr => {
      const d = parseLocalDate(dateStr);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      return { date: { gte: start, lte: end } };
    });

    // Company filter
    let companyWhere: any = {};
    let companyName = 'CONSORCIO MULTIEMPRESA';
    if (companyId) {
      companyWhere = { companyId };
      const co = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
      if (co) companyName = co.name;
    }

    // Query DB data
    const [
      activities,
      techAssignments,
      safetyAssignments,
      userSafetyAssignments,
      vehicleAssignments,
      driverAssignments,
      equipAssignments
    ] = await Promise.all([
      prisma.activity.findMany({
        where: {
          OR: dateRanges,
          ...companyWhere,
        },
        include: {
          user: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      }),
      prisma.weekendTechAssignment.findMany({
        where: { weekendOf },
        include: { technician: true }
      }),
      prisma.weekendSafetyAssignment.findMany({
        where: { weekendOf },
        include: { safetyDedicado: true }
      }),
      prisma.weekendUserSafetyAssignment.findMany({
        where: { weekendOf },
        include: { user: { select: { id: true, name: true } } }
      }),
      prisma.weekendVehicleAssignment.findMany({
        where: { weekendOf },
        include: { vehicle: true }
      }),
      prisma.weekendDriverAssignment.findMany({
        where: { weekendOf },
        include: { driver: true }
      }),
      prisma.weekendEquipAssignment.findMany({
        where: { weekendOf },
        include: { equip: true }
      }),
    ]);

    // Map activity helper
    const getTechsForActivity = (actId: string) => {
      const assigned = techAssignments.filter(t => t.activityId === actId);
      if (assigned.length > 0) return assigned.map(t => t.technician?.name || 'Técnico').join(', ');
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

    // Separate activities into Saturday, Sunday, Multiday
    const satStr = weekendOf;
    const sunStr = `${sunDateObj.getFullYear()}-${String(sunDateObj.getMonth() + 1).padStart(2, '0')}-${String(sunDateObj.getDate()).padStart(2, '0')}`;

    // Group activities by title/folio if multi-day or single day
    const satActs: any[] = [];
    const sunActs: any[] = [];
    const multiActs: any[] = [];

    // Find multidía activities (activities with same title or folio on both Saturday & Sunday)
    const actMap = new Map<string, { sat?: any; sun?: any }>();
    activities.forEach(act => {
      const actDateStr = act.date.toISOString().substring(0, 10);
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
      const actDateStr = act.date.toISOString().substring(0, 10);
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
      timeZone: 'America/Tijuana',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Build Executive HTML
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Plan de Trabajo Fin de Semana — ${companyName}</title>
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
      gap: 8px;
    }

    .kpi-box {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 6px 12px;
      text-align: center;
      min-width: 76px;
    }

    .kpi-val {
      font-size: 15px;
      font-weight: 900;
      color: #ffffff;
    }

    .kpi-lbl {
      font-size: 8px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
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

    .multiday-card {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 16px;
      background: #f8fafc;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .section-bar {
      background: #1e293b;
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      margin-bottom: 10px;
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
            <div style="font-size:9.5px; color:#475569;">
              <div><strong>TÉCNICOS:</strong> ${m.satTechs}</div>
              <div><strong>SAFETY:</strong> ${m.satSafety.isDedicated ? `<span class="pill-green">🛡️ ${m.satSafety.name} (DEDICADO)</span>` : 'NO DEDICADO'}</div>
            </div>
          </div>
          <div class="day-subcard">
            <div class="day-subcard-header pill-green">DOMINGO ${sunDayNum} ${sunMonthShort} • ${m.sunTime}</div>
            <div style="font-size:9.5px; color:#475569;">
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

      ${satActs.length === 0 ? '<div style="font-size:10px; color:#94a3b8; padding:10px;">Sin actividades registradas para este día.</div>' : ''}
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

      ${sunActs.length === 0 ? '<div style="font-size:10px; color:#94a3b8; padding:10px;">Sin actividades registradas para este día.</div>' : ''}
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

    // Launch puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      landscape: true,
      printBackground: true,
      margin: { top: '10px', right: '10px', bottom: '10px', left: '10px' },
    });

    await browser.close();

    const safeCompany = companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Plan_Finde_${weekendOf}_${safeCompany}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('[WEEKEND-EXPORT-PDF] Error generating PDF:', error);
    return NextResponse.json({ error: error.message || 'Error al generar PDF' }, { status: 500 });
  }
}
