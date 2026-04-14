import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage({ searchParams }: { searchParams: { user?: string } }) {
  const session = await auth();
  if (!session) redirect('/login');

  const userId = session.user.id;
  const role = session.user.role;

  // Recopilar usuarios disponibles para el dropdown
  let availableUsers: { id: string; name: string }[] = [];
  let teamIds: string[] = [];

  if (role === 'SUPERVISOR') {
    teamIds = await getTeamUserIds(userId);
  }

  if (role === 'ADMIN') {
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
    if (role === 'ADMIN') isAuthorized = true;
    else if (role === 'SUPERVISOR') isAuthorized = teamIds.includes(targetUserId);
  }

  // Construir filtros finales
  let userFilter: any = {};
  if (targetUserId && isAuthorized) {
    userFilter = { userId: targetUserId };
  } else {
    userFilter = role === 'ADMIN' ? {} 
      : role === 'SUPERVISOR' 
        ? { userId: { in: teamIds } }
        : { userId };
  }

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
    activityHours,
  ] = await Promise.all([
    prisma.activity.count({ where: userFilter }),
    prisma.activity.groupBy({
      by: ['type'],
      _count: { id: true },
      where: userFilter,
    }),
    prisma.activity.groupBy({
      by: ['status'],
      _count: { id: true },
      where: userFilter,
    }),
    prisma.opportunity.count({ where: oppFilter }),
    prisma.opportunity.groupBy({
      by: ['status'],
      _count: { id: true },
      where: oppFilter,
    }),
    prisma.activity.findMany({
      where: userFilter,
      include: { user: true, client: true },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    role === 'ADMIN' ? prisma.user.findMany({ select: { id: true, name: true, role: true } }) : [],
    prisma.activity.aggregate({
      where: { ...userFilter, durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
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

  // Activities by user
  const activitiesByUser = await prisma.activity.groupBy({
    by: ['userId'],
    _count: { id: true },
    where: userFilter,
  });

  // Map user names
  const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));

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
    totalHours: Math.round((activityHours._sum.durationMinutes || 0) / 60),
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
      userName: userMap[g.userId] || 'Desconocido',
      count: g._count.id,
    })),
    availableUsers,
    selectedUserId: isAuthorized ? targetUserId : null,
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
