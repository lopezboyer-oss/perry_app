import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { AlarmaTeraClient } from './AlarmaTeraClient';
import { getTijuanaToday, parseLocalDate } from '@/lib/timezone';
import { getCompanyFilterFromCookies } from '@/lib/company-context';

export const dynamic = 'force-dynamic';

export default async function AlarmaTeraPage({
  searchParams,
}: {
  searchParams: { weekend?: string };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  const companyFilter = await getCompanyFilterFromCookies();

  // Calculate the current weekend (Saturday) — same logic as atc-finde
  const todayStr = getTijuanaToday();
  const today = new Date(`${todayStr}T12:00:00`);
  const dow = today.getDay();

  let satOffset: number;
  if (dow === 6) satOffset = 0;
  else if (dow === 0) satOffset = -1;
  else satOffset = 6 - dow;

  const saturdayDate = new Date(today);
  saturdayDate.setDate(today.getDate() + satOffset);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const currentSaturday = fmt(saturdayDate);

  // Previous weekends for selector
  const weekendDates: string[] = [currentSaturday];
  for (let i = 1; i <= 8; i++) {
    const d = new Date(saturdayDate);
    d.setDate(d.getDate() - 7 * i);
    weekendDates.push(fmt(d));
  }

  // Use selected weekend or current
  const selectedWeekend = searchParams.weekend || currentSaturday;

  // Get extra days for this weekend
  const extraDays = await prisma.extraPlanDay.findMany({
    where: { weekendOf: selectedWeekend },
    orderBy: { date: 'asc' },
  });

  // Build all dates (sat + sun + extras)
  const satDate = new Date(`${selectedWeekend}T12:00:00`);
  const sunDate = new Date(satDate);
  sunDate.setDate(satDate.getDate() + 1);
  const sunDateStr = fmt(sunDate);

  const allDates = [...new Set([selectedWeekend, sunDateStr, ...extraDays.map(d => d.date)])];
  allDates.sort();

  // Build date ranges for Prisma query
  const dateRanges = allDates.map(dateStr => {
    const d = parseLocalDate(dateStr);
    const start = new Date(d); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(d); end.setUTCHours(23, 59, 59, 999);
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

  // Filter: only activities whose day has already passed AND missing TERA image OR folio
  const todayTijuana = getTijuanaToday();

  const alarmaActivities = activities
    .filter(a => {
      const actDate = a.date.toISOString().slice(0, 10);
      const dayPassed = actDate < todayTijuana;
      const missingTera = !a.safetyAuditImage || !a.teraFolio;
      return dayPassed && missingTera;
    })
    .map(a => ({
      id: a.id,
      title: a.title,
      date: a.date.toISOString(),
      startTime: a.startTime,
      endTime: a.endTime,
      workOrderFolio: a.workOrderFolio,
      teraFolio: a.teraFolio,
      teraUploadedAt: a.teraUploadedAt?.toISOString() || null,
      teraUploadedBy: a.teraUploadedBy,
      hasImage: !!a.safetyAuditImage,
      hasFolio: !!a.teraFolio,
      user: a.user,
      client: a.client,
    }));

  // Compute stats
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
