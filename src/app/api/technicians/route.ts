import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { canManageResources } from '@/lib/permissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const technicians = await prisma.technician.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        contractor: { select: { id: true, name: true } },
        baseCompany: { select: { id: true, name: true, shortName: true, color: true } },
      },
    });

    return NextResponse.json(technicians);
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.role || !canManageResources(session.user.role)) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const { name, type, isCruzVerde, contractorId, baseCompanyId } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    }

    const technician = await prisma.technician.create({
      data: {
        name: name.trim(),
        type: type || 'PROPIO',
        isCruzVerde: isCruzVerde || false,
        contractorId: type === 'EXTERNO' ? (contractorId || null) : null,
        baseCompanyId: baseCompanyId || null,
      },
    });

    return NextResponse.json(technician, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear técnico' }, { status: 500 });
  }
}
