import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'ADMINISTRACION'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSafetyDesignado: true,
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
    const { name, email, password, role, supervisorId, isSafetyDesignado, baseCompanyId, companyIds, defaultCompanyId } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If it exists but is inactive, we could theoretically reactivate, but let's just error
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role || 'INGENIERO',
        supervisorId: role === 'INGENIERO' ? supervisorId : null,
        isSafetyDesignado: isSafetyDesignado || false,
        baseCompanyId: baseCompanyId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
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
