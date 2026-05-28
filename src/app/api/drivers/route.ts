import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { toTitleCase } from '@/lib/utils';

const ALLOWED = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR_SAFETY_LP'];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });
  const drivers = await prisma.driver.findMany({
    where: { isActive: true },
    include: {
      baseCompany: { select: { id: true, name: true, shortName: true, color: true } },
      contractor: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(drivers);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });
  const user = session.user as any;
  const hasAccess = ALLOWED.includes(user.role) || user.accessDrivers;
  if (!hasAccess)
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  const { name, type, contractorId, baseCompanyId } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  const driver = await prisma.driver.create({
    data: {
      name: toTitleCase(name.trim()),
      type: type || 'PROPIO',
      contractorId: type === 'EXTERNO' && contractorId ? contractorId : null,
      baseCompanyId: baseCompanyId || null,
    },
    include: {
      baseCompany: { select: { id: true, name: true, shortName: true, color: true } },
      contractor: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(driver, { status: 201 });
}
