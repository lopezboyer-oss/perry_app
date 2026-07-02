import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardClienteClient } from './DashboardClienteClient';
import { getTijuanaToday, parseLocalDate } from '@/lib/timezone';
import { getCompanyFilterFromCookies } from '@/lib/company-context';

export const dynamic = 'force-dynamic';

function getCurrentWeekAndSaturday(): { allWeekDates: string[]; saturdayStr: string } {
  const todayStr = getTijuanaToday();
  const today = new Date(`${todayStr}T12:00:00`);
  const dow = today.getDay(); // 0 is Sunday, 1 is Monday
  const mondayOffset = dow === 0 ? -6 : 1 - dow;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const allWeekDates: string[] = [];
  let saturdayStr = '';
  for(let i=0; i<7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const str = `${y}-${m}-${day}`;
    allWeekDates.push(str);
    if (d.getDay() === 6) saturdayStr = str;
  }
  return { allWeekDates, saturdayStr };
}

export default async function DashboardClientePage() {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  const userId = session.user.id;
  const { allWeekDates, saturdayStr: saturday } = getCurrentWeekAndSaturday();

  // Get extra days for this weekend's plan (if any)
  const extraDays = await prisma.extraPlanDay.findMany({
    where: { weekendOf: saturday },
    orderBy: { date: 'asc' },
  });

  // Build all plan dates: whole week + extra days
  const allDates = [...new Set([...allWeekDates, ...extraDays.map(d => d.date)])];
  allDates.sort();

  // Build date ranges for the query — union of all day ranges
  const dateRanges = allDates.map(dateStr => {
    const d = parseLocalDate(dateStr);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    return { date: { gte: start, lte: end } };
  });

  const companyFilter = await getCompanyFilterFromCookies(role, userId);
  const activeCompanyId = (companyFilter as any).companyId || null;
  let companyName = 'Todas las empresas';
  if (activeCompanyId) {
    const co = await prisma.company.findUnique({ where: { id: activeCompanyId }, select: { name: true } });
    if (co) companyName = co.name;
  }

  // Get Man Power IDs using raw query to bypass missing prisma schema generation cache
  const rawManPowerIds = await prisma.$queryRaw<{id: string}>`SELECT id FROM "Activity" WHERE "isManPower" = true`;
  const manPowerIds = rawManPowerIds.map(r => r.id);

  let where: any = {
    AND: [
      { id: { in: manPowerIds } },
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

  // For tech/contractor plans: fetch ALL weekend activities across all companies
  const allCompanyWhere = { OR: dateRanges };

  const [
    activities, technicians, safetyDedicados,
    vehicles, drivers, elevationEquips,
    techAssignments, safetyAssignments,
    vehicleAssignments, driverAssignments, equipAssignments,
    safetyDesignadoUsers, userSafetyAssignments,
    allCompanyActivities,
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
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        parts: true,
        timeRegistryEntries: { select: { id: true, phase: true, time: true, registeredBy: true, userId: true, registeredAt: true }, orderBy: { registeredAt: 'asc' } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
    }),
    prisma.technician.findMany({ where: { isActive: true }, select: { id: true, name: true, type: true, isCruzVerde: true, phone: true, contractorId: true, contractor: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } }),
    prisma.safetyDedicado.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.vehicle.findMany({ where: { isActive: true, isAvailable: true }, orderBy: { name: 'asc' } }),
    prisma.driver.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.elevationEquip.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.weekendTechAssignment.findMany({ where: { activityId: { in: manPowerIds } }, include: { technician: true } }),
    prisma.weekendSafetyAssignment.findMany({ where: { activityId: { in: manPowerIds } }, include: { safetyDedicado: true } }),
    prisma.weekendVehicleAssignment.findMany({ where: { activityId: { in: manPowerIds } }, include: { vehicle: true } }),
    prisma.weekendDriverAssignment.findMany({ where: { activityId: { in: manPowerIds } }, include: { driver: true } }),
    prisma.weekendEquipAssignment.findMany({ where: { activityId: { in: manPowerIds } }, include: { equip: true } }),
    prisma.user.findMany({ where: { isActive: true, isSafetyDesignado: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.weekendUserSafetyAssignment.findMany({ where: { activityId: { in: manPowerIds } }, include: { user: { select: { id: true, name: true } } } }),
    // All-company activities for tech/contractor plans
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
  ]);

  // Build plan days info for client
  const planDays = allDates.map(dateStr => {
    const isExtra = extraDays.some(d => d.date === dateStr);
    const extraInfo = extraDays.find(d => d.date === dateStr);
    const dayActivities = activities.filter(a => a.date.toISOString().startsWith(dateStr));
    return {
      date: dateStr,
      isExtra,
      extraId: extraInfo?.id || null,
      label: extraInfo?.label || null,
      hasActivities: dayActivities.length > 0,
    };
  });

  // Build weekend label from visible days
  const visibleDays = planDays.filter(d => d.hasActivities || d.isExtra);
  const weekendLabel = visibleDays.length > 0
    ? visibleDays.map(d => d.date).join(' — ')
    : `${allWeekDates[0]} — ${allWeekDates[allWeekDates.length - 1]}`;

  // Precompute cross-company conflicts for all tech assignments
  const preloadedConflicts: Record<string, string[]> = {};
  const allActMap = new Map(allCompanyActivities.map(a => [a.id, a]));

  function timesOverlap(s1: string | null, e1: string | null, s2: string | null, e2: string | null): boolean {
    if (!s1 || !e1 || !s2 || !e2) return true;
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    let a = toMin(s1), b = toMin(e1), c = toMin(s2), d = toMin(e2);
    if (b <= a) b += 1440; // overnight
    if (d <= c) d += 1440;
    return a < d && c < b;
  }

  // Check tech conflicts
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
    <DashboardClienteClient
      activities={activities.map((a) => ({
        ...a,
        date: a.date.toISOString(),
        teraUploadedAt: a.teraUploadedAt?.toISOString() || null,
        teraAuditorUploadedAt: a.teraAuditorUploadedAt?.toISOString() || null,
        timeRegistryEntries: a.timeRegistryEntries.map(e => ({ ...e, registeredAt: e.registeredAt.toISOString() })),
      }))}
      technicians={technicians}
      safetyDedicados={safetyDedicados}
      vehicles={vehicles}
      drivers={drivers}
      elevationEquips={elevationEquips}
      techAssignments={techAssignments}
      safetyAssignments={safetyAssignments}
      vehicleAssignments={vehicleAssignments}
      driverAssignments={driverAssignments}
      equipAssignments={equipAssignments}
      safetyDesignadoUsers={safetyDesignadoUsers}
      userSafetyAssignments={userSafetyAssignments}
      userRole={role}
      userId={userId}
      userName={session.user.name || 'Desconocido'}
      currentUserEmail={session.user.email || ''}
      weekendOf={saturday}
      weekendLabel={weekendLabel}
      planDays={planDays}
      companyName={companyName}
      userIsSafetyAuditor={!!(session.user as any).isSafetyAuditor}
      allCompanyActivities={allCompanyActivities.map(a => ({
        ...a,
        date: a.date.toISOString(),
        companyName: a.company?.name || companyName,
      }))}
      preloadedConflicts={preloadedConflicts}
    />
  );
}
