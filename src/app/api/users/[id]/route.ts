import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'ADMINISTRACION'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, email, password, role, supervisorId, isSafetyDesignado, baseCompanyId, companyIds, defaultCompanyId } = body;

    const dataToUpdate: any = {
      name,
      email,
      role,
      supervisorId: role === 'INGENIERO' ? supervisorId : null,
      isSafetyDesignado: isSafetyDesignado || false,
      baseCompanyId: baseCompanyId || undefined,
    };

    if (password && password.trim() !== '') {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, name: true, email: true, role: true },
    });

    // Sync UserCompany access entries
    if (companyIds && Array.isArray(companyIds)) {
      // Delete old entries
      await prisma.userCompany.deleteMany({ where: { userId: id } });
      // Create new entries
      if (companyIds.length > 0) {
        await prisma.userCompany.createMany({
          data: companyIds.map((cId: string) => ({
            userId: id,
            companyId: cId,
            isDefault: cId === defaultCompanyId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating user' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'ADMINISTRACION'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;

    // Soft delete user
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Desasignar (pasar a "POR ASIGNAR") todas las actividades no cerradas
    await prisma.activity.updateMany({
      where: {
        userId: id,
        status: { notIn: ['COMPLETADA', 'CANCELADA'] },
      },
      data: { userId: null },
    });

    return NextResponse.json({ message: 'User deleted and dependencies reassigned successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Error deleting user' }, { status: 500 });
  }
}
