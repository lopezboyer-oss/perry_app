import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string, assignmentId: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { timeIn, timeOut } = body;

    const assignment = await prisma.weekendTechAssignment.update({
      where: { id: params.assignmentId },
      data: {
        timeIn: timeIn !== undefined ? timeIn : undefined,
        timeOut: timeOut !== undefined ? timeOut : undefined,
      }
    });

    return NextResponse.json(assignment);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar la asignación' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string, assignmentId: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await prisma.weekendTechAssignment.delete({
      where: { id: params.assignmentId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar la asignación' }, { status: 500 });
  }
}
