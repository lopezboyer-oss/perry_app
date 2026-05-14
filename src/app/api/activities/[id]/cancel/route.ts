import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Cancel reason labels for the WhatsApp notice
const CANCEL_REASON_LABELS: Record<string, string> = {
  PERMISOLOGIA_INCOMPLETA: 'Permisología Incompleta',
  AREA_NO_DESPEJADA: 'Área no despejada de equipos Cliente',
  FALTO_PERSONAL_NUESTRO: 'Faltó Personal nuestro',
  FALTO_PERSONAL_CLIENTE: 'Faltó personal Cliente',
  FALTO_MATERIAL: 'Faltó Material',
  MEDIDAS_NO_COINCIDEN: 'Medidas de fabricación/Instalación no coinciden',
  ALCANCE_DISTINTO: 'Alcance distinto al considerado en plan',
  OBSTRUCCION_OTRA_EMPRESA: 'Obstrucción con otra empresa',
  OTRA: 'Otra',
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  // Permission: ADMIN, SUPERVISOR, SUPERVISOR_SAFETY_LP, ADMINISTRACION can cancel any.
  // INGENIERO can cancel only their own activities (checked after fetching).
  const role = session.user.role;
  const canCancelAny = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP', 'ADMINISTRACION'].includes(role);
  if (!canCancelAny && role !== 'INGENIERO') {
    return NextResponse.json({ error: 'Sin permisos para cancelar actividades' }, { status: 403 });
  }

  const body = await req.json();
  const { reason, notes, hasCharges } = body as {
    reason: string;
    notes?: string;
    hasCharges: boolean;
  };

  if (!reason) {
    return NextResponse.json({ error: 'Motivo de cancelación es requerido' }, { status: 400 });
  }
  if (reason === 'OTRA' && !notes?.trim()) {
    return NextResponse.json({ error: 'Debe proporcionar detalles cuando el motivo es "Otra"' }, { status: 400 });
  }

  // Verify activity exists
  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      weekendTechAssignments: { include: { technician: { select: { name: true } } } },
      weekendSafetyAssignments: { include: { safetyDedicado: { select: { name: true } } } },
      weekendUserSafetyAssignments: { include: { user: { select: { name: true } } } },
      weekendVehicleAssignments: { include: { vehicle: { select: { name: true } } } },
      weekendDriverAssignments: { include: { driver: { select: { name: true } } } },
      weekendEquipAssignments: { include: { equip: { select: { name: true } } } },
    },
  });

  if (!activity) {
    return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
  }

  if (activity.status === 'CANCELADA') {
    return NextResponse.json({ error: 'La actividad ya está cancelada' }, { status: 400 });
  }

  // INGENIERO can only cancel their own activities
  if (!canCancelAny && activity.userId !== session.user.id) {
    return NextResponse.json({ error: 'Solo puedes cancelar tus propias actividades' }, { status: 403 });
  }

  // Build summary of released resources before deleting them
  const releasedResources = {
    techs: activity.weekendTechAssignments.map(a => a.technician.name),
    safety: [
      ...activity.weekendSafetyAssignments.map(a => a.safetyDedicado.name),
      ...activity.weekendUserSafetyAssignments.map(a => a.user.name),
    ],
    vehicles: activity.weekendVehicleAssignments.map(a => a.vehicle.name),
    drivers: activity.weekendDriverAssignments.map(a => a.driver.name),
    equips: activity.weekendEquipAssignments.map(a => a.equip.name),
  };

  // Transaction: cancel + release resources + optionally create cotización
  let newCotizacionId: string | null = null;

  await prisma.$transaction(async (tx) => {
    // 1. Update activity status and cancellation metadata
    await tx.activity.update({
      where: { id: params.id },
      data: {
        status: 'CANCELADA',
        cancelledAt: new Date(),
        cancelReason: reason,
        cancelNotes: notes || null,
        cancelHasCharges: hasCharges,
        cancelledBy: session.user.name || 'Desconocido',
      },
    });

    // 2. Release all weekend assignments
    await tx.weekendTechAssignment.deleteMany({ where: { activityId: params.id } });
    await tx.weekendSafetyAssignment.deleteMany({ where: { activityId: params.id } });
    await tx.weekendUserSafetyAssignment.deleteMany({ where: { activityId: params.id } });
    await tx.weekendVehicleAssignment.deleteMany({ where: { activityId: params.id } });
    await tx.weekendDriverAssignment.deleteMany({ where: { activityId: params.id } });
    await tx.weekendEquipAssignment.deleteMany({ where: { activityId: params.id } });

    // 3. If charges apply, create a follow-up COTIZACION activity
    if (hasCharges) {
      // Get extra plan days to skip them when calculating next business day
      const extraDays = await tx.extraPlanDay.findMany({ select: { date: true } });
      const extraDaySet = new Set(extraDays.map(d => d.date)); // "YYYY-MM-DD" strings

      // Calculate next business day (skip Sat, Sun, and extra plan days like Monday festivo)
      const actDate = new Date(activity.date);
      const nextBizDay = new Date(actDate);
      nextBizDay.setDate(nextBizDay.getDate() + 1);
      const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      while (nextBizDay.getDay() === 0 || nextBizDay.getDay() === 6 || extraDaySet.has(toDateStr(nextBizDay))) {
        nextBizDay.setDate(nextBizDay.getDate() + 1);
      }
      // Set to noon to avoid timezone issues
      nextBizDay.setHours(12, 0, 0, 0);

      const newAct = await tx.activity.create({
        data: {
          userId: activity.userId,
          clientId: activity.clientId,
          contactId: activity.contactId,
          companyId: activity.companyId,
          workOrderFolio: activity.workOrderFolio,
          date: nextBizDay,
          type: 'COTIZACION',
          status: 'PENDIENTE',
          title: `Cargo por cancelación — ${activity.title}`,
          notes: `Generada automáticamente por cancelación de actividad del ${activity.date.toISOString().substring(0, 10)}.\nMotivo: ${CANCEL_REASON_LABELS[reason] || reason}${notes ? `\nDetalles: ${notes}` : ''}`,
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
        },
      });
      newCotizacionId = newAct.id;
    }
  });

  // Build WhatsApp notice text
  const reasonLabel = CANCEL_REASON_LABELS[reason] || reason;
  const dateFormatted = new Date(activity.date).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const techNames = releasedResources.techs.join(', ') || 'N/A';
  const safetyNames = releasedResources.safety.join(', ') || 'N/A';

  const whatsappNotice = [
    '⚠️ *AVISO DE CANCELACIÓN* ⚠️',
    '',
    `📋 *Actividad:* ${activity.title}`,
    `🏢 *Empresa:* ${activity.client?.name || 'Sin cliente'}`,
    `📅 *Fecha programada:* ${dateFormatted}`,
    `🕐 *Horario:* ${activity.startTime || '--:--'} — ${activity.endTime || '--:--'}`,
    '',
    `👷 *Sup Operativo:* ${activity.user?.name || 'Sin asignar'}`,
    `🔧 *Técnicos:* ${techNames}`,
    `🛡️ *Safety:* ${safetyNames}`,
    '',
    `📝 *Motivo:* ${reasonLabel}`,
    ...(notes ? [`💬 *Detalles:* ${notes}`] : []),
    `💰 *Cargos al cliente:* ${hasCharges ? 'Sí' : 'No'}`,
    '',
    '_Perry App | By Chigüire Labs_',
  ].join('\n');

  return NextResponse.json({
    success: true,
    releasedResources,
    newCotizacionId,
    whatsappNotice,
  });
}
