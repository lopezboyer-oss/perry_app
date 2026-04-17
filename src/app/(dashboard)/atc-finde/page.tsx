import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AtcFindeClient } from './AtcFindeClient';
import { getTijuanaDayOfWeek, getTijuanaToday, parseLocalDate } from '@/lib/timezone';

/**
 * Calcula las fechas del Sábado y Domingo del fin de semana inmediato,
 * usando la zona horaria de Tijuana como referencia.
 *
 * - Lun-Vie → el próximo Sáb y Dom
 * - Sábado  → hoy (Sáb) y mañana (Dom)
 * - Domingo → ayer (Sáb) y hoy (Dom)
 */
function getImmediateWeekendDates(): { saturday: string; sunday: string } {
  const todayStr = getTijuanaToday(); // "YYYY-MM-DD"
  const today = new Date(`${todayStr}T12:00:00`);
  const dow = today.getDay(); // 0=Sun … 6=Sat

  let satOffset: number;
  if (dow === 6) satOffset = 0;        // Today is Saturday
  else if (dow === 0) satOffset = -1;   // Today is Sunday → Saturday was yesterday
  else satOffset = 6 - dow;             // Mon(1)→5, Tue(2)→4 … Fri(5)→1

  const saturday = new Date(today);
  saturday.setDate(today.getDate() + satOffset);

  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
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

  // Build where clause based on role
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

  // Only fetch activities whose date falls on THIS Saturday or Sunday
  const satStart = new Date(satDate); satStart.setHours(0, 0, 0, 0);
  const sunEnd = new Date(sunDate); sunEnd.setHours(23, 59, 59, 999);
  where.date = { gte: satStart, lte: sunEnd };

  const [activities, users] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        opportunity: { select: { id: true, folio: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.user.findMany({
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <AtcFindeClient
      activities={activities.map((a) => ({
        ...a,
        date: a.date.toISOString(),
      }))}
      users={users}
      userRole={role}
      weekendLabel={`${saturday} — ${sunday}`}
    />
  );
}
