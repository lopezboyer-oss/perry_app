import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const technicians = await prisma.technician.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(technicians);
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

    const { name, type, isCruzVerde } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    }

    const technician = await prisma.technician.create({
      data: {
        name: name.trim(),
        type: type || 'PROPIO',
        isCruzVerde: isCruzVerde || false,
      },
    });

    return NextResponse.json(technician, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear técnico' }, { status: 500 });
  }
}
