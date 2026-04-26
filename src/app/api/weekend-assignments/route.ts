import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET: Retrieve all assignments for a specific weekend
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const weekendOf = req.nextUrl.searchParams.get('weekendOf');
    if (!weekendOf) return NextResponse.json({ error: 'weekendOf requerido' }, { status: 400 });

    const [techAssignments, safetyAssignments, vehicleAssignments, driverAssignments, equipAssignments] = await Promise.all([
      prisma.weekendTechAssignment.findMany({
        where: { weekendOf },
        include: { technician: true },
      }),
      prisma.weekendSafetyAssignment.findMany({
        where: { weekendOf },
        include: { safetyDedicado: true },
      }),
      prisma.weekendVehicleAssignment.findMany({
        where: { weekendOf },
        include: { vehicle: true },
      }),
      prisma.weekendDriverAssignment.findMany({
        where: { weekendOf },
        include: { driver: true },
      }),
      prisma.weekendEquipAssignment.findMany({
        where: { weekendOf },
        include: { equip: true },
      }),
    ]);

    return NextResponse.json({ techAssignments, safetyAssignments, vehicleAssignments, driverAssignments, equipAssignments });
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: Create an assignment
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { type, activityId, weekendOf } = body;

    if (!activityId || !weekendOf) {
      return NextResponse.json({ error: 'activityId y weekendOf requeridos' }, { status: 400 });
    }

    // Get activity time info for conflict detection
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { startTime: true, endTime: true, title: true },
    });

    // ── TECH / SAFETY DESIGNADO ──
    if (type === 'TECH' || type === 'SAFETY_DESIGNADO') {
      const { technicianId } = body;
      if (!technicianId) return NextResponse.json({ error: 'technicianId requerido' }, { status: 400 });

      const conflicts = await detectTechConflicts(technicianId, activityId, weekendOf, activity);

      const assignment = await prisma.weekendTechAssignment.create({
        data: {
          activityId,
          technicianId,
          role: type === 'SAFETY_DESIGNADO' ? 'SAFETY_DESIGNADO' : 'TECNICO',
          weekendOf,
        },
        include: { technician: true },
      });

      return NextResponse.json({ assignment, conflicts }, { status: 201 });

    // ── SAFETY DEDICADO ──
    } else if (type === 'SAFETY_DEDICADO') {
      if (role !== 'ADMIN' && role !== 'SUPERVISOR_SAFETY_LP') {
        return NextResponse.json({ error: 'Solo Supervisor Safety & L.P. o Admin puede asignar Safety Dedicado' }, { status: 403 });
      }

      const { safetyDedicadoId } = body;
      if (!safetyDedicadoId) return NextResponse.json({ error: 'safetyDedicadoId requerido' }, { status: 400 });

      // Get the date of the current activity to check same-day conflicts only
      const currentActivity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: { date: true },
      });

      if (!currentActivity) {
        return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
      }

      // Check: same safety dedicado assigned to another activity on the SAME DAY (not whole weekend)
      const dayStart = new Date(currentActivity.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentActivity.date);
      dayEnd.setHours(23, 59, 59, 999);

      const existing = await prisma.weekendSafetyAssignment.findMany({
        where: {
          safetyDedicadoId,
          weekendOf,
          activityId: { not: activityId },
          activity: { date: { gte: dayStart, lte: dayEnd } },
        },
        include: { activity: { select: { title: true, startTime: true, endTime: true } } },
      });

      if (existing.length > 0) {
        return NextResponse.json({
          error: `Este Safety Dedicado ya está asignado a: "${existing[0].activity.title}" el mismo día. Un Safety Dedicado solo puede cubrir una actividad por día.`,
          blocked: true,
        }, { status: 409 });
      }

      const assignment = await prisma.weekendSafetyAssignment.create({
        data: { activityId, safetyDedicadoId, weekendOf },
        include: { safetyDedicado: true },
      });

      return NextResponse.json({ assignment, conflicts: [] }, { status: 201 });

    // ── VEHICLE ──
    } else if (type === 'VEHICLE') {
      const { vehicleId } = body;
      if (!vehicleId) return NextResponse.json({ error: 'vehicleId requerido' }, { status: 400 });

      const assignment = await prisma.weekendVehicleAssignment.create({
        data: { activityId, vehicleId, weekendOf },
        include: { vehicle: true },
      });

      return NextResponse.json({ assignment, conflicts: [] }, { status: 201 });

    // ── DRIVER ──
    } else if (type === 'DRIVER') {
      const { driverId } = body;
      if (!driverId) return NextResponse.json({ error: 'driverId requerido' }, { status: 400 });

      const assignment = await prisma.weekendDriverAssignment.create({
        data: { activityId, driverId, weekendOf },
        include: { driver: true },
      });

      return NextResponse.json({ assignment, conflicts: [] }, { status: 201 });

    // ── ELEVATION EQUIP ──
    } else if (type === 'EQUIP') {
      const { equipId } = body;
      if (!equipId) return NextResponse.json({ error: 'equipId requerido' }, { status: 400 });

      // Detect time conflicts for equipment
      const conflicts = await detectEquipConflicts(equipId, activityId, weekendOf, activity);

      const assignment = await prisma.weekendEquipAssignment.create({
        data: { activityId, equipId, weekendOf },
        include: { equip: true },
      });

      return NextResponse.json({ assignment, conflicts }, { status: 201 });

    // ── USER SAFETY DESIGNADO (engineers with isSafetyDesignado) ──
    } else if (type === 'USER_SAFETY_DESIGNADO') {
      const { userId } = body;
      if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });

      const assignment = await prisma.weekendUserSafetyAssignment.create({
        data: { activityId, userId, weekendOf },
        include: { user: { select: { id: true, name: true } } },
      });

      return NextResponse.json({ assignment, conflicts: [] }, { status: 201 });
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya está asignado a esta actividad' }, { status: 409 });
    }
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Error al asignar' }, { status: 500 });
  }
}

