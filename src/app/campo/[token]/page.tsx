import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { FieldCaptureClient } from './FieldCaptureClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: { token: string };
}

export default async function FieldPage({ params }: Props) {
  const { token } = params;

  const activity = await prisma.activity.findFirst({
    where: {
      OR: [
        { techToken1: token },
        { techToken2: token },
      ],
    },
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
      techToken1: true,
      techToken2: true,
      client: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
  });

  if (!activity) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 text-2xl mb-4">
          ⚠️
        </div>
        <h1 className="text-xl font-black mb-2">Enlace no válido o cancelado</h1>
        <p className="text-xs text-slate-400 max-w-sm">
          Este enlace de campo ya no está activo o fue revocado por el supervisor. Solicita un nuevo enlace.
        </p>
      </div>
    );
  }

  const isTech1 = activity.techToken1 === token;
  const isTech2 = activity.techToken2 === token;
  const cuadrillaLabel = isTech1 ? 'Cuadrilla 1' : isTech2 ? 'Cuadrilla 2' : 'Campo';

  return (
    <FieldCaptureClient
      initialActivity={{
        ...activity,
        date: activity.date.toISOString(),
        clientAcknowledgedAt: activity.clientAcknowledgedAt?.toISOString() || null,
      }}
      cuadrillaLabel={cuadrillaLabel}
      token={token}
    />
  );
}
