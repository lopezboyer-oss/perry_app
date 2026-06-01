import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { parseLocalDate, getTijuanaToday } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { role, email } = session.user as any;
    const hasAccess = ['ADMIN', 'ADMINISTRACION'].includes(role) || email === 'carlos.lopez@gsingenieria.mx';

    if (!hasAccess) {
      return NextResponse.json({ error: 'Prohibido: No tienes permisos para este reporte' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || getTijuanaToday().substring(0, 8) + '01'; // Primer día del mes
    const endDate = searchParams.get('endDate') || getTijuanaToday();

    // Buscar a Carlos López
    const carlosUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'carlos.lopez@gsingenieria.mx' },
          { name: { contains: 'Carlos Lopez', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    if (!carlosUser) {
      return NextResponse.json({ error: 'Usuario Carlos López no encontrado en el sistema' }, { status: 404 });
    }

    // Convertir a fechas de Tijuana al mediodía para evitar desfases
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    
    // Rango completo de día
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    const activities = await prisma.activity.findMany({
      where: {
        userId: carlosUser.id,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            shortName: true,
            color: true,
          }
        },
        client: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return NextResponse.json({
      carlos: carlosUser,
      activities: activities.map(a => ({
        id: a.id,
        title: a.title,
        date: a.date.toISOString(),
        status: a.status,
        type: a.type,
        durationMinutes: a.durationMinutes,
        startTime: a.startTime,
        endTime: a.endTime,
        actualStartTime: a.actualStartTime,
        actualEndTime: a.actualEndTime,
        workOrderFolio: a.workOrderFolio,
        company: a.company,
        client: a.client,
      }))
    });
  } catch (error: any) {
    console.error('Error fetching special report for Carlos:', error);
    return NextResponse.json({ error: 'Error al consultar las actividades' }, { status: 500 });
  }
}
