import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { AlarmaTeraClient } from './AlarmaTeraClient';

export default async function AlarmaTeraPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;

  // Get company filter based on user's company
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { companyId: true } });
  const companyFilter = (role === 'ADMIN' || role === 'ADMINISTRACION' || role === 'SUPERVISOR_SAFETY_LP')
    ? {} : user?.companyId ? { companyId: user.companyId } : { companyId: 'NONE' };

  // Calculate the current weekend (Saturday) — same logic as atc-finde
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysToSaturday = dayOfWeek <= 6 ? (6 - dayOfWeek) : 0;
  const nextSat = new Date(now);
  nextSat.setUTCDate(now.getUTCDate() + daysToSaturday);
  const saturday = `${nextSat.getUTCFullYear()}-${String(nextSat.getUTCMonth() + 1).padStart(2, '0')}-${String(nextSat.getUTCDate()).padStart(2, '0')}`;

  // Also get previous weekends for selector
  const weekendDates: string[] = [saturday];
  for (let i = 1; i <= 8; i++) {
    const d = new Date(nextSat);
    d.setUTCDate(d.getUTCDate() - 7 * i);
    weekendDates.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
  }

  // Get all activities for the selected/current weekend plan
  const selectedWeekend = saturday;

  // Get extra days
  const extraDays = await prisma.extraPlanDay.findMany({
    where: { weekendOf: selectedWeekend },
    orderBy: { date: 'asc' },
  });

  // Build all dates
  const satDate = new Date(`${selectedWeekend}T00:00:00Z`);
  const sunDateStr = (() => {
    const d = new Date(satDate);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const allDates = [...new Set([selectedWeekend, sunDateStr, ...extraDays.map(d => d.date)])];
  allDates.sort();

  const dateRanges = allDates.map(dateStr => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    return { date: { gte: start, lte: end } };
  });

  // Get activities
  const activities = dateRanges.length > 0
    ? await prisma.activity.findMany({
        where: { OR: dateRanges, ...companyFilter },
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          endTime: true,
          workOrderFolio: true,
          safetyAuditImage: true,
          teraFolio: true,
          teraUploadedAt: true,
          teraUploadedBy: true,
          user: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      })
    : [];

  // Filter: only activities whose day has already passed (Tijuana time) AND missing TERA image OR folio
  const tijuanaNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Tijuana' }));
  const todayTijuana = `${tijuanaNow.getFullYear()}-${String(tijuanaNow.getMonth() + 1).padStart(2, '0')}-${String(tijuanaNow.getDate()).padStart(2, '0')}`;

  const alarmaActivities = activities
    .filter(a => {
      const actDate = a.date.toISOString().slice(0, 10);
      const dayPassed = actDate < todayTijuana;
      const missingTera = !a.safetyAuditImage || !a.teraFolio;
      return dayPassed && missingTera;
    })
    .map(a => ({
      ...a,
      date: a.date.toISOString(),
      teraUploadedAt: a.teraUploadedAt?.toISOString() || null,
      hasImage: !!a.safetyAuditImage,
      hasFolio: !!a.teraFolio,
    }));

  // Also compute stats
  const totalActivities = activities.filter(a => {
    const actDate = a.date.toISOString().slice(0, 10);
    return actDate < todayTijuana;
  }).length;
  const compliantCount = totalActivities - alarmaActivities.length;

  return (
    <AlarmaTeraClient
      activities={alarmaActivities}
      weekendDates={weekendDates}
      selectedWeekend={selectedWeekend}
      totalActivities={totalActivities}
      compliantCount={compliantCount}
    />
  );
}
