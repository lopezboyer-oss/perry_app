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
        // When filtering by company, exclude users flagged with excludeFromCompanyLogs
        where.user = {
          companies: { some: { companyId } },
          excludeFromCompanyLogs: false,
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

    // Fetch all users to map verifiedByUserId and registeredByUserId to their name
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
      registeredByUserName: entry.registeredByUserId ? (userMap.get(entry.registeredByUserId) || 'Admin') : null,
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

    // Validate if the user actually exists AND is active in the database (handles stale session cookies & deactivated users)
    const userExists = await prisma.user.findFirst({
      where: { id: session.user.id, isActive: true },
    });
    if (!userExists) {
      return NextResponse.json({
        error: 'Tu usuario no existe o está desactivado. Por favor, cierra sesión e inicia con tu cuenta actual.'
      }, { status: 400 });
    }

    const { type, method, latitude, longitude, accuracy, photo, activityId, targetUserId, manualTimestamp, manualNotes } = await req.json();

    if (!type || !['CHECK_IN', 'CHECK_OUT'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de registro inválido (CHECK_IN/CHECK_OUT)' }, { status: 400 });
    }

    if (!method || !['GPS', 'SELFIE', 'MANUAL'].includes(method)) {
      return NextResponse.json({ error: 'Método inválido (GPS/SELFIE/MANUAL)' }, { status: 400 });
    }

    // MANUAL method: only ADMIN/ADMINISTRACION can use it
    const isAdminOrAdministracion = ['ADMIN', 'ADMINISTRACION'].includes(session.user.role);
    if (method === 'MANUAL' && !isAdminOrAdministracion) {
      return NextResponse.json({ error: 'Solo administradores pueden registrar asistencia manual' }, { status: 403 });
    }

    // Determine the target user (for manual registration, admin can register on behalf of another user)
    const effectiveUserId = (method === 'MANUAL' && targetUserId) ? targetUserId : session.user.id;

    // Validate target user exists and is active
    if (method === 'MANUAL' && targetUserId) {
      const targetUser = await prisma.user.findFirst({
        where: { id: targetUserId, isActive: true },
      });
      if (!targetUser) {
        return NextResponse.json({ error: 'El usuario destino no existe o está desactivado' }, { status: 400 });
      }
    }

    // Validate sequence order (CHECK_IN -> CHECK_OUT -> CHECK_IN -> CHECK_OUT)
    const lastEntry = await prisma.timeClockEntry.findFirst({
      where: { userId: effectiveUserId },
      orderBy: { timestamp: 'desc' },
    });

    // Skip sequence validation for MANUAL method (admin may need to fix out-of-order entries)
    if (method !== 'MANUAL') {
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
    }

    const data: any = {
      userId: effectiveUserId,
      type,
      method,
      timestamp: (method === 'MANUAL' && manualTimestamp) ? new Date(manualTimestamp) : new Date(),
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
    } else if (method === 'MANUAL') {
      // Store who registered manually and optional notes
      data.registeredByUserId = session.user.id;
      data.manualNotes = manualNotes || null;
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
