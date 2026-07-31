import { prisma } from '@/lib/prisma';
import { ClientViewPortal } from './ClientViewPortal';

export const dynamic = 'force-dynamic';

interface Props {
  params: { token: string };
}

export default async function ClientEnvioPage({ params }: Props) {
  const { token } = params;

  // 1) Resolve token in OdooOrderAccessLink
  const odooLink = await prisma.odooOrderAccessLink.findFirst({
    where: { clientToken: token },
  });

  let workOrderFolio = odooLink?.workOrderFolio;

  if (!workOrderFolio) {
    const act = await prisma.activity.findFirst({
      where: { clientToken: token },
      select: { workOrderFolio: true },
    });
    if (act?.workOrderFolio) workOrderFolio = act.workOrderFolio;
  }

  if (!workOrderFolio) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 text-2xl mb-4">
          ⚠️
        </div>
        <h1 className="text-xl font-black mb-2">Enlace de Cliente expirado o revocado</h1>
        <p className="text-xs text-slate-400 max-w-sm">
          Este enlace ya no está disponible. Solicita un nuevo enlace al supervisor de Perry App.
        </p>
      </div>
    );
  }

  const activities = await prisma.activity.findMany({
    where: { workOrderFolio },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      date: true,
      startTime: true,
      endTime: true,
      actualStartTime: true,
      actualEndTime: true,
      workOrderFolio: true,
      purchaseOrder: true,
      manPowerEquipo: true,
      notes: true,
      weekendNotes: true,
      equipmentStatus: true,
      suggestedAction: true,
      photosBefore: true,
      photosAfter: true,
      clientAcknowledged: true,
      clientAcknowledgedAt: true,
      clientAcknowledgedBy: true,
      clientComments: true,
      pendingItems: true,
      client: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
  });

  const clientComments = odooLink?.clientComments ? JSON.parse(odooLink.clientComments) : [];

  return (
    <ClientViewPortal
      workOrderFolio={workOrderFolio}
      initialActivities={activities.map((a) => ({
        ...a,
        date: a.date.toISOString(),
        clientAcknowledgedAt: a.clientAcknowledgedAt?.toISOString() || null,
      }))}
      initialComments={clientComments}
      token={token}
    />
  );
}
