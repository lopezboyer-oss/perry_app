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

  // Calculate the "reference" weekend for ALARMA TERA:
  // - On Saturday (dow=6): current ongoing weekend
  // - On Sunday (dow=0): current ongoing weekend (yesterday was Saturday)
  // - On Mon-Fri (dow=1-5): the PREVIOUS weekend (most recently completed)
  // This ensures ALARMA TERA defaults to the weekend that needs review, not the future one.
  const todayStr = getTijuanaToday();
  const today = new Date(`${todayStr}T12:00:00`);
  const dow = today.getDay();

  let satOffset: number;
  if (dow === 6) satOffset = 0;          // today IS Saturday
  else if (dow === 0) satOffset = -1;    // Sunday → last Saturday
  else satOffset = -(dow + 1);           // Mon(1)→-2, Tue(2)→-3 ... Fri(5)→-6

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
          status: true,
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
          company: { select: { name: true, shortName: true } },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      })
    : [];

  // Filter: ALL activities in the weekend missing TERA (image OR folio).
  // Cancelled activities don't require TERA.
  // Activities drop off the list as soon as both image AND folio are uploaded.
  // Pending activities from a past weekend persist until resolved.
  const alarmaActivities = activities
    .filter(a => {
      if ((a as any).status === 'CANCELADA') return false;
      const missingTera = !a.safetyAuditImage || !a.teraFolio;
      return missingTera;
    })
    .map(a => ({
      id: a.id,
      title: a.title,
      status: (a as any).status,
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
      company: a.company,
    }));

  // Stats: total = all non-cancelled activities in the weekend
  const totalActivities = activities.filter(a => (a as any).status !== 'CANCELADA').length;
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
