import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getCompanyFilterFromCookies } from '@/lib/company-context';

// GET /api/actividades?skip=20&take=20&tipo=&estatus=&...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const skip = parseInt(sp.get('skip') || '0');
  const take = parseInt(sp.get('take') || '20');
  const tipo = sp.get('tipo') || '';
  const estatus = sp.get('estatus') || '';
  const responsable = sp.get('responsable') || '';
  const cliente = sp.get('cliente') || '';
  const fechaDesde = sp.get('fechaDesde') || '';
  const fechaHasta = sp.get('fechaHasta') || '';
  const buscar = sp.get('buscar') || '';
  const folioOdoo = sp.get('folioOdoo') || '';

  const userId = session.user.id;
  const role = session.user.role;

  const companyFilter = getCompanyFilterFromCookies(role);
  const where: any = { ...companyFilter };

  if (role === 'INGENIERO') {
    where.userId = userId;
  } else if (role === 'SUPERVISOR') {
    const team = await prisma.user.findMany({
      where: { supervisorId: userId },
      select: { id: true },
    });
    where.userId = { in: [userId, ...team.map((u) => u.id)] };
  }

  if (tipo) where.type = tipo;
  if (estatus) where.status = estatus;
  if (responsable) where.userId = responsable;
  if (cliente) where.clientId = cliente;
  if (fechaDesde) where.date = { ...where.date, gte: new Date(fechaDesde) };
  if (fechaHasta) where.date = { ...where.date, lte: new Date(fechaHasta + 'T23:59:59') };
  if (buscar) {
    where.OR = [
      { title: { contains: buscar } },
      { notes: { contains: buscar } },
      { result: { contains: buscar } },
    ];
  }
  if (folioOdoo) where.workOrderFolio = { contains: folioOdoo.toUpperCase() };

  const activities = await prisma.activity.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
    skip,
    take,
  });

  return NextResponse.json({
    activities: activities.map((a) => ({
      ...a,
      date: a.date.toISOString(),
      commitmentDate: a.commitmentDate?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      purchaseOrder: a.purchaseOrder || null,
      workOrderFolio: a.workOrderFolio || null,
    })),
  });
}
