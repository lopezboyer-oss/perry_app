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

  const oppFilter = userFilter;

  // Fetch all data in parallel
  const [
    totalActivities,
    activitiesByType,
    activitiesByStatus,
    totalOpportunities,
    oppsByStatus,
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
    prisma.opportunity.count({ where: oppFilter }),
    prisma.opportunity.groupBy({
      by: ['status'],
      _count: { id: true },
      where: oppFilter,
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
    // Top Receipts: engineer with most confirmed receipts in period
    prisma.invoiceReceipt.groupBy({
      by: ['engineerName'],
      _count: { id: true },
      where: { confirmedAt: { gte: dateFrom, lte: dateTo }, engineerName: { not: null } },
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

  // Opportunities pending quotation
  const pendingQuotation = await prisma.opportunity.count({
    where: {
      ...oppFilter,
      status: { in: ['VISITADA', 'EN_ESPERA_INFORMACION', 'COTIZACION_EN_PROCESO'] },
    },
  });

  // Overdue opportunities
  const overdue = await prisma.opportunity.count({
    where: {
      ...oppFilter,
      quotationDueDate: { lt: new Date() },
      quotationSentDate: null,
      status: { notIn: ['COTIZACION_ENVIADA', 'GANADA', 'PERDIDA'] },
    },
  });

  // Average lead time (visit to quotation)
  const oppsWithLeadTime = await prisma.opportunity.findMany({
    where: {
      ...oppFilter,
      actualVisitDate: { not: null },
      quotationSentDate: { not: null },
    },
    select: { actualVisitDate: true, quotationSentDate: true },
  });

  let avgLeadTime = 0;
  if (oppsWithLeadTime.length > 0) {
    const totalDays = oppsWithLeadTime.reduce((sum, opp) => {
      const days = Math.ceil(
        (opp.quotationSentDate!.getTime() - opp.actualVisitDate!.getTime()) / (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);
    avgLeadTime = Math.round(totalDays / oppsWithLeadTime.length);
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
    ? { userName: topReceiptsRaw[0].engineerName || 'Desconocido', count: topReceiptsRaw[0]._count.id }
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
    oppsByStatus: oppsByStatus.map((g) => ({
      status: g.status,
      count: g._count.id,
    })),
    pendingQuotation,
    overdue,
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
