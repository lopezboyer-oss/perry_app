import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardClient } from './DashboardClient';

function getDateRange(period: string): { dateFrom: Date; dateTo: Date } {
  const now = new Date();

  if (period === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateFrom = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
    const dateTo = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    return { dateFrom, dateTo };
  }

  if (period === 'week') {
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const dateFrom = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0);
    const dateTo = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 999);
    return { dateFrom, dateTo };
  }

  // Default: today
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { dateFrom, dateTo };
}

export default async function DashboardPage({ searchParams }: { searchParams: { user?: string; period?: string } }) {
  const session = await auth();
  if (!session) redirect('/login');

  const userId = session.user.id;
  const role = session.user.role;
  const period = searchParams?.period || 'today';
  const { dateFrom, dateTo } = getDateRange(period);

  // Recopilar usuarios disponibles para el dropdown
  let availableUsers: { id: string; name: string }[] = [];
  let teamIds: string[] = [];

  if (role === 'SUPERVISOR') {
    teamIds = await getTeamUserIds(userId);
  }

  if (role === 'ADMIN' || role === 'SUPERVISOR_SAFETY_LP') {
    availableUsers = await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  } else if (role === 'SUPERVISOR') {
    availableUsers = await prisma.user.findMany({ 
      where: { id: { in: teamIds } }, 
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
  }

  const targetUserId = searchParams?.user;
  
  // Validar si el target solicitado es visible para el usuario actual
  let isAuthorized = false;
  if (targetUserId) {
    if (role === 'ADMIN' || role === 'SUPERVISOR_SAFETY_LP') isAuthorized = true;
    else if (role === 'SUPERVISOR') isAuthorized = teamIds.includes(targetUserId);
  }

  // Construir filtros finales
  let userFilter: any = {};
  if (targetUserId && isAuthorized) {
    userFilter = { userId: targetUserId };
  } else {
    userFilter = (role === 'ADMIN' || role === 'SUPERVISOR_SAFETY_LP') ? {} 
      : role === 'SUPERVISOR' 
        ? { userId: { in: teamIds } }
        : { userId };
  }

  // Date filter for activities
  const dateFilter = { date: { gte: dateFrom, lte: dateTo } };
  const activityFilter = { ...userFilter, ...dateFilter };

  // Fetch all data in parallel
  const [
    totalActivities,
    activitiesByType,
    activitiesByStatus,
    recentActivities,
    users,
    // Top performers
    topActiveRaw,
    topQuotationsRaw,
    topReceiptsRaw,
    // Hours by user
    hoursByUserRaw,
    // Activities by user (for chart)
    activitiesByUser,
  ] = await Promise.all([
    prisma.activity.count({ where: activityFilter }),
    prisma.activity.groupBy({
      by: ['type'],
      _count: { id: true },
      where: activityFilter,
    }),
    prisma.activity.groupBy({
      by: ['status'],
      _count: { id: true },
      where: activityFilter,
    }),
    prisma.activity.findMany({
      where: activityFilter,
      include: { user: true, client: true },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    (role === 'ADMIN' || role === 'SUPERVISOR_SAFETY_LP') ? prisma.user.findMany({ select: { id: true, name: true, role: true } }) : [],
    // Top Active: user with most activities in period
    prisma.activity.groupBy({
      by: ['userId'],
      _count: { id: true },
      where: { ...activityFilter, userId: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    }),
    // Top Quotations: user with most COTIZACION + COMPLETADA in period
    prisma.activity.groupBy({
      by: ['userId'],
      _count: { id: true },
      where: { ...activityFilter, type: 'COTIZACION', status: 'COMPLETADA', userId: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    }),
    // Top Receipts: user who confirmed the most receipts (all time, not period-filtered)
    prisma.invoiceReceipt.groupBy({
      by: ['confirmedById'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    }),
    // Hours by user in period
    prisma.activity.groupBy({
      by: ['userId'],
      _sum: { durationMinutes: true },
      where: { ...activityFilter, durationMinutes: { not: null }, userId: { not: null } },
    }),
    // Activities by user (for bar chart)
    prisma.activity.groupBy({
      by: ['userId'],
      _count: { id: true },
      where: activityFilter,
    }),
  ]);

  // Derived opportunity stats from COTIZACION activities (new model)
  const cotizacionActs = await prisma.activity.findMany({
    where: { ...userFilter, type: 'COTIZACION' },
    select: { workOrderFolio: true, status: true, date: true },
    orderBy: { date: 'asc' },
  });

  // Group by folio to derive opportunities
  const folioMap = new Map<string, typeof cotizacionActs>();
  for (const a of cotizacionActs) {
    const key = a.workOrderFolio || `_no_folio_${a.date.toISOString()}`;
    if (!folioMap.has(key)) folioMap.set(key, []);
    folioMap.get(key)!.push(a);
  }

  let totalOpportunities = folioMap.size;
  let pendingQuotation = 0; // EN_PROGRESO opportunities
  let avgLeadTime = 0;
  const leadTimes: number[] = [];

  for (const acts of folioMap.values()) {
    const hasEnProgreso = acts.some(a => a.status === 'EN_PROGRESO');
    const completada = acts.find(a => a.status === 'COMPLETADA');
    const enProgreso = acts.find(a => a.status === 'EN_PROGRESO');
    if (hasEnProgreso && !completada) pendingQuotation++;
    if (enProgreso && completada) {
      const days = Math.ceil((completada.date.getTime() - enProgreso.date.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 0) leadTimes.push(days);
    }
  }

  if (leadTimes.length > 0) {
    avgLeadTime = Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length);
  }

  // Map user names
  const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));

  // Resolve top performers
  const topActive = topActiveRaw.length > 0
    ? { userName: userMap[topActiveRaw[0].userId!] || 'Desconocido', count: topActiveRaw[0]._count.id }
    : null;

  const topQuotations = topQuotationsRaw.length > 0
    ? { userName: userMap[topQuotationsRaw[0].userId!] || 'Desconocido', count: topQuotationsRaw[0]._count.id }
    : null;

  const topReceipts = topReceiptsRaw.length > 0
    ? { userName: userMap[topReceiptsRaw[0].confirmedById] || 'Desconocido', count: topReceiptsRaw[0]._count.id }
    : null;

  // Resolve hours by user
  const hoursByUser = hoursByUserRaw
    .map((g) => ({
      userName: userMap[g.userId!] || 'Desconocido',
      hours: Math.round((g._sum.durationMinutes || 0) / 60 * 10) / 10,
      minutes: g._sum.durationMinutes || 0,
    }))
    .filter((h) => h.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const data = {
    totalActivities,
    activitiesByType: activitiesByType.map((g) => ({
      type: g.type,
      count: g._count.id,
    })),
    activitiesByStatus: activitiesByStatus.map((g) => ({
      status: g.status,
      count: g._count.id,
    })),
    totalOpportunities,
    oppsByStatus: [],
    pendingQuotation,
    avgLeadTime,
    topActive,
    topQuotations,
    topReceipts,
    hoursByUser,
    recentActivities: recentActivities.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      status: a.status,
      date: a.date.toISOString(),
      userName: a.user?.name || 'POR ASIGNAR',
      clientName: a.client?.name || '-',
    })),
    activitiesByUser: activitiesByUser.map((g) => ({
      userName: userMap[g.userId!] || 'Desconocido',
      count: g._count.id,
    })),
    availableUsers,
    selectedUserId: isAuthorized ? targetUserId : null,
    period,
  };

  return <DashboardClient data={data} />;
}

async function getTeamUserIds(supervisorId: string): Promise<string[]> {
  const team = await prisma.user.findMany({
    where: { supervisorId },
    select: { id: true },
  });
  return [supervisorId, ...team.map((u) => u.id)];
}
