import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { toTitleCase } from '@/lib/utils';

const ALLOWED = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR_SAFETY_LP'];

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  const { name, isActive, type, contractorId, baseCompanyId } = await req.json();
  const driver = await prisma.driver.update({
    where: { id: params.id },
    data: {
      ...(name && { name: toTitleCase(name.trim()) }),
      ...(isActive !== undefined && { isActive }),
      ...(type !== undefined && { type }),
      ...(type !== undefined && { contractorId: type === 'EXTERNO' && contractorId ? contractorId : null }),
      ...(baseCompanyId !== undefined && { baseCompanyId: baseCompanyId || null }),
    },
    include: {
      baseCompany: { select: { id: true, name: true, shortName: true, color: true } },
      contractor: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(driver);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  await prisma.driver.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
