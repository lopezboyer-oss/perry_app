import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { RegistroPersonalClient } from './RegistroPersonalClient';
import { getTijuanaToday, parseLocalDate } from '@/lib/timezone';
import { getCompanyFilterFromCookies } from '@/lib/company-context';

export const dynamic = 'force-dynamic';

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

export default async function RegistroPersonalPage({ searchParams }: { searchParams: { company?: string } }) {
  const session = await auth();
  if (!session) redirect('/login');

  const companyFilter = await getCompanyFilterFromCookies(session.user.role, session.user.id);
  const companyId = 'companyId' in companyFilter ? companyFilter.companyId : null;

  let companyName = 'Todas';
  if (companyId) {
    const comp = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
    if (comp) companyName = comp.name;
  }

  const { saturday, sunday } = getImmediateWeekendDates();

  // Get extra days for this weekend's plan
  const extraDays = await prisma.extraPlanDay.findMany({
    where: { weekendOf: saturday },
    orderBy: { date: 'asc' },
  });

  const rawDates = [saturday, sunday];
  extraDays.forEach(d => {
    if (!rawDates.includes(d.date)) {
      rawDates.push(d.date);
    }
  });
  const allDates = rawDates;
  allDates.sort();

  const dateRanges = allDates.map(dateStr => {
    const d = parseLocalDate(dateStr);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    return { date: { gte: start, lte: end } };
  });

  // Fetch weekend activities (technicians can see activities they are assigned to, or all if manager)
  const isManager = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(session.user.role);

  const activities = dateRanges.length > 0
    ? await prisma.activity.findMany({
        where: {
          OR: dateRanges,
          status: { not: 'CANCELADA' },
          // If not manager, only load activities where user is technical lead or assigned
          ...(!isManager ? {
            OR: [
              { userId: session.user.id },
              { weekendTechAssignments: { some: { technician: { linkedUserId: session.user.id } } } },
              { weekendSafetyAssignments: { some: { safetyDedicado: { linkedUserId: session.user.id } } } },
            ]
          } : {})
        },
        select: {
          id: true,
          title: true,
          workOrderFolio: true,
          date: true,
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      })
    : [];

  // Fetch active users list for supervisor/admin filters
  // When filtering by company, exclude users flagged with excludeFromCompanyLogs (e.g. Naudy - transversal Safety role)
  const users = isManager
    ? await prisma.user.findMany({
        where: { 
          isActive: true,
          ...(companyId ? { 
            companies: { some: { companyId } },
            excludeFromCompanyLogs: false,
          } : {})
        },
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
        },
        orderBy: { name: 'asc' },
      })
    : [];

  // Query technician phone numbers to link with users
  const techs = isManager
    ? await prisma.technician.findMany({
        where: { isActive: true, linkedUserId: { not: null } },
        select: {
          linkedUserId: true,
          phone: true,
        },
      })
    : [];

  const phoneMap = new Map(techs.map(t => [t.linkedUserId, t.phone]));

  const usersWithPhone = users.map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    email: u.email,
    phone: phoneMap.get(u.id) || null,
  }));

  const serializedActivities = activities.map(act => ({
    id: act.id,
    title: act.title,
    workOrderFolio: act.workOrderFolio,
    date: act.date.toISOString(),
  }));

  return (
    <RegistroPersonalClient
      currentUser={session.user}
      activities={serializedActivities}
      users={usersWithPhone}
      companyId={companyId}
      companyName={companyName}
    />
  );
}
