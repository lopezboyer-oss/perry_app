import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const suppliers = await prisma.equipmentSupplier.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { equipments: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (!role || !['ADMIN', 'ADMINISTRACION', 'SUPERVISOR'].includes(role)) {
      return NextResponse.json({ error: 'No autorizado para gestionar proveedores' }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

    const supplier = await prisma.equipmentSupplier.create({
      data: { name: name.trim() }
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un proveedor con ese nombre' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 });
  }
}
