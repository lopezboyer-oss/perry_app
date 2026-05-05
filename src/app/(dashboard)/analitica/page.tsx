import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AnaliticaClient } from './AnaliticaClient';
import { getCompanyFilterFromCookies } from '@/lib/company-context';

export const dynamic = 'force-dynamic';

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

  // Company filter
  const companyFilter = await getCompanyFilterFromCookies(role, userId);
  const baseFilter = { ...userFilter, ...companyFilter };

  // Activities by type with hours
  const byType = await prisma.activity.groupBy({
    by: ['type'],
    _count: { id: true },
    _sum: { durationMinutes: true },
    where: baseFilter,
  });

  // Activities by month
  const allActivities = await prisma.activity.findMany({
    where: baseFilter,
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
    where: baseFilter,
  });

  const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));

  // Opportunity metrics — derived from COTIZACION activities grouped by folio
  const cotizaciones = await prisma.activity.findMany({
    where: { ...baseFilter, type: 'COTIZACION' },
    select: { workOrderFolio: true, status: true, date: true },
    orderBy: { date: 'asc' },
  });

  // Group by folio
  const folioMap = new Map<string, typeof cotizaciones>();
  for (const a of cotizaciones) {
    const key = a.workOrderFolio || `_nf_${a.date.toISOString()}`;
    if (!folioMap.has(key)) folioMap.set(key, []);
    folioMap.get(key)!.push(a);
  }

  const leadTimes: number[] = [];
  let totalCotizaciones = 0;
  let completadas = 0;
  let enProgreso = 0;

  for (const acts of folioMap.values()) {
    totalCotizaciones++;
    const start = acts.find(a => a.status === 'EN_PROGRESO');
    const end = acts.find(a => a.status === 'COMPLETADA');
    if (end) completadas++;
    if (acts.some(a => a.status === 'EN_PROGRESO') && !end) enProgreso++;
    if (start && end) {
      const days = Math.ceil((end.date.getTime() - start.date.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 0) leadTimes.push(days);
    }
  }

  const avgLeadTime = leadTimes.length > 0
    ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
    : 0;

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
    avgVisitDelay: 0,
    conversionRate: totalCotizaciones > 0 ? Math.round((completadas / totalCotizaciones) * 100) : 0,
    winRate: 0,
    totalVisits: enProgreso,
    totalQuotations: completadas,
    wonOpps: 0,
  };

  return <AnaliticaClient data={data} />;
}
