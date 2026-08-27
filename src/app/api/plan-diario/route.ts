import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const company = searchParams.get('company');

    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    const whereClause: any = {
      planDate: targetDate,
    };

    if (company && company !== 'TODAS') {
      const compUpper = company.toUpperCase();
      if (compUpper.includes('CASEME') || compUpper.includes('GLOBAL')) {
        whereClause.companyName = {
          in: ['GRUPO CASEME', 'GLOBAL SUPPORT', 'CASEME'],
        };
      } else {
        whereClause.companyName = {
          contains: company,
          mode: 'insensitive',
        };
      }
    }

    const plans = await prisma.dailyWorkPlan.findMany({
      where: whereClause,
      include: {
        activities: {
          orderBy: { activityOrder: 'asc' },
        },
        personnelStatus: true,
      },
      orderBy: { companyName: 'asc' },
    });

    // Detect Double-Assignment / Overlapping Technician Warnings for the day across ALL companies
    const allPlansForDay = await prisma.dailyWorkPlan.findMany({
      where: { planDate: targetDate },
      include: { activities: true, personnelStatus: true },
    });

    const personMap: Record<string, { companyName: string; activityTitle: string }[]> = {};

    allPlansForDay.forEach((p) => {
      p.activities.forEach((act) => {
        if (!act.assignedPersonnel) return;

        // Parse personnel list (comma separated or multiline)
        const names = act.assignedPersonnel
          .split(/[\n,;]/)
          .map((n) => n.trim())
          .filter((n) => n.length > 2 && !/^\d+[- ]/.test(n));

        names.forEach((name) => {
          // Clean name string if company is attached e.g. "Mauricio (Global)" -> "Mauricio"
          const cleanName = name.replace(/\([^)]*\)/g, '').trim().toUpperCase();
          if (cleanName.length < 3) return;

          if (!personMap[cleanName]) {
            personMap[cleanName] = [];
          }
          personMap[cleanName].push({
            companyName: p.companyName,
            activityTitle: act.title,
          });
        });
      });
    });

    // Filter persons with 2 or more assignments on the same day
    const warnings: Array<{
      personName: string;
      count: number;
      assignments: { companyName: string; activityTitle: string }[];
    }> = [];

    Object.entries(personMap).forEach(([personName, assignments]) => {
      if (assignments.length > 1) {
        warnings.push({
          personName,
          count: assignments.length,
          assignments,
        });
      }
    });

    return NextResponse.json({
      date: dateStr,
      plans,
      warnings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error consultando Plan Diario' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Acceso no autenticado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role || 'INGENIERO';
    const userEmail = ((session.user as any)?.email || '').toLowerCase().trim();
    const isDirector = ['lopezboyer@gmail.com', 'enrique.lopez.gsi@gmail.com', 'carlos.sevilla@grupocaseme.com', 'carlos.lopez@gsingenieria.mx'].some(e => userEmail.includes(e.split('@')[0]));
    const canEdit = isDirector || ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR'].includes(userRole);

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Acceso restringido: Solo Dirección (ADMIN), Administración y Supervisores pueden modificar el Plan Diario. Tu perfil tiene permisos únicamente de visualización.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { date, companyName, activities, personnelStatus } = body;

    if (!date || !companyName) {
      return NextResponse.json({ error: 'Fecha y Empresa son requeridas' }, { status: 400 });
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);

    // Upsert DailyWorkPlan
    const plan = await prisma.dailyWorkPlan.upsert({
      where: {
        planDate_companyName: {
          planDate: targetDate,
          companyName,
        },
      },
      create: {
        planDate: targetDate,
        companyName,
        status: 'PUBLICADO',
      },
      update: {
        status: 'PUBLICADO',
        updatedAt: new Date(),
      },
    });

    // Replace activities if provided
    if (Array.isArray(activities)) {
      await prisma.dailyWorkPlanActivity.deleteMany({
        where: { dailyWorkPlanId: plan.id },
      });

      if (activities.length > 0) {
        await prisma.dailyWorkPlanActivity.createMany({
          data: activities.map((act: any, idx: number) => ({
            dailyWorkPlanId: plan.id,
            activityOrder: idx + 1,
            title: act.title || 'Actividad Sin Título',
            assignedPersonnel: act.assignedPersonnel || '',
            dayOfWeek: act.dayOfWeek || 'JUEVES',
            startTime: act.startTime || '08:00 AM',
            clientName: act.clientName || null,
            supervisorOperativo: act.supervisorOperativo || null,
            supervisorCotizador: act.supervisorCotizador || null,
            supervisorTMMBC: act.supervisorTMMBC || null,
            safetyDedicado: act.safetyDedicado || null,
            cotizacionFolio: act.cotizacionFolio || null,
            poNumber: act.poNumber || null,
            isCrossSupport: Boolean(act.isCrossSupport),
            crossSupportCompany: act.crossSupportCompany || null,
            notes: act.notes || null,
          })),
        });
      }
    }

    // Replace personnelStatus if provided
    if (Array.isArray(personnelStatus)) {
      await prisma.dailyWorkPlanPersonnelStatus.deleteMany({
        where: { dailyWorkPlanId: plan.id },
      });

      if (personnelStatus.length > 0) {
        await prisma.dailyWorkPlanPersonnelStatus.createMany({
          data: personnelStatus.map((ps: any) => ({
            dailyWorkPlanId: plan.id,
            personName: ps.personName || 'Personal',
            statusType: ps.statusType || 'DESCANSO',
            originCompany: ps.originCompany || companyName,
            notes: ps.notes || null,
          })),
        });
      }
    }

    const updatedPlan = await prisma.dailyWorkPlan.findUnique({
      where: { id: plan.id },
      include: {
        activities: { orderBy: { activityOrder: 'asc' } },
        personnelStatus: true,
      },
    });

    return NextResponse.json({ success: true, plan: updatedPlan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error guardando Plan Diario' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Acceso no autenticado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role || 'INGENIERO';
    const userEmail = ((session.user as any)?.email || '').toLowerCase().trim();
    const isDirector = ['lopezboyer@gmail.com', 'enrique.lopez.gsi@gmail.com', 'carlos.sevilla@grupocaseme.com', 'carlos.lopez@gsingenieria.mx'].some(e => userEmail.includes(e.split('@')[0]));
    const canEdit = isDirector || ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR'].includes(userRole);

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Acceso restringido: Solo Dirección (ADMIN), Administración y Supervisores pueden eliminar registros del Plan Diario.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');
    const activityId = searchParams.get('activityId');

    if (activityId) {
      await prisma.dailyWorkPlanActivity.delete({ where: { id: activityId } });
      return NextResponse.json({ success: true, deleted: 'activity' });
    }

    if (planId) {
      await prisma.dailyWorkPlan.delete({ where: { id: planId } });
      return NextResponse.json({ success: true, deleted: 'plan' });
    }

    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error eliminando registro' }, { status: 500 });
  }
}
