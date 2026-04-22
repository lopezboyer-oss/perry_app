import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const ALLOWED = ['ADMIN', 'SUPERVISOR_SAFETY_LP'];

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  const { name, isActive } = await req.json();
  const driver = await prisma.driver.update({
    where: { id: params.id },
    data: { ...(name && { name: name.trim() }), ...(isActive !== undefined && { isActive }) },
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
