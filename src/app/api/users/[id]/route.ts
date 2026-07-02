import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { toTitleCase } from '@/lib/utils';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'ADMINISTRACION'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, email, password, role, supervisorId, isSafetyDesignado, isSafetyAuditor, baseCompanyId, companyIds, defaultCompanyId, accessSafetyDedicado, accessVehicles, accessDrivers, accessElevationEquip, accessManPower, weeklySalary } = body;

    // Only ADMIN MAESTRO can assign/keep the ADMIN role
    if (role === 'ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo un Admin Maestro puede asignar el rol Admin Maestro' }, { status: 403 });
    }

    // Validate scope and permissions for ADMINISTRACION role
    if (session.user.role === 'ADMINISTRACION') {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { companies: true }
      });
      const allowedCompanyIds = currentUser?.companies.map(c => c.companyId) || [];

      // Verify target user shares at least one company in common
      const targetUser = await prisma.user.findUnique({
        where: { id },
        include: { companies: true }
      });

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const hasCommonCompany = targetUser.companies.some(tc => allowedCompanyIds.includes(tc.companyId));
      if (!hasCommonCompany) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Verify that all companyIds being updated belong to the allowed ones of the admin
      if (companyIds && Array.isArray(companyIds)) {
        const invalidCompanies = companyIds.filter((cId: string) => !allowedCompanyIds.includes(cId));
        if (invalidCompanies.length > 0) {
          return NextResponse.json({ error: 'No tienes permiso para asignar estas empresas' }, { status: 403 });
        }
      }
    }

    const isAdmin = ['ADMIN', 'ADMINISTRACION'].includes(session.user.role);

    const dataToUpdate: any = {
      name: toTitleCase(name),
      email,
      role,
      supervisorId: role === 'INGENIERO' ? supervisorId : null,
      isSafetyDesignado: isSafetyDesignado || false,
      isSafetyAuditor: isSafetyAuditor || false,
      accessSafetyDedicado: accessSafetyDedicado || false,
      accessVehicles: accessVehicles || false,
      accessDrivers: accessDrivers || false,
      accessElevationEquip: accessElevationEquip || false,
      accessManPower: accessManPower || false,
      baseCompanyId: baseCompanyId || undefined,
      ...(isAdmin && weeklySalary !== undefined && { weeklySalary: Number(weeklySalary) || 0 }),
    };

    if (password && password.trim() !== '') {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
      dataToUpdate.passwordPlaintext = password;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ...(isAdmin && { weeklySalary: true }),
      },
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

    // Validate scope for ADMINISTRACION role
    if (session.user.role === 'ADMINISTRACION') {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { companies: true }
      });
      const allowedCompanyIds = currentUser?.companies.map(c => c.companyId) || [];

      // Verify target user shares at least one company in common
      const targetUser = await prisma.user.findUnique({
        where: { id },
        include: { companies: true }
      });

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const hasCommonCompany = targetUser.companies.some(tc => allowedCompanyIds.includes(tc.companyId));
      if (!hasCommonCompany) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

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
