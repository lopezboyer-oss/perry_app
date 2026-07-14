import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET — Returns active users who have NO time clock entry today
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const isAdminOrAdministracion = ['ADMIN', 'ADMINISTRACION'].includes(session.user.role);
    if (!isAdminOrAdministracion) {
      return NextResponse.json({ error: 'Solo administradores pueden ver este reporte' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    // 1. Get all active users (filtered by company if provided)
    const userWhere: any = { isActive: true };
    if (companyId) {
      userWhere.companies = { some: { companyId } };
      userWhere.excludeFromCompanyLogs = false;
    }

    const allUsers = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    // 2. Get all userIds that have at least one entry today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayEntries = await prisma.timeClockEntry.findMany({
      where: {
        timestamp: { gte: today, lt: tomorrow },
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    const usersWithEntryToday = new Set(todayEntries.map(e => e.userId));

    // 3. Filter users WITHOUT entry today
    const missingUserIds = allUsers
      .filter(u => !usersWithEntryToday.has(u.id))
      .map(u => u.id);

    // 4. For each missing user, get their LAST entry ever
    const lastEntries = await prisma.timeClockEntry.findMany({
      where: {
        userId: { in: missingUserIds },
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['userId'],
      select: {
        userId: true,
        type: true,
        timestamp: true,
        method: true,
      },
    });

    const lastEntryMap = new Map(lastEntries.map(e => [e.userId, e]));

    // 5. Get phone numbers from technician records
    const techs = await prisma.technician.findMany({
      where: {
        isActive: true,
        linkedUserId: { in: missingUserIds },
      },
      select: {
        linkedUserId: true,
        phone: true,
      },
    });
    const phoneMap = new Map(techs.map(t => [t.linkedUserId, t.phone]));

    // 6. Build response
    const result = allUsers
      .filter(u => !usersWithEntryToday.has(u.id))
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: phoneMap.get(u.id) || null,
        lastEntry: lastEntryMap.get(u.id) || null,
      }));

    return NextResponse.json({
      date: today.toISOString(),
      total: result.length,
      totalActive: allUsers.length,
      users: result,
    });
  } catch (error) {
    console.error('Error fetching missing today:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
