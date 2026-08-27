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
    const weekendOf = body.weekendOf || new Date().toISOString().slice(0, 10);
    const companyId = body.companyId || null;

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

    // Fetch Extra Plan Days if any
    const extraDays = await prisma.extraPlanDay.findMany({
      where: { weekendOf },
      orderBy: { date: 'asc' },
    });

    const allDates = [...new Set([weekendOf, ...extraDays.map((d) => d.date)])].sort();

    const dateRanges = allDates.map((dateStr) => {
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
      equipAssignments,
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
        include: { technician: true },
      }),
      prisma.weekendSafetyAssignment.findMany({
        where: { weekendOf },
        include: { safetyDedicado: true },
      }),
      prisma.weekendUserSafetyAssignment.findMany({
        where: { weekendOf },
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.weekendVehicleAssignment.findMany({
        where: { weekendOf },
        include: { vehicle: true },
      }),
      prisma.weekendDriverAssignment.findMany({
        where: { weekendOf },
        include: { driver: true },
      }),
      prisma.weekendEquipAssignment.findMany({
        where: { weekendOf },
        include: { equip: true },
      }),
    ]);

    // Map activity helper
    const getTechsForActivity = (actId: string) => {
      const assigned = techAssignments.filter((t) => t.activityId === actId);
      if (assigned.length > 0) return assigned.map((t) => t.technician?.name || 'Técnico').join(', ');
      return '—';
    };

    const getSafetyForActivity = (actId: string) => {
      const assignedUser = userSafetyAssignments.find((u) => u.activityId === actId);
      if (assignedUser?.user?.name) {
        return { isDedicated: true, name: assignedUser.user.name };
      }
      const assignedExt = safetyAssignments.find((s) => s.activityId === actId);
      if (assignedExt?.safetyDedicado?.name) {
        return { isDedicated: true, name: assignedExt.safetyDedicado.name };
      }
      return { isDedicated: false, name: 'NO DEDICADO' };
    };

    const getEquipForActivity = (actId: string) => {
      const assigned = equipAssignments.find((e) => e.activityId === actId);
      if (assigned?.equip) {
        const typeStr = assigned.equip.type || 'EQUIPO';
        const ownership = assigned.equip.ownership === 'RENTADO' ? 'RENTADO' : 'PROPIO';
        return `${typeStr} ${assigned.equip.name} (${ownership})`;
      }
      return 'N/A';
    };

    // Group activities by date
    const actsByDate: Record<string, any[]> = {};
    allDates.forEach((dStr) => {
      actsByDate[dStr] = [];
    });

    activities.forEach((act) => {
      const actDateStr = act.date.toISOString().slice(0, 10);
      const itemData = {
        id: act.id,
        title: act.title,
        folio: act.workOrderFolio,
        time: `${act.startTime || '08:00'} - ${act.endTime || '17:00'} hrs${
          act.startTime && Number(act.startTime.substring(0, 2)) >= 18 ? ' (Nocturno)' : ''
        }`,
        client: act.client?.name || act.contact?.name || '—',
        supervisor: act.user?.name || '—',
        techs: getTechsForActivity(act.id),
        loto: act.loto,
        safety: getSafetyForActivity(act.id),
        equip: getEquipForActivity(act.id),
        notes: act.weekendNotes,
      };

      if (actsByDate[actDateStr]) {
        actsByDate[actDateStr].push(itemData);
      } else {
        // Fallback for timezone edge cases
        const firstKey = allDates[0];
        if (actsByDate[firstKey]) actsByDate[firstKey].push(itemData);
      }
    });

    // KPI Counts
    const totalActsCount = activities.length;
    const elevationEquipCount = activities.filter((a) => getEquipForActivity(a.id) !== 'N/A').length;
    const safetyDedicatedCount = activities.filter((a) => getSafetyForActivity(a.id).isDedicated).length;

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
      break-after: avoid-page !important;
    }

    .section-bar.dark-blue { background: #0f172a; }

    .grid-2col {
      display: grid;
      grid-template-columns: ${allDates.length > 1 ? 'repeat(2, 1fr)' : '1fr'};
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
    ${allDates
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
              ? '<div style="font-size:10px; color:#94a3b8; padding:10px;">Sin actividades registradas para este día.</div>'
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
                <div><strong>RESPONSABLE / SUP:</strong> ${act.supervisor}</div>
                <div><strong>TÉCNICOS:</strong> ${act.techs}</div>
              </div>
              <div class="badges-row">
                <span class="badge">LOTO: ${act.loto ? 'SI' : 'NO'}</span>
                <span class="badge ${act.safety.isDedicated ? 'green' : ''}">SAFETY: ${
                act.safety.isDedicated ? act.safety.name : 'NO'
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

  <!-- FOOTER -->
  <div class="footer">
    <span>${companyName.toUpperCase()} • Control Operativo de Trabajo | Perry Intelligence | Generado: ${generationTime} hrs</span>
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
    const fileName = `Plan_Trabajo_${weekendOf}_${safeCompany}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('[WORK-EXPORT-PDF] Error generating PDF:', error);
    return NextResponse.json({ error: error.message || 'Error al generar PDF' }, { status: 500 });
  }
}
