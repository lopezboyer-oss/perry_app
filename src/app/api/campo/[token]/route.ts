import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // 1) Find Odoo Order Link
    const odooLink = await prisma.odooOrderAccessLink.findFirst({
      where: {
        OR: [{ techToken1: token }, { techToken2: token }],
      },
    });

    let workOrderFolio = odooLink?.workOrderFolio;

    // Fallback: check Activity table for legacy activity token
    if (!workOrderFolio) {
      const act = await prisma.activity.findFirst({
        where: { OR: [{ techToken1: token }, { techToken2: token }] },
        select: { workOrderFolio: true },
      });
      if (act?.workOrderFolio) workOrderFolio = act.workOrderFolio;
    }

    if (!workOrderFolio) {
      return NextResponse.json({ error: 'Enlace inválido o revocado por el supervisor' }, { status: 404 });
    }

    // Fetch all activities for this Odoo Order
    const activities = await prisma.activity.findMany({
      where: {
        workOrderFolio: {
          equals: workOrderFolio.trim(),
          mode: 'insensitive',
        },
      },
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
        timeRegistryEntries: { select: { id: true, phase: true, time: true, registeredAt: true }, orderBy: { registeredAt: 'asc' } },
      },
    });

    const isTech1 = odooLink?.techToken1 === token;
    const cuadrillaLabel = isTech1 ? 'Cuadrilla 1' : 'Cuadrilla 2';

    return NextResponse.json({
      workOrderFolio,
      cuadrillaLabel,
      activities,
    });
  } catch (error: any) {
    console.error('Error fetching field activities by token:', error);
    return NextResponse.json({ error: 'Error al consultar actividades en campo' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await req.json();

    // 1) Resolve token
    const odooLink = await prisma.odooOrderAccessLink.findFirst({
      where: { OR: [{ techToken1: token }, { techToken2: token }] },
    });

    let workOrderFolio = odooLink?.workOrderFolio;

    if (!workOrderFolio) {
      const act = await prisma.activity.findFirst({
        where: { OR: [{ techToken1: token }, { techToken2: token }] },
        select: { workOrderFolio: true },
      });
      if (act?.workOrderFolio) workOrderFolio = act.workOrderFolio;
    }

    if (!workOrderFolio) {
      return NextResponse.json({ error: 'Enlace de campo inválido o revocado' }, { status: 404 });
    }

    const {
      actionType, // 'CREATE_ACTIVITY' | 'START_TIME' | 'END_TIME' | 'EQUIPMENT_STATUS' | 'SUGGESTED_ACTION' | 'ADD_PHOTO' | 'DELETE_PHOTO' | 'NOTES' | 'ADD_PENDING' | 'TOGGLE_PENDING'
      activityId,
      title,
      manPowerEquipo,
      timeStr,
      equipmentStatus,
      suggestedAction,
      photoType,
      photoUrl,
      photoId,
      notes,
      pendingTitle,
      pendingId,
      pendingStatus,
      authorName = 'Técnico de Campo',
    } = body;

    // ── ACTION: CREATE NEW ACTIVITY IN FIELD ──
    if (actionType === 'CREATE_ACTIVITY') {
      if (!title || !title.trim()) {
        return NextResponse.json({ error: 'El título de la actividad es requerido' }, { status: 400 });
      }

      // Inherit client, company, PO from existing activity of this Odoo Order
      const sampleActivity = await prisma.activity.findFirst({
        where: { workOrderFolio },
        select: { clientId: true, companyId: true, purchaseOrder: true, projectArea: true },
      });

      const newActivity = await prisma.activity.create({
        data: {
          title: title.trim(),
          type: 'MAN_POWER',
          isManPower: true,
          workOrderFolio,
          purchaseOrder: sampleActivity?.purchaseOrder || null,
          clientId: sampleActivity?.clientId || null,
          companyId: sampleActivity?.companyId || null,
          projectArea: sampleActivity?.projectArea || 'CAMPO',
          date: new Date(),
          status: 'PENDIENTE',
          manPowerEquipo: manPowerEquipo ? manPowerEquipo.trim().toUpperCase() : null,
          equipmentStatus: equipmentStatus || 'OPERATIVO',
          weekendNotes: notes ? notes.trim() : null,
        },
      });

      return NextResponse.json({
        success: true,
        activity: newActivity,
      });
    }

    // ── ACTIONS ON EXISTING ACTIVITY ──
    if (!activityId) {
      return NextResponse.json({ error: 'ID de actividad requerido' }, { status: 400 });
    }

    const activity = await prisma.activity.findFirst({
      where: { id: activityId, workOrderFolio },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }

    const dataToUpdate: any = {};

    // 1) Start Time
    if (actionType === 'START_TIME' && timeStr) {
      dataToUpdate.actualStartTime = timeStr;
      if (activity.status === 'PENDIENTE' || activity.status === 'ASIGNADA') {
        dataToUpdate.status = 'EN_PROGRESO';
      }
      try {
        await prisma.timeRegistryEntry.create({
          data: {
            activityId: activity.id,
            phase: 'INICIO_OPERATIVO',
            time: timeStr,
            registeredBy: authorName,
            userId: activity.userId || 'PUBLIC_TECH',
          },
        });
      } catch (e) {}
    }

    // 2) End Time
    if (actionType === 'END_TIME' && timeStr) {
      dataToUpdate.actualEndTime = timeStr;
      dataToUpdate.status = 'COMPLETADA';
      try {
        await prisma.timeRegistryEntry.create({
          data: {
            activityId: activity.id,
            phase: 'FINAL_OPERATIVO',
            time: timeStr,
            registeredBy: authorName,
            userId: activity.userId || 'PUBLIC_TECH',
          },
        });
      } catch (e) {}
    }

    // 3) Equipment Status
    if (actionType === 'EQUIPMENT_STATUS' && equipmentStatus) {
      dataToUpdate.equipmentStatus = equipmentStatus;
    }

    // 4) Suggested Action
    if (actionType === 'SUGGESTED_ACTION' && typeof suggestedAction === 'string') {
      dataToUpdate.suggestedAction = suggestedAction;
    }

    // 5) Photos (Before / After)
    if (actionType === 'ADD_PHOTO' && photoType && photoUrl) {
      const fieldName = photoType === 'BEFORE' ? 'photosBefore' : 'photosAfter';
      const existingStr = (activity as any)[fieldName] || '[]';
      const existingPhotos = JSON.parse(existingStr);
      const newPhoto = {
        id: crypto.randomBytes(6).toString('hex'),
        url: photoUrl,
        uploadedBy: authorName,
        uploadedAt: new Date().toISOString(),
      };
      existingPhotos.push(newPhoto);
      dataToUpdate[fieldName] = JSON.stringify(existingPhotos);
    }

    if (actionType === 'DELETE_PHOTO' && photoType && photoId) {
      const fieldName = photoType === 'BEFORE' ? 'photosBefore' : 'photosAfter';
      const existingStr = (activity as any)[fieldName] || '[]';
      const existingPhotos = JSON.parse(existingStr);
      const filtered = existingPhotos.filter((p: any) => p.id !== photoId);
      dataToUpdate[fieldName] = JSON.stringify(filtered);
    }

    // 6) Notes
    if (actionType === 'NOTES' && typeof notes === 'string') {
      dataToUpdate.weekendNotes = notes;
    }

    // 7) Pending items
    if (actionType === 'ADD_PENDING' && pendingTitle) {
      const existingStr = activity.pendingItems || '[]';
      const existingItems = JSON.parse(existingStr);
      const newItem = {
        id: crypto.randomBytes(6).toString('hex'),
        title: pendingTitle.trim(),
        status: 'ABIERTO',
        createdBy: authorName,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
      };
      existingItems.push(newItem);
      dataToUpdate.pendingItems = JSON.stringify(existingItems);
    }

    if (actionType === 'TOGGLE_PENDING' && pendingId && pendingStatus) {
      const existingStr = activity.pendingItems || '[]';
      const existingItems = JSON.parse(existingStr);
      const itemIndex = existingItems.findIndex((i: any) => i.id === pendingId);
      if (itemIndex !== -1) {
        existingItems[itemIndex].status = pendingStatus;
        if (pendingStatus === 'CERRADO' || pendingStatus === 'CANCELADO') {
          existingItems[itemIndex].closedAt = new Date().toISOString();
          existingItems[itemIndex].closedBy = authorName;
        }
        dataToUpdate.pendingItems = JSON.stringify(existingItems);
      }
    }

    const updatedActivity = await prisma.activity.update({
      where: { id: activity.id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      activity: updatedActivity,
    });
  } catch (error: any) {
    console.error('Error in field POST API:', error);
    return NextResponse.json({ error: 'Error al procesar acción de campo' }, { status: 500 });
  }
}
