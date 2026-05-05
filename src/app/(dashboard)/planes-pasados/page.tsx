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

  if (selectedWeekend) {
    // Get extra days for this plan
    const extraDays = await prisma.extraPlanDay.findMany({
      where: { weekendOf: selectedWeekend },
      orderBy: { date: 'asc' },
    });

    // Build all dates: Saturday, Sunday + extra days
    const satDate = new Date(`${selectedWeekend}T00:00:00Z`);
    const sunDateStr = (() => {
      const d = new Date(satDate);
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();
    const allDates = [...new Set([selectedWeekend, sunDateStr, ...extraDays.map(d => d.date)])];
    allDates.sort();

    // Build date ranges for query
    const dateRanges = allDates.map(dateStr => {
      const d = new Date(`${dateStr}T00:00:00Z`);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      return { date: { gte: start, lte: end } };
    });

    [activities, techAssignments, safetyAssignments, vehicleAssignments, driverAssignments, equipAssignments] = await Promise.all([
      prisma.activity.findMany({
        where: { OR: dateRanges, ...companyFilter },
        include: {
          user: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true } },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      }),
      prisma.weekendTechAssignment.findMany({ where: { weekendOf: selectedWeekend }, include: { technician: true } }),
      prisma.weekendSafetyAssignment.findMany({ where: { weekendOf: selectedWeekend }, include: { safetyDedicado: true } }),
      prisma.weekendVehicleAssignment.findMany({ where: { weekendOf: selectedWeekend }, include: { vehicle: true } }),
      prisma.weekendDriverAssignment.findMany({ where: { weekendOf: selectedWeekend }, include: { driver: true } }),
      prisma.weekendEquipAssignment.findMany({ where: { weekendOf: selectedWeekend }, include: { equip: true } }),
    ]);
  }

  return (
    <PlanesPasadosClient
      weekendDates={weekendDates}
      selectedWeekend={selectedWeekend}
      activities={activities.map((a: any) => ({ ...a, date: a.date.toISOString() }))}
      techAssignments={techAssignments}
      safetyAssignments={safetyAssignments}
      vehicleAssignments={vehicleAssignments}
      driverAssignments={driverAssignments}
      equipAssignments={equipAssignments}
      userRole={role}
      userId={session.user.id}
    />
  );
}
