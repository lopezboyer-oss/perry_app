import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { canManageResources } from '@/lib/permissions';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });
  const vehicles = await prisma.vehicle.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  return NextResponse.json(vehicles);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !canManageResources(session.user.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  const { name, isAvailable } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  const vehicle = await prisma.vehicle.create({ data: { name: name.trim(), isAvailable: isAvailable ?? true } });
  return NextResponse.json(vehicle, { status: 201 });
}
