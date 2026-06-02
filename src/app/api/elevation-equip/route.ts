import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });

    const equips = await prisma.elevationEquip.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(equips);
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });

    const user = session.user as any;
    const hasAccess = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR'].includes(user.role) || user.accessElevationEquip;
    if (!hasAccess) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { name, ownership, costPerDay, freightCost, supplierId } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

    const equip = await prisma.elevationEquip.create({
      data: {
        name: name.trim(),
        ownership: ownership || 'PROPIO',
        costPerDay: costPerDay !== undefined ? Number(costPerDay) || 0 : 0,
        freightCost: freightCost !== undefined ? Number(freightCost) || 0 : 0,
        supplierId: supplierId || null,
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(equip, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear equipo' }, { status: 500 });
  }
}
