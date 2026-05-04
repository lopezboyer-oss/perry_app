import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { canManageResources } from '@/lib/permissions';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !canManageResources(session.user.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  const { name, isAvailable, isActive } = await req.json();
  const vehicle = await prisma.vehicle.update({
    where: { id: params.id },
    data: { ...(name && { name: name.trim() }), ...(isAvailable !== undefined && { isAvailable }), ...(isActive !== undefined && { isActive }) },
  });
  return NextResponse.json(vehicle);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !canManageResources(session.user.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  await prisma.vehicle.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
