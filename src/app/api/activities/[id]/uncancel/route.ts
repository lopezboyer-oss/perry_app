import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  // Same permissions as cancel
  const role = session.user.role;
  const canUncancelAny = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP', 'ADMINISTRACION'].includes(role);
  if (!canUncancelAny && role !== 'INGENIERO') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    select: {
      id: true, status: true, userId: true,
      cancelledResources: true, cancelledBy: true,
    },
  });

  if (!activity) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  if (activity.status !== 'CANCELADA') return NextResponse.json({ error: 'La actividad no está cancelada' }, { status: 400 });

  // INGENIERO can only uncancel their own
  if (!canUncancelAny && activity.userId !== session.user.id) {
    return NextResponse.json({ error: 'Solo puedes restaurar tus propias actividades' }, { status: 403 });
  }

  // Parse stored resource snapshot
  let snapshot: any = null;
  try {
    if (activity.cancelledResources) {
      snapshot = JSON.parse(activity.cancelledResources);
    }
  } catch { /* ignore parse errors */ }

  const restored: string[] = [];
  const conflicts: string[] = [];

  await prisma.$transaction(async (tx) => {
    // 1. Restore activity status
    await tx.activity.update({
      where: { id: params.id },
      data: {
        status: 'PENDIENTE',
        cancelledAt: null,
        cancelReason: null,
        cancelNotes: null,
        cancelHasCharges: null,
        cancelledBy: null,
        cancelledResources: null,
      },
    });

    // 2. Try to restore resource assignments if snapshot exists
    if (snapshot) {
      // Techs
      for (const t of (snapshot.techs || [])) {
        const existing = await tx.weekendTechAssignment.findFirst({
          where: { activityId: params.id, technicianId: t.technicianId, weekendOf: t.weekendOf },
        });
        if (!existing) {
          try {
            await tx.weekendTechAssignment.create({
              data: { activityId: params.id, technicianId: t.technicianId, role: t.role, weekendOf: t.weekendOf },
            });
            const tech = await tx.technician.findUnique({ where: { id: t.technicianId }, select: { name: true } });
            restored.push(`🔧 ${tech?.name || t.technicianId}`);
          } catch {
            conflicts.push(`🔧 Técnico ${t.technicianId} (conflicto)`);
          }
        }
      }

      // Safety dedicado
      for (const s of (snapshot.safety || [])) {
        const existing = await tx.weekendSafetyAssignment.findFirst({
          where: { activityId: params.id, safetyDedicadoId: s.safetyDedicadoId, weekendOf: s.weekendOf, role: s.role },
        });
        if (!existing) {
          try {
            await tx.weekendSafetyAssignment.create({
              data: { activityId: params.id, safetyDedicadoId: s.safetyDedicadoId, role: s.role, weekendOf: s.weekendOf },
            });
            const sd = await tx.safetyDedicado.findUnique({ where: { id: s.safetyDedicadoId }, select: { name: true } });
            restored.push(`🛡️ ${sd?.name || s.safetyDedicadoId}`);
          } catch {
            conflicts.push(`🛡️ Safety ${s.safetyDedicadoId} (conflicto)`);
          }
        }
      }

      // User safety designado
      for (const u of (snapshot.userSafety || [])) {
        const existing = await tx.weekendUserSafetyAssignment.findFirst({
          where: { activityId: params.id, userId: u.userId, weekendOf: u.weekendOf },
        });
        if (!existing) {
          try {
            await tx.weekendUserSafetyAssignment.create({
              data: { activityId: params.id, userId: u.userId, weekendOf: u.weekendOf },
            });
            const user = await tx.user.findUnique({ where: { id: u.userId }, select: { name: true } });
            restored.push(`👷 ${user?.name || u.userId}`);
          } catch {
            conflicts.push(`👷 Usuario ${u.userId} (conflicto)`);
          }
        }
      }

      // Vehicles
      for (const v of (snapshot.vehicles || [])) {
        try {
          await tx.weekendVehicleAssignment.create({
            data: { activityId: params.id, vehicleId: v.vehicleId, weekendOf: v.weekendOf },
          });
          const veh = await tx.vehicle.findUnique({ where: { id: v.vehicleId }, select: { name: true } });
          restored.push(`🚗 ${veh?.name || v.vehicleId}`);
        } catch {
          conflicts.push(`🚗 Vehículo (conflicto)`);
        }
      }

      // Drivers
      for (const d of (snapshot.drivers || [])) {
        try {
          await tx.weekendDriverAssignment.create({
            data: { activityId: params.id, driverId: d.driverId, weekendOf: d.weekendOf },
          });
          const drv = await tx.driver.findUnique({ where: { id: d.driverId }, select: { name: true } });
          restored.push(`🚙 ${drv?.name || d.driverId}`);
        } catch {
          conflicts.push(`🚙 Chofer (conflicto)`);
        }
      }

      // Equips
      for (const e of (snapshot.equips || [])) {
        try {
          await tx.weekendEquipAssignment.create({
            data: { activityId: params.id, equipId: e.equipId, weekendOf: e.weekendOf },
          });
          const eq = await tx.elevationEquip.findUnique({ where: { id: e.equipId }, select: { name: true } });
          restored.push(`🏗️ ${eq?.name || e.equipId}`);
        } catch {
          conflicts.push(`🏗️ Equipo (conflicto)`);
        }
      }
    }
  });

  return NextResponse.json({
    success: true,
    restored,
    conflicts,
  });
}
