import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, email, password, role, supervisorId, isSafetyDesignado } = body;

    const dataToUpdate: any = {
      name,
      email,
      role,
      supervisorId: role === 'INGENIERO' ? supervisorId : null,
      isSafetyDesignado: isSafetyDesignado || false,
    };

    if (password && password.trim() !== '') {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating user' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;

    // Soft delete user
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Desasignar (pasar a "POR ASIGNAR") todas las oportunidades no cerradas.
    // 'status' de Oportunidad que están activas generalmente no son GANADA ni PERDIDA
    await prisma.opportunity.updateMany({
      where: {
        userId: id,
        status: { notIn: ['GANADA', 'PERDIDA'] },
      },
      data: { userId: null },
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
