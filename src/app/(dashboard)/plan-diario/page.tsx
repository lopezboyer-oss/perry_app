import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PlanDiarioClient } from './PlanDiarioClient';
import { getTijuanaToday, parseLocalDate } from '@/lib/timezone';
import { getCompanyFilterFromCookies } from '@/lib/company-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Plan Diario de Trabajo | Perry App',
  description: 'Control de actividades diarias, recursos asignados y trazabilidad operativa de Perry.',
};

export default async function PlanDiarioPage({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  const userId = session.user.id;
  
  // Today's date by default (e.g. "2026-08-27") or requested query parameter date
  const todayStr = getTijuanaToday();
  const selectedDateStr = searchParams?.date || todayStr;

  // Range for query — Selected date (start of day to end of day)
  const d = parseLocalDate(selectedDateStr);
  const startOfDay = new Date(d); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(d); endOfDay.setHours(23, 59, 59, 999);
  
  const dateRanges = [{ date: { gte: startOfDay, lte: endOfDay } }];

  const companyFilter = await getCompanyFilterFromCookies(role, userId);
  const activeCompanyId = (companyFilter as any).companyId || null;
  let companyName = 'Todas las empresas';
  if (activeCompanyId) {
    const co = await prisma.company.findUnique({ where: { id: activeCompanyId }, select: { name: true } });
    if (co) companyName = co.name;
  }

  let where: any = {
    AND: [
      { OR: dateRanges }
    ]
  };

  if (role === 'TECNICO') {
    const tech = await prisma.technician.findFirst({
      where: { linkedUserId: userId },
      select: { id: true }
    });
    if (tech) {
      where.AND.push({
        OR: [
          companyFilter,
          {
            weekendTechAssignments: {
              some: {
                technicianId: tech.id
              }
            }
          }
        ]
      });
    } else {
      where.AND.push(companyFilter);
    }
  } else {
    where.AND.push(companyFilter);
  }

  // All-company activities for cross-company view for today
  const allCompanyWhere = { OR: dateRanges };

  const [
    activities, technicians, safetyDedicados,
    vehicles, drivers, elevationEquips,
    techAssignments, safetyAssignments,
    vehicleAssignments, driverAssignments, equipAssignments,
    safetyDesignadoUsers, userSafetyAssignments, supervisorAssignments,
    allCompanyActivities, allPersonnelUsers, initialPersonnelStatusList,
  ] = await Promise.all([
    prisma.activity.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        date: true,
        startTime: true,
        endTime: true,
        actualStartTime: true,
        actualEndTime: true,
        workOrderFolio: true,
        purchaseOrder: true,
        loto: true,
        weekendNotes: true,
        auditNotes: true,
        alertNotes: true,
        safetyAuditImage: true,
        teraFolio: true,
        teraUploadedAt: true,
        teraUploadedBy: true,
        teraAuditorFolio: true,
        teraAuditorUploadedAt: true,
        teraAuditorUploadedBy: true,
        teraAuditorImage: true,
        teraExempt: true,
        teraExemptBy: true,
        continuedFromId: true,
        cancelledBy: true,
        cancelReason: true,
        cancelNotes: true,
        multiDayGroupId: true,
        multiDayIndex: true,
        multiDayTotalDays: true,
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        timeRegistryEntries: { select: { id: true, phase: true, time: true, registeredBy: true, userId: true, registeredAt: true }, orderBy: { registeredAt: 'asc' } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
    }),
    prisma.technician.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        isCruzVerde: true,
        phone: true,
        contractorId: true,
        contractor: { select: { id: true, name: true } },
        baseCompany: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.safetyDedicado.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.vehicle.findMany({ where: { isActive: true, isAvailable: true }, orderBy: { name: 'asc' } }),
    prisma.driver.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.elevationEquip.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.weekendTechAssignment.findMany({ where: { weekendOf: selectedDateStr }, include: { technician: true } }),
    prisma.weekendSafetyAssignment.findMany({ where: { weekendOf: selectedDateStr }, include: { safetyDedicado: true } }),
    prisma.weekendVehicleAssignment.findMany({ where: { weekendOf: selectedDateStr }, include: { vehicle: true } }),
    prisma.weekendDriverAssignment.findMany({ where: { weekendOf: selectedDateStr }, include: { driver: true } }),
    prisma.weekendEquipAssignment.findMany({ where: { weekendOf: selectedDateStr }, include: { equip: true } }),
    prisma.user.findMany({ where: { isActive: true, isSafetyDesignado: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.weekendUserSafetyAssignment.findMany({ where: { weekendOf: selectedDateStr }, include: { user: { select: { id: true, name: true } } } }),
    prisma.weekendSupervisorAssignment.findMany({ where: { weekendOf: selectedDateStr }, include: { user: { select: { id: true, name: true, role: true } } } }),
    prisma.activity.findMany({
      where: allCompanyWhere,
      select: {
        id: true, title: true, type: true, status: true, date: true,
        startTime: true, endTime: true, loto: true, weekendNotes: true,
        workOrderFolio: true, purchaseOrder: true,
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        baseCompany: { select: { name: true } },
        companies: {
          select: { company: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.dailyWorkPlanPersonnelStatus.findMany({
      where: {
        dailyWorkPlan: {
          planDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          ...(companyName !== 'Todas las empresas' ? { companyName } : {}),
        },
        ...(companyName !== 'Todas las empresas' ? {
          originCompany: companyName,
        } : {}),
      },
      orderBy: { personName: 'asc' },
    }),
  ]);

  const planDays = [
    {
      date: todayStr,
      isExtra: false,
      extraId: null,
      label: 'HOY',
      hasActivities: activities.length > 0,
    },
  ];

  // Precompute cross-company conflicts for today
  const preloadedConflicts: Record<string, string[]> = {};
  const allActMap = new Map(allCompanyActivities.map(a => [a.id, a]));

  function timesOverlap(s1: string | null, e1: string | null, s2: string | null, e2: string | null): boolean {
    if (!s1 || !e1 || !s2 || !e2) return true;
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    let a = toMin(s1), b = toMin(e1), c = toMin(s2), d = toMin(e2);
    if (b <= a) b += 1440;
    if (d <= c) d += 1440;
    return a < d && c < b;
  }

  const techsByTech = new Map<string, typeof techAssignments>();
  techAssignments.forEach(ta => {
    const arr = techsByTech.get(ta.technicianId) || [];
    arr.push(ta);
    techsByTech.set(ta.technicianId, arr);
  });
  techsByTech.forEach((assignments, techId) => {
    if (assignments.length < 2) return;
    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const a1 = allActMap.get(assignments[i].activityId);
        const a2 = allActMap.get(assignments[j].activityId);
        if (!a1 || !a2) continue;
        const d1 = a1.date.toISOString().substring(0, 10);
        const d2 = a2.date.toISOString().substring(0, 10);
        if (d1 !== d2) continue;
        if (timesOverlap(a1.startTime, a1.endTime, a2.startTime, a2.endTime)) {
          const co1 = a1.company?.name || '';
          const co2 = a2.company?.name || '';
          const key1 = `${assignments[i].activityId}-${techId}`;
          const key2 = `${assignments[j].activityId}-${techId}`;
          if (!preloadedConflicts[key1]) preloadedConflicts[key1] = [];
          if (!preloadedConflicts[key2]) preloadedConflicts[key2] = [];
          preloadedConflicts[key1].push(`⚠️ "${a2.title}" (${a2.startTime || '?'} - ${a2.endTime || '?'}) [${co2}]`);
          preloadedConflicts[key2].push(`⚠️ "${a1.title}" (${a1.startTime || '?'} - ${a1.endTime || '?'}) [${co1}]`);
        }
      }
    }
  });

  return (
    <PlanDiarioClient
      activities={activities.map((a) => ({
        ...a,
        date: a.date.toISOString(),
        teraUploadedAt: a.teraUploadedAt?.toISOString() || null,
        teraAuditorUploadedAt: a.teraAuditorUploadedAt?.toISOString() || null,
        timeRegistryEntries: (a.timeRegistryEntries || []).map(e => ({ ...e, registeredAt: e.registeredAt.toISOString() })),
      }))}
      technicians={JSON.parse(JSON.stringify(technicians))}
      safetyDedicados={JSON.parse(JSON.stringify(safetyDedicados))}
      vehicles={JSON.parse(JSON.stringify(vehicles))}
      drivers={JSON.parse(JSON.stringify(drivers))}
      elevationEquips={JSON.parse(JSON.stringify(elevationEquips))}
      techAssignments={JSON.parse(JSON.stringify(techAssignments))}
      safetyAssignments={JSON.parse(JSON.stringify(safetyAssignments))}
      vehicleAssignments={JSON.parse(JSON.stringify(vehicleAssignments))}
      driverAssignments={JSON.parse(JSON.stringify(driverAssignments))}
      equipAssignments={JSON.parse(JSON.stringify(equipAssignments))}
      safetyDesignadoUsers={JSON.parse(JSON.stringify(safetyDesignadoUsers))}
      userSafetyAssignments={JSON.parse(JSON.stringify(userSafetyAssignments))}
      supervisorAssignments={JSON.parse(JSON.stringify(supervisorAssignments))}
      userRole={role}
      userId={userId}
      userName={session.user.name || 'Desconocido'}
      currentUserEmail={session.user.email || ''}
      userAccessCrearPlanes={!!(session.user as any).accessCrearPlanes}
      weekendOf={selectedDateStr}
      weekendLabel={`Plan Diario del ${selectedDateStr}`}
      planDays={planDays}
      companyName={companyName}
      userIsSafetyAuditor={!!(session.user as any).isSafetyAuditor}
      allCompanyActivities={allCompanyActivities.map(a => ({
        ...a,
        date: a.date.toISOString(),
        companyName: a.company?.name || companyName,
      }))}
      preloadedConflicts={preloadedConflicts}
      allPersonnelUsers={allPersonnelUsers.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        companyName: u.baseCompany?.name || u.companies?.[0]?.company?.name || null,
      }))}
      initialPersonnelStatusList={initialPersonnelStatusList.map(ps => ({
        id: ps.id,
        personName: ps.personName,
        statusType: ps.statusType,
        originCompany: ps.originCompany,
        notes: ps.notes,
      }))}
    />
  );
}
