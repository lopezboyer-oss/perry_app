import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  const { name, ownership, isActive } = await req.json();
  const equip = await prisma.elevationEquip.update({
    where: { id: params.id },
    data: {
      ...(name && { name: name.trim() }),
      ...(ownership && { ownership }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  return NextResponse.json(equip);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  await prisma.elevationEquip.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
