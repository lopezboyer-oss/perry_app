import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AnaliticaClient } from './AnaliticaClient';

export default async function AnaliticaPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  const userId = session.user.id;

  let userFilter: any = {};
  if (role === 'INGENIERO') {
    userFilter = { userId };
  } else if (role === 'SUPERVISOR') {
    const team = await prisma.user.findMany({
      where: { supervisorId: userId },
      select: { id: true },
    });
    userFilter = { userId: { in: [userId, ...team.map((u) => u.id)] } };
  }

  // Activities by type with hours
  const byType = await prisma.activity.groupBy({
    by: ['type'],
    _count: { id: true },
    _sum: { durationMinutes: true },
    where: userFilter,
  });

  // Activities by month
  const allActivities = await prisma.activity.findMany({
    where: userFilter,
    select: { date: true, type: true, durationMinutes: true },
    orderBy: { date: 'asc' },
  });

  const monthlyData: Record<string, Record<string, number>> = {};
  allActivities.forEach((a) => {
    const month = a.date.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) monthlyData[month] = {};
    monthlyData[month][a.type] = (monthlyData[month][a.type] || 0) + 1;
  });

  // Activities by user
  const byUser = await prisma.activity.groupBy({
    by: ['userId'],
    _count: { id: true },
    _sum: { durationMinutes: true },
    where: userFilter,
  });

  const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));

  // Opportunity metrics
  const oppsWithLeadTime = await prisma.opportunity.findMany({
    where: {
      ...userFilter,
      actualVisitDate: { not: null },
      quotationSentDate: { not: null },
    },
    select: { actualVisitDate: true, quotationSentDate: true, status: true },
  });

  const oppsWithVisitDelay = await prisma.opportunity.findMany({
    where: {
      ...userFilter,
      scheduledVisitDate: { not: null },
      actualVisitDate: { not: null },
    },
    select: { scheduledVisitDate: true, actualVisitDate: true },
  });

  const totalVisits = await prisma.opportunity.count({
    where: { ...userFilter, actualVisitDate: { not: null } },
  });

  const totalQuotations = await prisma.opportunity.count({
    where: { ...userFilter, quotationSentDate: { not: null } },
  });

  const wonOpps = await prisma.opportunity.count({
    where: { ...userFilter, status: 'GANADA' },
  });

  // Calculate averages
  let avgLeadTime = 0;
  if (oppsWithLeadTime.length > 0) {
    const total = oppsWithLeadTime.reduce((sum, o) => {
      return sum + Math.ceil((o.quotationSentDate!.getTime() - o.actualVisitDate!.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    avgLeadTime = Math.round(total / oppsWithLeadTime.length);
  }

  let avgVisitDelay = 0;
  if (oppsWithVisitDelay.length > 0) {
    const total = oppsWithVisitDelay.reduce((sum, o) => {
      return sum + Math.ceil((o.actualVisitDate!.getTime() - o.scheduledVisitDate!.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    avgVisitDelay = Math.round(total / oppsWithVisitDelay.length);
  }

  const data = {
    byType: byType.map((g) => ({
      type: g.type,
      count: g._count.id,
      hours: Math.round((g._sum.durationMinutes || 0) / 60),
    })),
    monthlyData: Object.entries(monthlyData).map(([month, types]) => ({
      month,
      ...types,
    })),
    byUser: byUser.map((g) => ({
      userName: userMap[g.userId] || 'Desconocido',
      count: g._count.id,
      hours: Math.round((g._sum.durationMinutes || 0) / 60),
    })),
    avgLeadTime,
    avgVisitDelay,
    conversionRate: totalVisits > 0 ? Math.round((totalQuotations / totalVisits) * 100) : 0,
    winRate: totalQuotations > 0 ? Math.round((wonOpps / totalQuotations) * 100) : 0,
    totalVisits,
    totalQuotations,
    wonOpps,
  };

  return <AnaliticaClient data={data} />;
}
