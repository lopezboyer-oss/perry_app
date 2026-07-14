import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET — Returns all time clock entries for a user within a Mon-Sun week
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const isManager = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(session.user.role);
    if (!isManager) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const weekStartParam = searchParams.get('weekStart'); // YYYY-MM-DD (Monday)

    if (!userId || !weekStartParam) {
      return NextResponse.json({ error: 'userId and weekStart are required' }, { status: 400 });
    }

    // Parse weekStart and calculate weekEnd (Sunday 23:59:59)
    const weekStart = new Date(weekStartParam + 'T00:00:00');
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const entries = await prisma.timeClockEntry.findMany({
      where: {
        userId,
        timestamp: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        type: true,
        method: true,
        timestamp: true,
      },
    });

    // Also fetch the entry RIGHT BEFORE the week (to handle a CHECK_IN from before the week)
    const entryBeforeWeek = await prisma.timeClockEntry.findFirst({
      where: {
        userId,
        timestamp: { lt: weekStart },
      },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        type: true,
        timestamp: true,
      },
    });

    return NextResponse.json({
      userId,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      entries,
      entryBeforeWeek,
    });
  } catch (error) {
    console.error('Error fetching weekly entries:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
