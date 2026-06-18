import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { canManageResources } from '@/lib/permissions';
import { toTitleCase, getDeterministicPassword } from '@/lib/utils';
import bcrypt from 'bcryptjs';

// getDeterministicPassword imported from @/lib/utils

// Generate base email prefix
function getBaseEmail(name: string): string {
  const clean = name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '') // remove special chars
    .trim()
    .split(/\s+/);
  
  const first = clean[0] || 'user';
  const last = clean[1] || 'tech';
  return `${first}.${last}`;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const isAdmin = session.user?.role && ['ADMIN', 'ADMINISTRACION'].includes(session.user.role);

    const technicians = await prisma.technician.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        contractor: { select: { id: true, name: true } },
        baseCompany: { select: { id: true, name: true, shortName: true, color: true } },
      },
    });

    // Strip hourlyRate for non-admin users
    // Pre-fetch all linked user salaries if admin
    let salaryMap = new Map<string, number>();
    if (isAdmin) {
      const linkedUserIds = technicians.map(t => t.linkedUserId).filter(Boolean) as string[];
      if (linkedUserIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: linkedUserIds } },
          select: { id: true, weeklySalary: true }
        });
        salaryMap = new Map(users.map(u => [u.id, u.weeklySalary || 0]));
      }
    }

    const mapped = technicians.map(t => {
      const { hourlyRate, ...rest } = t;
      const weeklySalary = t.linkedUserId ? salaryMap.get(t.linkedUserId) || 0 : 0;
      return {
        ...rest,
        ...(isAdmin ? { hourlyRate, weeklySalary } : { hourlyRate: null, weeklySalary: null })
      };
    });

    return NextResponse.json(mapped);
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

    const { name, type, isCruzVerde, contractorId, baseCompanyId, phone, email, hourlyRate, weeklySalary } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    }

    const technician = await prisma.$transaction(async (tx) => {
      // 1. Resolve / generate unique email for the User
      let targetEmail = email?.trim();
      if (!targetEmail) {
        let emailIndex = 0;
        const baseEmailPrefix = getBaseEmail(name);
        targetEmail = `${baseEmailPrefix}@perryapp.com`;
        let userExists = true;

        while (userExists) {
          const existing = await tx.user.findUnique({
            where: { email: targetEmail },
          });
          if (existing) {
            emailIndex++;
            targetEmail = `${baseEmailPrefix}${emailIndex}@perryapp.com`;
          } else {
            userExists = false;
          }
        }
      } else {
        // If email was provided, check if it's already taken in User table
        const existing = await tx.user.findUnique({
          where: { email: targetEmail },
        });
        if (existing) {
          throw new Error('EMAIL_TAKEN');
        }
      }

      // 2. Generate deterministic password & hash it
      const cleartextPassword = getDeterministicPassword(name, targetEmail);
      const passwordHash = await bcrypt.hash(cleartextPassword, 10);

      // 3. Resolve baseCompanyId (fetch a default CASME/first company if not provided)
      let companyId = baseCompanyId;
      if (!companyId) {
        const defaultCompany = await tx.company.findFirst({
          orderBy: { sortOrder: 'asc' },
        });
        companyId = defaultCompany?.id || null;
      }

      // 4. Create the User record with role TECNICO
      const newUser = await tx.user.create({
        data: {
          name: toTitleCase(name),
          email: targetEmail,
          passwordHash,
          passwordPlaintext: cleartextPassword,
          role: 'TECNICO',
          isActive: true,
          baseCompanyId: companyId,
          weeklySalary: weeklySalary !== undefined ? Number(weeklySalary) || 0 : 0,
        },
      });

      // 5. Create UserCompany entry
      if (companyId) {
        await tx.userCompany.create({
          data: {
            userId: newUser.id,
            companyId,
            isDefault: true,
          },
        });
      }

      // 6. Create the Technician record linked to User
      const tech = await tx.technician.create({
        data: {
          name: toTitleCase(name),
          type: type || 'PROPIO',
          isCruzVerde: isCruzVerde || false,
          contractorId: type === 'EXTERNO' ? (contractorId || null) : null,
          baseCompanyId: baseCompanyId || null,
          phone: phone?.trim() || null,
          email: targetEmail,
          linkedUserId: newUser.id,
          hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) || 0 : 0,
        },
      });

      return tech;
    });

    return NextResponse.json(technician, { status: 201 });
  } catch (error: any) {
    if (error.message === 'EMAIL_TAKEN') {
      return NextResponse.json({ error: 'El correo electrónico ya está en uso por otro usuario.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al crear técnico' }, { status: 500 });
  }
}
