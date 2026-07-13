import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// PATCH — Edit an existing time clock entry (Admin/Administración only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const isAdminOrAdministracion = ['ADMIN', 'ADMINISTRACION'].includes(session.user.role);
    if (!isAdminOrAdministracion) {
      return NextResponse.json({ error: 'Solo administradores pueden editar registros' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { type, timestamp, manualNotes } = body;

    // Validate entry exists
    const entry = await prisma.timeClockEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    const dataToUpdate: any = {};

    if (type && ['CHECK_IN', 'CHECK_OUT'].includes(type)) {
      dataToUpdate.type = type;
    }

    if (timestamp) {
      dataToUpdate.timestamp = new Date(timestamp);
    }

    if (manualNotes !== undefined) {
      dataToUpdate.manualNotes = manualNotes || null;
    }

    // Track who edited (overwrite registeredByUserId to mark it was admin-modified)
    dataToUpdate.registeredByUserId = session.user.id;

    const updated = await prisma.timeClockEntry.update({
      where: { id },
      data: dataToUpdate,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        activity: {
          select: { id: true, title: true, workOrderFolio: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating time clock entry:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// DELETE — Remove a time clock entry (Admin/Administración only)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const isAdminOrAdministracion = ['ADMIN', 'ADMINISTRACION'].includes(session.user.role);
    if (!isAdminOrAdministracion) {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar registros' }, { status: 403 });
    }

    const { id } = params;

    // Validate entry exists
    const entry = await prisma.timeClockEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    await prisma.timeClockEntry.delete({ where: { id } });

    return NextResponse.json({ message: 'Registro eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting time clock entry:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
