import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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

    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Token es requerido' }, { status: 400 });

    const parts = token.split('.');
    if (parts.length !== 2) {
      return NextResponse.json({ error: 'Formato de token inválido' }, { status: 400 });
    }

    const [tokenData, signature] = parts;
    const secret = process.env.NEXTAUTH_SECRET || 'perry_app_secret_fallback';
    const expectedSignature = crypto.createHmac('sha256', secret).update(tokenData).digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'El código QR es inválido o ha sido alterado' }, { status: 400 });
    }

    // Decode and parse payload
    let payload: any;
    try {
      const decoded = Buffer.from(tokenData, 'base64').toString('utf-8');
      payload = JSON.parse(decoded);
    } catch (e) {
      return NextResponse.json({ error: 'Error al decodificar el token' }, { status: 400 });
    }

    const { supervisorId, activityId, type, timestamp } = payload;

    // Check expiration (60 seconds)
    const elapsed = Date.now() - timestamp;
    if (elapsed > 60000) {
      return NextResponse.json({ error: 'El código QR ha expirado. Solicita al supervisor refrescar la pantalla.' }, { status: 400 });
    }

    // Validate sequence order (CHECK_IN -> CHECK_OUT -> CHECK_IN -> CHECK_OUT)
    const targetType = type || 'CHECK_IN';
    const lastEntry = await prisma.timeClockEntry.findFirst({
      where: { userId: session.user.id },
      orderBy: { timestamp: 'desc' },
    });

    if (lastEntry) {
      if (lastEntry.type === targetType) {
        const lastTypeStr = lastEntry.type === 'CHECK_IN' ? 'Entrada' : 'Salida';
        const expectedTypeStr = targetType === 'CHECK_IN' ? 'Salida' : 'Entrada';
        return NextResponse.json({
          error: `Secuencia incorrecta. Tu último registro fue una ${lastTypeStr}. Debes registrar una ${expectedTypeStr} ahora.`
        }, { status: 400 });
      }
    } else {
      if (targetType === 'CHECK_OUT') {
        return NextResponse.json({
          error: 'Secuencia incorrecta. Tu primer registro debe ser una Entrada (CHECK_IN).'
        }, { status: 400 });
      }
    }

    // Validate if the activity exists in the database before linking it
    let validActivityId: string | null = null;
    if (activityId && activityId !== 'undefined' && activityId !== 'null') {
      const activityExists = await prisma.activity.findUnique({
        where: { id: activityId },
      });
      if (activityExists) {
        validActivityId = activityId;
      }
    }

    // Create registry entry
    const entry = await prisma.timeClockEntry.create({
      data: {
        userId: session.user.id,
        type: type || 'CHECK_IN',
        method: 'QR',
        timestamp: new Date(),
        verifiedByUserId: supervisorId,
        activityId: validActivityId,
      },
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
  } catch (error: any) {
    console.error('Error verifying QR token:', error);
    return NextResponse.json({ error: `Error del servidor: ${error.message || String(error)}` }, { status: 500 });
  }
}
