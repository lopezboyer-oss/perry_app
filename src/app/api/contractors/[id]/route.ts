import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

    const { name } = await req.json();
    const contractor = await prisma.contractor.update({
      where: { id: params.id },
      data: { ...(name !== undefined && { name: name.trim() }) },
    });
    return NextResponse.json(contractor);
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Ya existe un contratista con ese nombre' }, { status: 409 });
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

    await prisma.contractor.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
