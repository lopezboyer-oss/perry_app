import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const contractors = await prisma.contractor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { technicians: true } } },
    });

    return NextResponse.json(contractors);
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

    const contractor = await prisma.contractor.create({ data: { name: name.trim() } });
    return NextResponse.json(contractor, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Ya existe un contratista con ese nombre' }, { status: 409 });
    return NextResponse.json({ error: 'Error al crear contratista' }, { status: 500 });
  }
}
