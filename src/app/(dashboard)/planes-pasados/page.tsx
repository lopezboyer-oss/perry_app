import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PlanesPasadosClient } from './PlanesPasadosClient';

export default async function PlanesPasadosPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  const selectedWeekend = searchParams.weekend || '';

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
    const satDate = new Date(`${selectedWeekend}T00:00:00Z`);
    const sunDate = new Date(satDate);
    sunDate.setDate(sunDate.getDate() + 1);
    const sunEnd = new Date(sunDate);
    sunEnd.setHours(23, 59, 59, 999);

    [activities, techAssignments, safetyAssignments, vehicleAssignments, driverAssignments, equipAssignments] = await Promise.all([
      prisma.activity.findMany({
        where: { date: { gte: satDate, lte: sunEnd } },
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
