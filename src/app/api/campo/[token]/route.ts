import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
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
        clientComments: true,
        pendingItems: true,
        techToken1: true,
        techToken2: true,
        client: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        timeRegistryEntries: { select: { id: true, phase: true, time: true, registeredAt: true }, orderBy: { registeredAt: 'asc' } },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Enlace inválido o cancelado por el supervisor' }, { status: 404 });
    }

    const isTech1 = activity.techToken1 === token;
    const isTech2 = activity.techToken2 === token;
    const cuadrillaLabel = isTech1 ? 'Cuadrilla / Técnico 1' : isTech2 ? 'Cuadrilla / Técnico 2' : 'Campo';

    return NextResponse.json({
      activity,
      cuadrillaLabel,
    });
  } catch (error: any) {
    console.error('Error fetching field activity by token:', error);
    return NextResponse.json({ error: 'Error al consultar actividad en campo' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await req.json();

    const activity = await prisma.activity.findFirst({
      where: {
        OR: [
          { techToken1: token },
          { techToken2: token },
        ],
      },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Enlace inválido o cancelado' }, { status: 404 });
    }

    const {
      actionType, // 'START_TIME' | 'END_TIME' | 'EQUIPMENT_STATUS' | 'SUGGESTED_ACTION' | 'ADD_PHOTO' | 'DELETE_PHOTO' | 'NOTES' | 'ADD_PENDING' | 'TOGGLE_PENDING'
      timeStr,
      equipmentStatus,
      suggestedAction,
      photoType, // 'BEFORE' | 'AFTER'
      photoUrl,
      photoId,
      notes,
      pendingTitle,
      pendingId,
      pendingStatus, // 'ABIERTO' | 'CERRADO' | 'CANCELADO'
      authorName = 'Técnico de Campo',
    } = body;

    const dataToUpdate: any = {};

    // 1) Start Time
    if (actionType === 'START_TIME' && timeStr) {
      dataToUpdate.actualStartTime = timeStr;
      if (activity.status === 'PENDIENTE' || activity.status === 'ASIGNADA') {
        dataToUpdate.status = 'EN_PROGRESO';
      }
      // Add TimeRegistryEntry
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
      } catch (e) {
        // Ignorar si ya existe registro de esa fase
      }
    }

    // 2) End Time
    if (actionType === 'END_TIME' && timeStr) {
      dataToUpdate.actualEndTime = timeStr;
      dataToUpdate.status = 'COMPLETADA';
      // Add TimeRegistryEntry
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
      } catch (e) {
        // Ignorar si ya existe registro de esa fase
      }
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
      select: {
        id: true,
        actualStartTime: true,
        actualEndTime: true,
        status: true,
        equipmentStatus: true,
        suggestedAction: true,
        photosBefore: true,
        photosAfter: true,
        weekendNotes: true,
        pendingItems: true,
      },
    });

    return NextResponse.json({
      success: true,
      activity: updatedActivity,
    });
  } catch (error: any) {
    console.error('Error updating field activity:', error);
    return NextResponse.json({ error: 'Error al registrar información de campo' }, { status: 500 });
  }
}