// DELETE: Remove an assignment
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { assignmentId, assignmentType } = body;

    if (assignmentType === 'SAFETY_DEDICADO') {
      const role = session.user?.role;
      if (role !== 'ADMIN' && role !== 'SUPERVISOR_SAFETY_LP') {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
      }
      await prisma.weekendSafetyAssignment.delete({ where: { id: assignmentId } });
    } else if (assignmentType === 'VEHICLE') {
      await prisma.weekendVehicleAssignment.delete({ where: { id: assignmentId } });
    } else if (assignmentType === 'DRIVER') {
      await prisma.weekendDriverAssignment.delete({ where: { id: assignmentId } });
    } else if (assignmentType === 'EQUIP') {
      await prisma.weekendEquipAssignment.delete({ where: { id: assignmentId } });
    } else if (assignmentType === 'USER_SAFETY_DESIGNADO') {
      await prisma.weekendUserSafetyAssignment.delete({ where: { id: assignmentId } });
    } else {
      await prisma.weekendTechAssignment.delete({ where: { id: assignmentId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar asignación' }, { status: 500 });
  }
}

// ─── CONFLICT DETECTION ─────────────────────────────────────────

function timesOverlap(
  s1: string | null, e1: string | null,
  s2: string | null, e2: string | null
): boolean {
  if (!s1 || !e1 || !s2 || !e2) return true;
  return s1 < e2 && s2 < e1;
}

async function detectTechConflicts(
  technicianId: string,
  currentActivityId: string,
  weekendOf: string,
  currentActivity: { startTime: string | null; endTime: string | null; title: string } | null
) {
  const otherAssignments = await prisma.weekendTechAssignment.findMany({
    where: { technicianId, weekendOf, activityId: { not: currentActivityId } },
    include: { activity: { select: { title: true, startTime: true, endTime: true, date: true } } },
  });

  return otherAssignments
    .filter((a) => timesOverlap(currentActivity?.startTime || null, currentActivity?.endTime || null, a.activity.startTime, a.activity.endTime))
    .map((a) => ({ activityTitle: a.activity.title, startTime: a.activity.startTime, endTime: a.activity.endTime }));
}

async function detectEquipConflicts(
  equipId: string,
  currentActivityId: string,
  weekendOf: string,
  currentActivity: { startTime: string | null; endTime: string | null; title: string } | null
) {
  const otherAssignments = await prisma.weekendEquipAssignment.findMany({
    where: { equipId, weekendOf, activityId: { not: currentActivityId } },
    include: { activity: { select: { title: true, startTime: true, endTime: true } } },
  });

  return otherAssignments
    .filter((a) => timesOverlap(currentActivity?.startTime || null, currentActivity?.endTime || null, a.activity.startTime, a.activity.endTime))
    .map((a) => ({ activityTitle: a.activity.title, startTime: a.activity.startTime, endTime: a.activity.endTime }));
}
