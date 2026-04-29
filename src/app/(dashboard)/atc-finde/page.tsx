import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AtcFindeClient } from './AtcFindeClient';
import { getTijuanaToday, parseLocalDate } from '@/lib/timezone';

function getImmediateWeekendDates(): { saturday: string; sunday: string } {
  const todayStr = getTijuanaToday();
  const today = new Date(`${todayStr}T12:00:00`);
  const dow = today.getDay();

  let satOffset: number;
  if (dow === 6) satOffset = 0;
  else if (dow === 0) satOffset = -1;
  else satOffset = 6 - dow;

  const saturday = new Date(today);
  saturday.setDate(today.getDate() + satOffset);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { saturday: fmt(saturday), sunday: fmt(sunday) };
}

export default async function AtcFindePage() {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  const userId = session.user.id;
  const { saturday, sunday } = getImmediateWeekendDates();
  const satDate = parseLocalDate(saturday);
  const sunDate = parseLocalDate(sunday);

  // ALL users see ALL activities in ATC Finde (no user/team filter)
  const satStart = new Date(satDate); satStart.setHours(0, 0, 0, 0);
  const sunEnd = new Date(sunDate); sunEnd.setHours(23, 59, 59, 999);
  const where = { date: { gte: satStart, lte: sunEnd } };

  const [
    activities, technicians, safetyDedicados,
    vehicles, drivers, elevationEquips,
    techAssignments, safetyAssignments,
    vehicleAssignments, driverAssignments, equipAssignments,
    safetyDesignadoUsers, userSafetyAssignments,
  ] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.technician.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.safetyDedicado.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.vehicle.findMany({ where: { isActive: true, isAvailable: true }, orderBy: { name: 'asc' } }),
    prisma.driver.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.elevationEquip.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.weekendTechAssignment.findMany({ where: { weekendOf: saturday }, include: { technician: true } }),
    prisma.weekendSafetyAssignment.findMany({ where: { weekendOf: saturday }, include: { safetyDedicado: true } }),
    prisma.weekendVehicleAssignment.findMany({ where: { weekendOf: saturday }, include: { vehicle: true } }),
    prisma.weekendDriverAssignment.findMany({ where: { weekendOf: saturday }, include: { driver: true } }),
    prisma.weekendEquipAssignment.findMany({ where: { weekendOf: saturday }, include: { equip: true } }),
    prisma.user.findMany({ where: { isActive: true, isSafetyDesignado: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.weekendUserSafetyAssignment.findMany({ where: { weekendOf: saturday }, include: { user: { select: { id: true, name: true } } } }),
  ]);

  return (
    <AtcFindeClient
      activities={activities.map((a) => ({
        ...a,
        date: a.date.toISOString(),
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
      weekendOf={saturday}
      weekendLabel={`${saturday} — ${sunday}`}
    />
  );
}
