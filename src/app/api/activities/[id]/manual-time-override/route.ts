import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const activityId = params.id;
    const body = await req.json();
    const { inicioTime, finalTime, actualTechCount } = body;

    if (!activityId) {
      return NextResponse.json({ error: 'Falta ID de actividad' }, { status: 400 });
    }

    // Actualizar tech count de la actividad si se provee
    if (actualTechCount !== undefined && actualTechCount !== null) {
      await prisma.activity.update({
        where: { id: activityId },
        data: { actualTechCount: parseInt(actualTechCount, 10) }
      });
    }

    // Upsert INICIO_LOGISTICO
    if (inicioTime) {
      await prisma.timeRegistryEntry.upsert({
        where: {
          activityId_phase: {
            activityId,
            phase: 'INICIO_LOGISTICO'
          }
        },
        update: {
          time: inicioTime,
          registeredBy: session.user.name || session.user.email || 'Usuario',
          userId: session.user.id
        },
        create: {
          activityId,
          phase: 'INICIO_LOGISTICO',
          time: inicioTime,
          registeredBy: session.user.name || session.user.email || 'Usuario',
          userId: session.user.id
        }
      });
    }

    // Upsert FINAL_LOGISTICO
    if (finalTime) {
      await prisma.timeRegistryEntry.upsert({
        where: {
          activityId_phase: {
            activityId,
            phase: 'FINAL_LOGISTICO'
          }
        },
        update: {
          time: finalTime,
          registeredBy: session.user.name || session.user.email || 'Usuario',
          userId: session.user.id
        },
        create: {
          activityId,
          phase: 'FINAL_LOGISTICO',
          time: finalTime,
          registeredBy: session.user.name || session.user.email || 'Usuario',
          userId: session.user.id
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en manual time override:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
