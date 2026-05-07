import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { canManageResources } from '@/lib/permissions';
import { toTitleCase } from '@/lib/utils';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.role || !canManageResources(session.user.role)) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const { name, type, isCruzVerde, isActive, contractorId, baseCompanyId, phone, email } = await req.json();

    const technician = await prisma.technician.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: toTitleCase(name) }),
        ...(type !== undefined && { type }),
        ...(isCruzVerde !== undefined && { isCruzVerde }),
        ...(isActive !== undefined && { isActive }),
        contractorId: type === 'EXTERNO' ? (contractorId || null) : null,
        ...(baseCompanyId !== undefined && { baseCompanyId: baseCompanyId || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
      },
    });

    return NextResponse.json(technician);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.role || !canManageResources(session.user.role)) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    await prisma.technician.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
