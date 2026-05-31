import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });

    const user = session.user as any;
    const hasAccess = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR'].includes(user.role) || user.accessElevationEquip;
    if (!hasAccess) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { name, ownership, isActive, costPerDay, freightCost, supplierId } = await req.json();

    const equip = await prisma.elevationEquip.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(ownership !== undefined && { ownership }),
        ...(isActive !== undefined && { isActive }),
        ...(costPerDay !== undefined && { costPerDay: Number(costPerDay) || 0 }),
        ...(freightCost !== undefined && { freightCost: Number(freightCost) || 0 }),
        supplierId: supplierId !== undefined ? (supplierId || null) : undefined,
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(equip);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar equipo' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });

    const user = session.user as any;
    const hasAccess = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR'].includes(user.role) || user.accessElevationEquip;
    if (!hasAccess) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    await prisma.elevationEquip.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar equipo' }, { status: 500 });
  }
}
