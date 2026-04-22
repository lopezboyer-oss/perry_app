import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });
  const equips = await prisma.elevationEquip.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(equips);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  const { name, ownership } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  const equip = await prisma.elevationEquip.create({
    data: { name: name.trim(), ownership: ownership || 'PROPIO' },
  });
  return NextResponse.json(equip, { status: 201 });
}
