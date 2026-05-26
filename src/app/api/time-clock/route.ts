import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');

    const role = session.user.role;
    const isManager = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(role);

    // Build where clause
    const where: any = {};

    if (isManager) {
      if (userIdParam) {
        where.userId = userIdParam;
      }
    } else {
      // Ingenieros only see their own records
      where.userId = session.user.id;
    }

    if (startParam || endParam) {
      where.timestamp = {};
      if (startParam) {
        where.timestamp.gte = new Date(startParam);
      }
      if (endParam) {
        // Extend to end of the day
        const endDate = new Date(endParam);
        endDate.setHours(23, 59, 59, 999);
        where.timestamp.lte = endDate;
      }
    }

    const entries = await prisma.timeClockEntry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        activity: {
          select: {
            id: true,
            title: true,
            workOrderFolio: true,
          },
        },
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching time clock entries:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { type, method, latitude, longitude, accuracy, photo, activityId } = await req.json();

    if (!type || !['CHECK_IN', 'CHECK_OUT'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de registro inválido (CHECK_IN/CHECK_OUT)' }, { status: 400 });
    }

    if (!method || !['GPS', 'SELFIE'].includes(method)) {
      return NextResponse.json({ error: 'Método inválido (GPS/SELFIE)' }, { status: 400 });
    }

    const data: any = {
      userId: session.user.id,
      type,
      method,
      timestamp: new Date(),
    };

    if (method === 'GPS') {
      if (latitude === undefined || longitude === undefined) {
        return NextResponse.json({ error: 'Coordenadas GPS requeridas' }, { status: 400 });
      }
      data.latitude = parseFloat(latitude);
      data.longitude = parseFloat(longitude);
      if (accuracy !== undefined) data.accuracy = parseFloat(accuracy);
    } else if (method === 'SELFIE') {
      if (!photo) {
        return NextResponse.json({ error: 'Foto selfie requerida' }, { status: 400 });
      }
      data.photo = photo;
    }

    if (activityId) {
      data.activityId = activityId;
    }

    const entry = await prisma.timeClockEntry.create({
      data,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating time clock entry:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
