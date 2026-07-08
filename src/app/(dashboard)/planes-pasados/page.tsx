import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PlanesPasadosClient } from './PlanesPasadosClient';
import { getCompanyFilterFromCookies } from '@/lib/company-context';

export const dynamic = 'force-dynamic';

export default async function PlanesPasadosPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  const selectedWeekend = searchParams.weekend || '';
  const companyFilter = await getCompanyFilterFromCookies(role, session.user.id);

  // Get all distinct weekendOf values from assignments (past plans)
  const weekends = await prisma.weekendTechAssignment.findMany({
    select: { weekendOf: true },
    distinct: ['weekendOf'],
    orderBy: { weekendOf: 'desc' },
  });
  const weekendDates = weekends.map((w) => w.weekendOf);

  // If a weekend is selected, load that plan
  let activities: any[] = [];
  let techAssignments: any[] = [];
  let safetyAssignments: any[] = [];
  let vehicleAssignments: any[] = [];
  let driverAssignments: any[] = [];
  let equipAssignments: any[] = [];
  let userSafetyAssignments: any[] = [];

  if (selectedWeekend) {
    // Get extra days for this plan
    const extraDays = await prisma.extraPlanDay.findMany({
      where: { weekendOf: selectedWeekend },
      orderBy: { date: 'asc' },
    });

    // Build all dates: Saturday, Sunday + extra days
    const [y, m, d] = selectedWeekend.split('-').map(Number);
    const satDate = new Date(y, m - 1, d);
    const sunDateStr = (() => {
      const sun = new Date(satDate);
      sun.setDate(sun.getDate() + 1);
      return `${sun.getFullYear()}-${String(sun.getMonth()+1).padStart(2,'0')}-${String(sun.getDate()).padStart(2,'0')}`;
    })();
    const allDates = [...new Set([selectedWeekend, sunDateStr, ...extraDays.map(dayInfo => dayInfo.date)])];
    allDates.sort();

    // Build date ranges for query
    const dateRanges = allDates.map(dateStr => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const start = new Date(year, month - 1, day, 0, 0, 0, 0);
      const end = new Date(year, month - 1, day, 23, 59, 59, 999);
      return { date: { gte: start, lte: end } };
    });

    [activities, techAssignments, safetyAssignments, vehicleAssignments, driverAssignments, equipAssignments, userSafetyAssignments] = await Promise.all([
      prisma.activity.findMany({
        where: { OR: dateRanges, ...companyFilter },
        include: {
          user: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true } },
          timeRegistryEntries: { select: { id: true, phase: true, time: true, registeredBy: true, userId: true, registeredAt: true }, orderBy: { registeredAt: 'asc' } },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      }),
      prisma.weekendTechAssignment.findMany({ where: { weekendOf: selectedWeekend }, include: { technician: true } }),
      prisma.weekendSafetyAssignment.findMany({ where: { weekendOf: selectedWeekend }, include: { safetyDedicado: true } }),
      prisma.weekendVehicleAssignment.findMany({ where: { weekendOf: selectedWeekend }, include: { vehicle: true } }),
      prisma.weekendDriverAssignment.findMany({ where: { weekendOf: selectedWeekend }, include: { driver: true } }),
      prisma.weekendEquipAssignment.findMany({ where: { weekendOf: selectedWeekend }, include: { equip: true } }),
      prisma.weekendUserSafetyAssignment.findMany({ where: { weekendOf: selectedWeekend }, include: { user: { select: { id: true, name: true } } } }),
    ]);
  }

  return (
    <PlanesPasadosClient
      weekendDates={weekendDates}
      selectedWeekend={selectedWeekend}
      activities={activities.map((a: any) => ({ ...a, date: a.date.toISOString(), teraUploadedAt: a.teraUploadedAt?.toISOString() || null, teraAuditorUploadedAt: a.teraAuditorUploadedAt?.toISOString() || null, timeRegistryEntries: (a.timeRegistryEntries || []).map((e: any) => ({ ...e, registeredAt: e.registeredAt?.toISOString() || '' })) }))}
      techAssignments={techAssignments}
      safetyAssignments={safetyAssignments}
      vehicleAssignments={vehicleAssignments}
      driverAssignments={driverAssignments}
      equipAssignments={equipAssignments}
      userSafetyAssignments={userSafetyAssignments}
      userRole={role}
      userId={session.user.id}
      userName={session.user.name || 'Desconocido'}
      userIsSafetyAuditor={!!(session.user as any).isSafetyAuditor}
      currentUserEmail={session.user.email || ''}
    />
  );
}
