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

    const body = await req.json();
    const { technicianId, timeIn, timeOut, role } = body;

    if (!technicianId) {
      return NextResponse.json({ error: 'technicianId es requerido' }, { status: 400 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: params.id },
      select: { date: true }
    });

    if (!activity) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }

    // Calcular weekendOf basado en activity.date (buscar el sábado de esa semana)
    const d = new Date(activity.date);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 1 : (day < 6 ? day + 1 : 0)));
    const calculatedWeekendOf = d.toISOString().split('T')[0];

    // Agregar la asignación
    const assignment = await prisma.weekendTechAssignment.create({
      data: {
        activityId: params.id,
        technicianId,
        weekendOf: calculatedWeekendOf,
        role: role || 'TECNICO',
        timeIn: timeIn || null,
        timeOut: timeOut || null
      }
    });

    return NextResponse.json(assignment);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'El técnico ya está asignado a esta actividad.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al agregar técnico' }, { status: 500 });
  }
}
