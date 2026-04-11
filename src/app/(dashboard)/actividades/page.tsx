import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ActividadesClient } from './ActividadesClient';

export default async function ActividadesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const userId = session.user.id;
  const role = session.user.role;

  // Filters from query params
  const tipo = searchParams.tipo || '';
  const estatus = searchParams.estatus || '';
  const responsable = searchParams.responsable || '';
  const cliente = searchParams.cliente || '';
  const fechaDesde = searchParams.fechaDesde || '';
  const fechaHasta = searchParams.fechaHasta || '';
  const buscar = searchParams.buscar || '';

  // Build where clause
  const where: any = {};

  // Role-based filter
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

  const [activities, users, clients] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        opportunity: { select: { id: true, folio: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    }),
    prisma.user.findMany({ select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <ActividadesClient
      activities={activities.map((a) => ({
        ...a,
        date: a.date.toISOString(),
        commitmentDate: a.commitmentDate?.toISOString() || null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))}
      users={users}
      clients={clients}
      filters={{ tipo, estatus, responsable, cliente, fechaDesde, fechaHasta, buscar }}
      userRole={role}
    />
  );
}
