import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { activitySchema } from '@/lib/validators';
import { parseLocalDate } from '@/lib/timezone';
import { toSentenceCase } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        client: true,
        contact: true,
        dailyReport: true,
      },
    });

    if (!activity) {
      return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = activitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const activity = await prisma.activity.update({
      where: { id: params.id },
      data: {
        date: parseLocalDate(data.date),
        userId: data.userId,
        type: data.type as any,
        status: data.status as any,
        title: toSentenceCase(data.title),
        clientId: data.clientId || null,
        contactId: data.contactId || null,
        workOrderFolio: data.workOrderFolio || null,
        purchaseOrder: data.purchaseOrder || null,
        projectArea: data.projectArea || null,
        result: data.result || null,
        nextStep: data.nextStep || null,
        commitmentDate: data.commitmentDate ? parseLocalDate(data.commitmentDate) : null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        durationMinutes: data.durationMinutes || null,
        location: data.location || null,
        notes: data.notes || null,
        consortiumCompany: data.consortiumCompany !== undefined ? (data.consortiumCompany || null) : undefined,
        companyId: data.companyId !== undefined ? data.companyId : undefined,
        isManPower: data.isManPower !== undefined ? data.isManPower : undefined,
        manPowerEquipo: data.manPowerEquipo !== undefined ? (data.manPowerEquipo ? data.manPowerEquipo.toUpperCase().slice(0, 6) : null) : undefined,
        manPowerPhotos: data.manPowerPhotos !== undefined ? data.manPowerPhotos : undefined,
      },
    });

    // ── Detect resource conflicts after date/time change ──
    const conflicts: string[] = [];
    const updatedDate = parseLocalDate(data.date);
    const dayStart = new Date(updatedDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(updatedDate); dayEnd.setHours(23, 59, 59, 999);
    const newStart = data.startTime || null;
    const newEnd = data.endTime || null;

    function timesOverlap(s1: string | null, e1: string | null, s2: string | null, e2: string | null): boolean {
      if (!s1 || !e1 || !s2 || !e2) return true;
      const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
      let a = toMin(s1), b = toMin(e1), c = toMin(s2), d = toMin(e2);
      if (b <= a) b += 1440; // overnight
      if (d <= c) d += 1440;
      return a < d && c < b;
    }

    // Check tech assignments
    const techAssigns = await prisma.weekendTechAssignment.findMany({
      where: { activityId: params.id },
      include: { technician: { select: { name: true } } },
    });
    for (const ta of techAssigns) {
      const others = await prisma.weekendTechAssignment.findMany({
        where: { technicianId: ta.technicianId, activityId: { not: params.id }, activity: { date: { gte: dayStart, lte: dayEnd } } },
        include: { activity: { select: { title: true, startTime: true, endTime: true, company: { select: { shortName: true } } } } },
      });
      for (const o of others) {
        if (timesOverlap(newStart, newEnd, o.activity.startTime, o.activity.endTime)) {
          const co = o.activity.company?.shortName ? ` [${o.activity.company.shortName}]` : '';
          conflicts.push(`🔧 Técnico ${ta.technician.name} traslapado con "${o.activity.title}" (${o.activity.startTime || '?'}-${o.activity.endTime || '?'})${co}`);
        }
      }
    }

    // Check vehicle assignments
    const vehAssigns = await prisma.weekendVehicleAssignment.findMany({ where: { activityId: params.id }, include: { vehicle: { select: { name: true } } } });
    for (const va of vehAssigns) {
      const others = await prisma.weekendVehicleAssignment.findMany({
        where: { vehicleId: va.vehicleId, activityId: { not: params.id }, activity: { date: { gte: dayStart, lte: dayEnd } } },
        include: { activity: { select: { title: true, startTime: true, endTime: true, company: { select: { shortName: true } } } } },
      });
      for (const o of others) {
        if (timesOverlap(newStart, newEnd, o.activity.startTime, o.activity.endTime)) {
          conflicts.push(`🚗 Vehículo ${va.vehicle.name} traslapado con "${o.activity.title}" (${o.activity.startTime || '?'}-${o.activity.endTime || '?'})`);
        }
      }
    }

    // Check driver assignments
    const drvAssigns = await prisma.weekendDriverAssignment.findMany({ where: { activityId: params.id }, include: { driver: { select: { name: true } } } });
    for (const da of drvAssigns) {
      const others = await prisma.weekendDriverAssignment.findMany({
        where: { driverId: da.driverId, activityId: { not: params.id }, activity: { date: { gte: dayStart, lte: dayEnd } } },
        include: { activity: { select: { title: true, startTime: true, endTime: true, company: { select: { shortName: true } } } } },
      });
      for (const o of others) {
        if (timesOverlap(newStart, newEnd, o.activity.startTime, o.activity.endTime)) {
          conflicts.push(`🚙 Chofer ${da.driver.name} traslapado con "${o.activity.title}" (${o.activity.startTime || '?'}-${o.activity.endTime || '?'})`);
        }
      }
    }

    // Check equip assignments
    const eqAssigns = await prisma.weekendEquipAssignment.findMany({ where: { activityId: params.id }, include: { equip: { select: { name: true } } } });
    for (const ea of eqAssigns) {
      const others = await prisma.weekendEquipAssignment.findMany({
        where: { equipId: ea.equipId, activityId: { not: params.id }, activity: { date: { gte: dayStart, lte: dayEnd } } },
        include: { activity: { select: { title: true, startTime: true, endTime: true, company: { select: { shortName: true } } } } },
      });
      for (const o of others) {
        if (timesOverlap(newStart, newEnd, o.activity.startTime, o.activity.endTime)) {
          conflicts.push(`🏗️ Equipo ${ea.equip.name} traslapado con "${o.activity.title}" (${o.activity.startTime || '?'}-${o.activity.endTime || '?'})`);
        }
      }
    }

    return NextResponse.json({ ...activity, resourceConflicts: conflicts });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await prisma.activity.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();

    // Partial update for specific fields (e.g., photos upload without touching other required fields)
    const updateData: any = {};
    if (body.manPowerPhotos !== undefined) {
      updateData.manPowerPhotos = body.manPowerPhotos;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Datos no proporcionados' }, { status: 400 });
    }

    const activity = await prisma.activity.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(activity);
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
