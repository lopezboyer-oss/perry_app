import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OportunidadesClient } from './OportunidadesClient';

export default async function OportunidadesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  const userId = session.user.id;

  const estatus = searchParams.estatus || '';
  const responsable = searchParams.responsable || '';
  const cliente = searchParams.cliente || '';
  const buscar = searchParams.buscar || '';

  const where: any = {};

  if (role === 'INGENIERO') {
    where.userId = userId;
  } else if (role === 'SUPERVISOR') {
    const team = await prisma.user.findMany({
      where: { supervisorId: userId },
      select: { id: true },
    });
    where.userId = { in: [userId, ...team.map((u) => u.id)] };
  }

  if (estatus) where.status = estatus;
  if (responsable) where.userId = responsable;
  if (cliente) where.clientId = cliente;
  if (buscar) {
    where.OR = [
      { title: { contains: buscar } },
      { folio: { contains: buscar } },
      { description: { contains: buscar } },
    ];
  }

  const [opportunities, users, clients] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        _count: { select: { activities: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <OportunidadesClient
      opportunities={opportunities.map((o) => ({
        ...o,
        requestDate: o.requestDate?.toISOString() || null,
        scheduledVisitDate: o.scheduledVisitDate?.toISOString() || null,
        actualVisitDate: o.actualVisitDate?.toISOString() || null,
        infoCompleteDate: o.infoCompleteDate?.toISOString() || null,
        quotationDueDate: o.quotationDueDate?.toISOString() || null,
        quotationSentDate: o.quotationSentDate?.toISOString() || null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        activitiesCount: o._count.activities,
      }))}
      users={users}
      clients={clients}
      filters={{ estatus, responsable, cliente, buscar }}
      userRole={role}
    />
  );
}
