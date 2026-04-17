import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AtcFindeClient } from './AtcFindeClient';
import { getTijuanaDayOfWeek } from '@/lib/timezone';

export default async function AtcFindePage() {
  const session = await auth();
  if (!session) redirect('/login');

  const userId = session.user.id;
  const role = session.user.role;

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

  // We only fetch recent and future activities to avoid massive payload
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  where.date = { gte: thirtyDaysAgo };

  const [activities, users] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        opportunity: { select: { id: true, folio: true } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Filter strictly for weekends using Tijuana timezone (6 = Saturday, 0 = Sunday)
  const weekendActivities = activities
    .filter((a) => {
      const dow = getTijuanaDayOfWeek(a.date);
      return dow === 0 || dow === 6;
    })
    .sort((a, b) => {
      // 1. Sort by date ascending
      const dateA = a.date.getTime();
      const dateB = b.date.getTime();
      if (dateA !== dateB) return dateA - dateB;

      // 2. Within same date: Saturday (6) before Sunday (0)
      const dowA = getTijuanaDayOfWeek(a.date);
      const dowB = getTijuanaDayOfWeek(b.date);
      if (dowA !== dowB) return dowB - dowA; // 6 (Sat) comes before 0 (Sun)

      // 3. Within same day: sort by startTime ascending
      const timeA = a.startTime || '99:99'; // No time goes to the bottom
      const timeB = b.startTime || '99:99';
      return timeA.localeCompare(timeB);
    });

  return (
    <AtcFindeClient
      activities={weekendActivities.map((a) => ({
        ...a,
        date: a.date.toISOString(),
      }))}
      users={users}
      userRole={role}
    />
  );
}

