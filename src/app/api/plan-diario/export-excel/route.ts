import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const company = searchParams.get('company');

    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    const whereClause: any = { planDate: targetDate };
    if (company && company !== 'TODAS') {
      whereClause.companyName = company;
    }

    const plans = await prisma.dailyWorkPlan.findMany({
      where: whereClause,
      include: {
        activities: { orderBy: { activityOrder: 'asc' } },
        personnelStatus: true,
      },
      orderBy: { companyName: 'asc' },
    });

    const wb = XLSX.utils.book_new();

    // Create a worksheet for each plan/company or combined
    plans.forEach((plan) => {
      const rows: any[] = [];

      // Header info
      rows.push(['PLAN DE TRABAJO DIARIO', plan.companyName, dateStr]);
      rows.push([]);
      rows.push([
        '#',
        'ACTIVIDAD / TRABAJO',
        'PERSONAS ASIGNADAS',
        'DÍA',
        'HORA INICIO',
        'CLIENTE',
        'SUPERVISOR OPERATIVO',
        'SUPERVISOR COTIZADOR',
        'COTIZACIÓN',
        'P.O.',
        'SOPORTE CRUZADO',
      ]);

      plan.activities.forEach((act, idx) => {
        rows.push([
          idx + 1,
          act.title,
          act.assignedPersonnel,
          act.dayOfWeek || 'LUNES A VIERNES',
          act.startTime || '08:00 AM',
          act.clientName || '-',
          act.supervisorOperativo || '-',
          act.supervisorCotizador || '-',
          act.cotizacionFolio || '-',
          act.poNumber || '-',
          act.isCrossSupport ? `SÍ (${act.crossSupportCompany || 'INTER-EMPRESA'})` : 'NO',
        ]);
      });

      if (plan.personnelStatus.length > 0) {
        rows.push([]);
        rows.push(['ESTATUS ESPECIAL DE PERSONAL (DESCANSOS / VACACIONES / COMPRAS)']);
        rows.push(['TIPO ESTATUS', 'NOMBRE COLABORADOR', 'EMPRESA ORIGEN', 'NOTAS']);
        plan.personnelStatus.forEach((ps) => {
          rows.push([ps.statusType, ps.personName, ps.originCompany || plan.companyName, ps.notes || '']);
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Auto-fit column widths
      ws['!cols'] = [
        { wch: 4 },  // #
        { wch: 45 }, // Actividad
        { wch: 35 }, // Personas
        { wch: 10 }, // Dia
        { wch: 12 }, // Hora
        { wch: 18 }, // Cliente
        { wch: 24 }, // Sup Operativo
        { wch: 24 }, // Sup Cotizador
        { wch: 15 }, // Cotizacion
        { wch: 15 }, // P.O.
        { wch: 22 }, // Soporte Cruzado
      ];

      const sheetName = plan.companyName.substring(0, 30).replace(/[^a-zA-Z0-9 ]/g, '_');
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    if (plans.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['No hay actividades programadas para la fecha seleccionada', dateStr]]);
      XLSX.utils.book_append_sheet(wb, ws, 'PLAN_DIARIO');
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Plan_Diario_${dateStr}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error exportando Excel' }, { status: 500 });
  }
}
