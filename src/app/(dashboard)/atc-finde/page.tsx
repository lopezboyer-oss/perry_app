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

  const userId = session.user.id;
  const role = session.user.role;

  const { saturday, sunday } = getImmediateWeekendDates();
  const satDate = parseLocalDate(saturday);
  const sunDate = parseLocalDate(sunday);

  const where: any = {};
  if (role === 'INGENIERO') {
    where.userId = userId;
  } else if (role === 'SUPERVISOR') {
    const team = await prisma.user.findMany({
      where: { supervisorId: userId },
      select: { id: true },
    });
    where.userId = { in: [userId, ...team.map((u) => u.id)] };
  }
  // ADMIN and SUPERVISOR_SAFETY_LP see all

  const satStart = new Date(satDate); satStart.setHours(0, 0, 0, 0);
  const sunEnd = new Date(sunDate); sunEnd.setHours(23, 59, 59, 999);
  where.date = { gte: satStart, lte: sunEnd };

  const [activities, technicians, safetyDedicados, techAssignments, safetyAssignments] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        opportunity: { select: { id: true, folio: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.technician.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.safetyDedicado.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.weekendTechAssignment.findMany({
      where: { weekendOf: saturday },
      include: { technician: true },
    }),
    prisma.weekendSafetyAssignment.findMany({
      where: { weekendOf: saturday },
      include: { safetyDedicado: true },
    }),
  ]);

  return (
    <AtcFindeClient
      activities={activities.map((a) => ({
        ...a,
        date: a.date.toISOString(),
      }))}
      technicians={technicians}
      safetyDedicados={safetyDedicados}
      techAssignments={techAssignments}
      safetyAssignments={safetyAssignments}
      userRole={role}
      weekendOf={saturday}
      weekendLabel={`${saturday} — ${sunday}`}
    />
  );
}
