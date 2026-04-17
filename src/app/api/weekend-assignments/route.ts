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

    const [techAssignments, safetyAssignments] = await Promise.all([
      prisma.weekendTechAssignment.findMany({
        where: { weekendOf },
        include: { technician: true },
      }),
      prisma.weekendSafetyAssignment.findMany({
        where: { weekendOf },
        include: { safetyDedicado: true },
      }),
    ]);

    return NextResponse.json({ techAssignments, safetyAssignments });
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: Create an assignment (tech or safety)
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

    if (type === 'TECH' || type === 'SAFETY_DESIGNADO') {
      const { technicianId } = body;
      if (!technicianId) return NextResponse.json({ error: 'technicianId requerido' }, { status: 400 });

      // Check for time conflicts
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

    } else if (type === 'SAFETY_DEDICADO') {
      // Only ADMIN or SUPERVISOR_SAFETY_LP can assign
      if (role !== 'ADMIN' && role !== 'SUPERVISOR_SAFETY_LP') {
        return NextResponse.json({ error: 'Solo Supervisor Safety & L.P. o Admin puede asignar Safety Dedicado' }, { status: 403 });
      }

      const { safetyDedicadoId } = body;
      if (!safetyDedicadoId) return NextResponse.json({ error: 'safetyDedicadoId requerido' }, { status: 400 });

      // Check if this safety dedicado is already assigned to another activity this weekend
      const existing = await prisma.weekendSafetyAssignment.findMany({
        where: {
          safetyDedicadoId,
          weekendOf,
          activityId: { not: activityId },
        },
        include: { activity: { select: { title: true, startTime: true, endTime: true } } },
      });

      if (existing.length > 0) {
        return NextResponse.json({
          error: `Este Safety Dedicado ya está asignado a: "${existing[0].activity.title}". Un Safety Dedicado solo puede cubrir una actividad a la vez.`,
          blocked: true,
        }, { status: 409 });
      }

      const assignment = await prisma.weekendSafetyAssignment.create({
        data: { activityId, safetyDedicadoId, weekendOf },
        include: { safetyDedicado: true },
      });

      return NextResponse.json({ assignment, conflicts: [] }, { status: 201 });
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Esta persona ya está asignada a esta actividad' }, { status: 409 });
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
  if (!s1 || !e1 || !s2 || !e2) return true; // If times missing, assume potential conflict
  return s1 < e2 && s2 < e1;
}

async function detectTechConflicts(
  technicianId: string,
  currentActivityId: string,
  weekendOf: string,
  currentActivity: { startTime: string | null; endTime: string | null; title: string } | null
) {
  const otherAssignments = await prisma.weekendTechAssignment.findMany({
    where: {
      technicianId,
      weekendOf,
      activityId: { not: currentActivityId },
    },
    include: {
      activity: { select: { title: true, startTime: true, endTime: true, date: true } },
    },
  });

  const conflicts = otherAssignments
    .filter((a) =>
      timesOverlap(
        currentActivity?.startTime || null,
        currentActivity?.endTime || null,
        a.activity.startTime,
        a.activity.endTime
      )
    )
    .map((a) => ({
      activityTitle: a.activity.title,
      startTime: a.activity.startTime,
      endTime: a.activity.endTime,
    }));

  return conflicts;
}
