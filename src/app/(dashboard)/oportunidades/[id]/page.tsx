import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { OportunidadDetalle } from './OportunidadDetalle';

export default async function OportunidadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const folio = decodeURIComponent(params.id);

  // Fetch all activities linked to this folio
  const activities = await prisma.activity.findMany({
    where: {
      OR: [
        { workOrderFolio: folio },
        // Also include COTIZACION activities without folio when folio is "sin-folio-XXX"
        ...(folio.startsWith('sin-folio-') ? [{ workOrderFolio: null, type: 'COTIZACION' }] : []),
      ],
    },
    include: {
      user: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
    },
    orderBy: { date: 'asc' },
  });

  if (activities.length === 0) notFound();

  // Serialize dates
  const serialized = activities.map(a => ({
    ...a,
    date: a.date.toISOString(),
    commitmentDate: a.commitmentDate?.toISOString() || null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <OportunidadDetalle
      folio={folio}
      activities={serialized}
      userRole={session.user.role}
    />
  );
}
