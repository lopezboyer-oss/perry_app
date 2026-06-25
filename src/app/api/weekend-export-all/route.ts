import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { parseLocalDate } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

/**
 * GET /api/weekend-export-all?weekendOf=YYYY-MM-DD
 * Returns all activities across ALL companies for the given weekend plan,
 * including assignments. Only accessible by ADMIN and SUPERVISOR_SAFETY_LP.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const role = session.user.role;
  if (!['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const weekendOf = searchParams.get('weekendOf');
  if (!weekendOf) return NextResponse.json({ error: 'weekendOf requerido' }, { status: 400 });

  // Calculate Sunday from Saturday
  const satDate = parseLocalDate(weekendOf);
  const sunDate = new Date(satDate);
  sunDate.setDate(sunDate.getDate() + 1);
  const sunday = `${sunDate.getFullYear()}-${String(sunDate.getMonth() + 1).padStart(2, '0')}-${String(sunDate.getDate()).padStart(2, '0')}`;

  // Get extra days or handle Summer Shut Down hardcoded dates
  let allDates: string[];
  if (weekendOf === '2026-07-11') {
    allDates = [
      '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14',
      '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19'
    ];
  } else {
    const extraDays = await prisma.extraPlanDay.findMany({
      where: { weekendOf },
      orderBy: { date: 'asc' },
    });
    allDates = [...new Set([weekendOf, sunday, ...extraDays.map(d => d.date)])];
    allDates.sort();
  }

  // Build date ranges — NO company filter
  const dateRanges = allDates.map(dateStr => {
    const d = parseLocalDate(dateStr);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    return { date: { gte: start, lte: end } };
  });

  const [activities, techAssignments, safetyAssignments, equipAssignments] = await Promise.all([
    prisma.activity.findMany({
      where: { OR: dateRanges },
      select: {
        id: true,
        title: true,
        date: true,
        startTime: true,
        endTime: true,
        workOrderFolio: true,
        loto: true,
        weekendNotes: true,
        continuedFromId: true,
        user: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
    }),
    prisma.weekendTechAssignment.findMany({
      where: { weekendOf },
      select: { activityId: true, role: true, technician: { select: { name: true } } },
    }),
    prisma.weekendSafetyAssignment.findMany({
      where: { weekendOf },
      select: { activityId: true, role: true, safetyDedicado: { select: { name: true } } },
    }),
    prisma.weekendEquipAssignment.findMany({
      where: { weekendOf },
      select: { activityId: true, equip: { select: { name: true } } },
    }),
  ]);

  // Also get user safety assignments
  const userSafetyAssignments = await prisma.weekendUserSafetyAssignment.findMany({
    where: { weekendOf },
    select: { activityId: true, user: { select: { name: true } } },
  });

  return NextResponse.json({
    activities: activities.map(a => ({
      ...a,
      date: a.date.toISOString(),
    })),
    techAssignments,
    safetyAssignments,
    equipAssignments,
    userSafetyAssignments,
  });
}
