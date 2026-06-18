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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.role || !canManageResources(session.user.role)) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const { name, type, isCruzVerde, isActive, contractorId, baseCompanyId, phone, email, hourlyRate, weeklySalary } = await req.json();

    const technician = await prisma.$transaction(async (tx) => {
      // Find current technician state
      const currentTech = await tx.technician.findUnique({
        where: { id: params.id },
      });
      if (!currentTech) {
        throw new Error('NOT_FOUND');
      }

      // 1. If email is changing, make sure it is not taken by another user
      if (email !== undefined && email?.trim() && email.trim() !== currentTech.email) {
        const existingUser = await tx.user.findUnique({
          where: { email: email.trim() },
        });
        if (existingUser && existingUser.id !== currentTech.linkedUserId) {
          throw new Error('EMAIL_TAKEN');
        }
      }

      // 2. Perform the update on Technician
      const updatedTech = await tx.technician.update({
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
          ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) || 0 }),
        },
      });

      // 3. Sychronize with User
      if (updatedTech.linkedUserId) {
        await tx.user.update({
          where: { id: updatedTech.linkedUserId },
          data: {
            ...(name !== undefined && { name: toTitleCase(name) }),
            ...(email !== undefined && { email: email?.trim() || undefined }),
            ...(isActive !== undefined && { isActive }),
            ...(baseCompanyId !== undefined && { baseCompanyId: baseCompanyId || null }),
            ...(weeklySalary !== undefined && { weeklySalary: Number(weeklySalary) || 0 }),
          },
        });
      } else if (updatedTech.isActive) {
        // If they don't have a linked user and are active, create one now!
        let targetEmail = updatedTech.email?.trim();
        if (!targetEmail) {
          let emailIndex = 0;
          const baseEmailPrefix = getBaseEmail(updatedTech.name);
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
        }

        const cleartextPassword = getDeterministicPassword(updatedTech.name, targetEmail);
        const passwordHash = await bcrypt.hash(cleartextPassword, 10);

        let companyId = updatedTech.baseCompanyId;
        if (!companyId) {
          const defaultCompany = await tx.company.findFirst({
            orderBy: { sortOrder: 'asc' },
          });
          companyId = defaultCompany?.id || null;
        }

        const newUser = await tx.user.create({
          data: {
            name: updatedTech.name,
            email: targetEmail,
            passwordHash,
            passwordPlaintext: cleartextPassword,
            role: 'TECNICO',
            isActive: true,
            baseCompanyId: companyId,
          },
        });

        if (companyId) {
          await tx.userCompany.create({
            data: {
              userId: newUser.id,
              companyId,
              isDefault: true,
            },
          });
        }

        // Update the technician to link them
        const finalTech = await tx.technician.update({
          where: { id: updatedTech.id },
          data: {
            linkedUserId: newUser.id,
            email: targetEmail,
          },
        });
        return finalTech;
      }

      return updatedTech;
    });

    return NextResponse.json(technician);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Técnico no encontrado' }, { status: 404 });
    }
    if (error.message === 'EMAIL_TAKEN') {
      return NextResponse.json({ error: 'El correo electrónico ya está en uso por otro usuario.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al actualizar técnico' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.role || !canManageResources(session.user.role)) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      const tech = await tx.technician.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      if (tech.linkedUserId) {
        await tx.user.update({
          where: { id: tech.linkedUserId },
          data: { isActive: false },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
