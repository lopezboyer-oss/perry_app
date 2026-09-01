import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canManageSafetyDedicado } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const company = searchParams.get('company');

    // Flexible 48-hour date window around targetDate to catch all timezone offsets (e.g. 12:00 UTC)
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const windowStart = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(targetDate.getTime() + 48 * 60 * 60 * 1000);

    // 1. Query registered DailyWorkPlan records for the target date
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

    // 2. Query ALL operational Activity records in Perry DB around date window
    const coreActivitiesRaw = await prisma.activity.findMany({
      where: {
        date: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        company: true,
        client: true,
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filter activities strictly matching target ISO date (YYYY-MM-DD) and excluding RASTRILLO/COTIZACION
    const coreActivities = coreActivitiesRaw.filter((act) => {
      const actIsoDate = act.date.toISOString().slice(0, 10);
      if (actIsoDate !== dateStr) return false;
      const typeUpper = (act.type || '').toUpperCase();
      return !['RASTRILLO', 'COTIZACION'].includes(typeUpper);
    });

    // Map core activities into plans by company name
    const companyPlanMap: Record<string, any> = {};

    plans.forEach((p) => {
      companyPlanMap[p.companyName.toUpperCase()] = {
        id: p.id,
        planDate: p.planDate,
        companyName: p.companyName,
        status: p.status,
        activities: [...(p.activities || [])],
        personnelStatus: [...(p.personnelStatus || [])],
      };
    });

    // Merge core activities that aren't already represented in DailyWorkPlanActivity
    coreActivities.forEach((act) => {
      let compName = (act.company?.name || 'GRUPO CASEME').toUpperCase();

      // If user filtered by a specific company, align auto-incorporated activity
      if (company && company !== 'TODAS') {
        const selectedUpper = company.toUpperCase();
        if (!compName.includes(selectedUpper) && !selectedUpper.includes(compName)) {
          // If activity company doesn't match selected company, skip when specific company filtered
          return;
        }
      }

      if (!companyPlanMap[compName]) {
        companyPlanMap[compName] = {
          id: `auto-${compName}`,
          planDate: targetDate,
          companyName: compName,
          status: 'PUBLICADO',
          activities: [],
          personnelStatus: [],
        };
      }

      const existingActs = companyPlanMap[compName].activities;
      const isAlreadyInPlan = existingActs.some(
        (ea: any) => ea.title.toUpperCase().trim() === act.title.toUpperCase().trim()
      );

      if (!isAlreadyInPlan) {
        existingActs.push({
          id: act.id,
          title: act.title,
          type: act.type || 'EJECUCION',
          assignedPersonnel: act.notes || '',
          dayOfWeek: 'LUNES-VIERNES',
          startTime: act.startTime || '08:00 AM',
          clientName: act.client?.name || act.location || 'PLANT/CLIENT',
          supervisorOperativo: act.user?.name || '',
          supervisorCotizador: '',
          supervisorTMMBC: '',
          safetyDedicado: '',
          cotizacionFolio: act.workOrderFolio || '',
          poNumber: act.purchaseOrder || '',
          isCrossSupport: false,
          crossSupportCompany: '',
          notes: act.result || '',
          isAutoIncorporated: true,
        });
      }
    });

    const finalPlans = Object.values(companyPlanMap);

    // 3. Detect Double-Assignment / Overlapping Technician Warnings
    const personMap: Record<string, { companyName: string; activityTitle: string }[]> = {};

    finalPlans.forEach((p: any) => {
      (p.activities || []).forEach((act: any) => {
        if (!act.assignedPersonnel) return;

        const names = act.assignedPersonnel
          .split(/[\n,;]/)
          .map((n: string) => n.trim())
          .filter((n: string) => n.length > 2 && !/^\d+[- ]/.test(n));

        names.forEach((name: string) => {
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
      plans: finalPlans,
      warnings,
    });
  } catch (error: any) {
    console.error('Error in GET /api/plan-diario:', error);
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
    const userAccessCrearPlanes = !!(session.user as any)?.accessCrearPlanes;
    const userEmail = ((session.user as any)?.email || '').toLowerCase().trim();
    const isDirector = ['lopezboyer@gmail.com', 'enrique.lopez.gsi@gmail.com', 'carlos.sevilla@grupocaseme.com', 'carlos.lopez@gsingenieria.mx'].some(
      (e) => userEmail.includes(e.split('@')[0])
    );
    const canEdit = isDirector || ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole) || userAccessCrearPlanes;

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Acceso restringido: Solo Dirección (ADMIN), Administración, Supervisores o usuarios autorizados para Crear Planes pueden modificar el Plan Diario.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { date, companyName, activities, personnelStatus, action, statusType, personNames, notes } = body;

    if (!date || !companyName) {
      return NextResponse.json({ error: 'Fecha y Empresa son requeridas' }, { status: 400 });
    }

    const targetDate = new Date(`${date}T12:00:00.000Z`);

    // Handler para guardar estado específico de personal (DESCANSO, VACACIONES, INCAPACIDAD)
    if (action === 'save-status-type') {
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

      await prisma.dailyWorkPlanPersonnelStatus.deleteMany({
        where: {
          dailyWorkPlanId: plan.id,
          statusType: statusType,
        },
      });

      if (Array.isArray(personNames) && personNames.length > 0) {
        await prisma.dailyWorkPlanPersonnelStatus.createMany({
          data: personNames.map((name: string) => ({
            dailyWorkPlanId: plan.id,
            personName: name,
            statusType: statusType,
            originCompany: companyName,
            notes: notes || null,
          })),
        });
      }

      const startRange = new Date(`${date}T00:00:00.000Z`);
      const endRange = new Date(`${date}T23:59:59.999Z`);
      const updatedStatuses = await prisma.dailyWorkPlanPersonnelStatus.findMany({
        where: {
          dailyWorkPlan: {
            planDate: {
              gte: startRange,
              lte: endRange,
            },
            ...(companyName && companyName !== 'Todas las empresas' ? { companyName } : {}),
          },
          ...(companyName && companyName !== 'Todas las empresas' ? {
            OR: [
              { originCompany: companyName },
              { originCompany: null },
              { originCompany: '' },
            ],
          } : {}),
        },
        orderBy: { personName: 'asc' },
      });

      return NextResponse.json({ ok: true, personnelStatus: updatedStatuses });
    }

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

    const userCanManageSafety = canManageSafetyDedicado(userRole, userEmail);

    // Fetch existing activities if safety protection is needed
    const existingPlanActivities = await prisma.dailyWorkPlanActivity.findMany({
      where: { dailyWorkPlanId: plan.id },
      orderBy: { activityOrder: 'asc' },
    });

    // Resolve Company ID from name
    const companyRecord = await prisma.company.findFirst({
      where: { name: { contains: companyName, mode: 'insensitive' } },
      select: { id: true },
    });

    // Replace activities in DailyWorkPlan AND sync to core Activity table
    if (Array.isArray(activities)) {
      await prisma.dailyWorkPlanActivity.deleteMany({
        where: { dailyWorkPlanId: plan.id },
      });

      if (activities.length > 0) {
        await prisma.dailyWorkPlanActivity.createMany({
          data: activities.map((act: any, idx: number) => {
            const existingAct = existingPlanActivities[idx] || existingPlanActivities.find((ea) => ea.id === act.id);
            const resolvedSafety = userCanManageSafety
              ? act.safetyDedicado || null
              : existingAct?.safetyDedicado || act.safetyDedicado || null;

            return {
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
              safetyDedicado: resolvedSafety,
              cotizacionFolio: act.cotizacionFolio || null,
              poNumber: act.poNumber || null,
              isCrossSupport: Boolean(act.isCrossSupport),
              crossSupportCompany: act.crossSupportCompany || null,
              notes: act.notes || null,
            };
          }),
        });

        // Sync to core Activity model for Perry ecosystem
        for (const act of activities) {
          if (!act.title || !act.title.trim()) continue;
          try {
            await prisma.activity.create({
              data: {
                title: act.title.trim(),
                type: act.type || 'EJECUCION',
                date: targetDate,
                companyId: companyRecord?.id || null,
                workOrderFolio: act.cotizacionFolio || null,
                purchaseOrder: act.poNumber || null,
                startTime: act.startTime || '08:00 AM',
                status: 'PUBLICADO',
                notes: act.assignedPersonnel || null,
                location: act.clientName || null,
              },
            });
          } catch (e) {
            // Ignore duplicate activity sync errors silently
          }
        }
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
        activities: {
          orderBy: { activityOrder: 'asc' },
        },
        personnelStatus: true,
      },
    });

    return NextResponse.json({
      message: 'Plan Diario guardado exitosamente',
      plan: updatedPlan,
    });
  } catch (error: any) {
    console.error('Error in POST /api/plan-diario:', error);
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
    const userAccessCrearPlanes = !!(session.user as any)?.accessCrearPlanes;
    const userEmail = ((session.user as any)?.email || '').toLowerCase().trim();
    const isDirector = ['lopezboyer@gmail.com', 'enrique.lopez.gsi@gmail.com', 'carlos.sevilla@grupocaseme.com', 'carlos.lopez@gsingenieria.mx'].some(
      (e) => userEmail.includes(e.split('@')[0])
    );
    const canDelete = isDirector || ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole) || userAccessCrearPlanes;

    if (!canDelete) {
      return NextResponse.json({ error: 'Acceso restringido para eliminar planes' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json({ error: 'planId es requerido' }, { status: 400 });
    }

    await prisma.dailyWorkPlan.delete({
      where: { id: planId },
    });

    return NextResponse.json({ message: 'Plan Diario eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error in DELETE /api/plan-diario:', error);
    return NextResponse.json({ error: error.message || 'Error eliminando Plan Diario' }, { status: 500 });
  }
}
