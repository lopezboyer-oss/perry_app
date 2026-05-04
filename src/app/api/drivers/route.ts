import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const ALLOWED = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR_SAFETY_LP'];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });
  const drivers = await prisma.driver.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  return NextResponse.json(drivers);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  const driver = await prisma.driver.create({ data: { name: name.trim() } });
  return NextResponse.json(driver, { status: 201 });
}
