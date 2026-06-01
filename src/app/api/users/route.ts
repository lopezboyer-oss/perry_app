import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { toTitleCase } from '@/lib/utils';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const hasAnyAccess = ['ADMIN', 'ADMINISTRACION'].includes(user.role) ||
      user.accessSafetyDedicado ||
      user.accessVehicles ||
      user.accessDrivers ||
      user.accessElevationEquip;

    if (!hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const isAdmin = ['ADMIN', 'ADMINISTRACION'].includes(user.role);
    const isAdministracion = user.role === 'ADMINISTRACION';

    const whereFilter: any = { isActive: true };

    // Apply company filtration for ADMINISTRACION role
    if (isAdministracion) {
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { companies: true }
      });
      const allowedCompanyIds = currentUser?.companies.map(c => c.companyId) || [];
      
      whereFilter.companies = {
        some: {
          companyId: {
            in: allowedCompanyIds
          }
        }
      };
    }

    const users = await prisma.user.findMany({
      where: whereFilter,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSafetyDesignado: true,
        isSafetyAuditor: true,
        accessSafetyDedicado: true,
        accessVehicles: true,
        accessDrivers: true,
        accessElevationEquip: true,
        supervisorId: true,
        baseCompanyId: true,
        supervisor: { select: { name: true } },
        companies: {
          select: {
            companyId: true,
            isDefault: true,
            company: { select: { id: true, name: true, shortName: true, color: true } },
          },
        },
        isActive: true,
        ...(isAdmin && { weeklySalary: true }), // Only return salary to admins
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'ADMINISTRACION'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, supervisorId, isSafetyDesignado, isSafetyAuditor, baseCompanyId, companyIds, defaultCompanyId, accessSafetyDedicado, accessVehicles, accessDrivers, accessElevationEquip, weeklySalary } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Only ADMIN MAESTRO can create another ADMIN MAESTRO
    if (role === 'ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo un Admin Maestro puede crear otro Admin Maestro' }, { status: 403 });
    }

    // Validate company scope for ADMINISTRACION role
    if (session.user.role === 'ADMINISTRACION') {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { companies: true }
      });
      const allowedCompanyIds = currentUser?.companies.map(c => c.companyId) || [];

      // Check if all assigned companyIds are within allowed ones
      const targetCompanyIds = companyIds || [];
      const invalidCompanies = targetCompanyIds.filter((cId: string) => !allowedCompanyIds.includes(cId));
      if (invalidCompanies.length > 0) {
        return NextResponse.json({ error: 'No tienes permiso para asignar estas empresas' }, { status: 403 });
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedName = toTitleCase(name);
    const isAdmin = ['ADMIN', 'ADMINISTRACION'].includes(session.user.role);

    const newUser = await prisma.user.create({
      data: {
        name: normalizedName,
        email,
        passwordHash,
        role: role || 'INGENIERO',
        supervisorId: role === 'INGENIERO' ? supervisorId : null,
        isSafetyDesignado: isSafetyDesignado || false,
        isSafetyAuditor: isSafetyAuditor || false,
        accessSafetyDedicado: accessSafetyDedicado || false,
        accessVehicles: accessVehicles || false,
        accessDrivers: accessDrivers || false,
        accessElevationEquip: accessElevationEquip || false,
        baseCompanyId: baseCompanyId || null,
        ...(isAdmin && weeklySalary !== undefined && { weeklySalary: Number(weeklySalary) || 0 }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ...(isAdmin && { weeklySalary: true }),
      },
    });

    // Create UserCompany access entries
    if (companyIds && companyIds.length > 0) {
      await prisma.userCompany.createMany({
        data: companyIds.map((cId: string) => ({
          userId: newUser.id,
          companyId: cId,
          isDefault: cId === defaultCompanyId,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating user' }, { status: 500 });
  }
}
