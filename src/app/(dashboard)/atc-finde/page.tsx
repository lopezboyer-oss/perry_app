import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AtcFindeClient } from './AtcFindeClient';

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

  // Filter mathematically strictly for weekends (0 = Sunday, 6 = Saturday)
  const weekendActivities = activities.filter((a) => {
    const dow = a.date.getUTCDay();
    return dow === 0 || dow === 6;
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
