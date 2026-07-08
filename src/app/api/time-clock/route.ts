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
    const typeParam = searchParams.get('type');
    const companyId = searchParams.get('companyId');

    const role = session.user.role;
    const isManager = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(role);

    // Build where clause
    const where: any = {};

    if (isManager) {
      if (userIdParam) {
        where.userId = userIdParam;
      }
      if (companyId) {
        where.user = {
          companies: { some: { companyId } }
        };
      }
    } else {
      // Ingenieros only see their own records
      where.userId = session.user.id;
    }

    if (typeParam && ['CHECK_IN', 'CHECK_OUT'].includes(typeParam)) {
      where.type = typeParam;
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

    // Fetch all users to map verifiedByUserId to their name
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    const userMap = new Map(allUsers.map(u => [u.id, u.name]));

    const serializedEntries = entries.map(entry => ({
      ...entry,
      verifiedByUserName: entry.verifiedByUserId ? (userMap.get(entry.verifiedByUserId) || 'Supervisor') : null,
    }));

    return NextResponse.json(serializedEntries);
  } catch (error) {
    console.error('Error fetching time clock entries:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // Validate if the user actually exists in the database (handles stale session cookies)
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!userExists) {
      return NextResponse.json({
        error: 'Tu usuario no existe en la base de datos o tu sesión es obsoleta (antigua base de datos). Por favor, cierra sesión e inicia sesión de nuevo.'
      }, { status: 400 });
    }

    const { type, method, latitude, longitude, accuracy, photo, activityId } = await req.json();

    if (!type || !['CHECK_IN', 'CHECK_OUT'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de registro inválido (CHECK_IN/CHECK_OUT)' }, { status: 400 });
    }

    if (!method || !['GPS', 'SELFIE'].includes(method)) {
      return NextResponse.json({ error: 'Método inválido (GPS/SELFIE)' }, { status: 400 });
    }

    // Validate sequence order (CHECK_IN -> CHECK_OUT -> CHECK_IN -> CHECK_OUT)
    const lastEntry = await prisma.timeClockEntry.findFirst({
      where: { userId: session.user.id },
      orderBy: { timestamp: 'desc' },
    });

    if (lastEntry) {
      if (lastEntry.type === type) {
        const lastTypeStr = lastEntry.type === 'CHECK_IN' ? 'Entrada' : 'Salida';
        const expectedTypeStr = type === 'CHECK_IN' ? 'Salida' : 'Entrada';
        return NextResponse.json({
          error: `Secuencia incorrecta. Tu último registro fue una ${lastTypeStr}. Debes registrar una ${expectedTypeStr} ahora.`
        }, { status: 400 });
      }
    } else {
      if (type === 'CHECK_OUT') {
        return NextResponse.json({
          error: 'Secuencia incorrecta. Tu primer registro debe ser una Entrada (CHECK_IN).'
        }, { status: 400 });
      }
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

    if (activityId && activityId !== 'undefined' && activityId !== 'null') {
      const activityExists = await prisma.activity.findUnique({
        where: { id: activityId },
      });
      if (activityExists) {
        data.activityId = activityId;
      }
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
