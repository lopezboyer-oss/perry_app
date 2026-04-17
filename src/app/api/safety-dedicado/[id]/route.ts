import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== 'ADMIN' && role !== 'SUPERVISOR_SAFETY_LP') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { name, isActive } = await req.json();

    const safety = await prisma.safetyDedicado.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(safety);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== 'ADMIN' && role !== 'SUPERVISOR_SAFETY_LP') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    await prisma.safetyDedicado.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
