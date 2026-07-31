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
        clientToken: token,
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
        client: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        timeRegistryEntries: { select: { id: true, phase: true, time: true, registeredAt: true }, orderBy: { registeredAt: 'asc' } },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Enlace de cliente inválido o expirado' }, { status: 404 });
    }

    return NextResponse.json({
      activity,
    });
  } catch (error: any) {
    console.error('Error fetching client portal activity:', error);
    return NextResponse.json({ error: 'Error al consultar portal del cliente' }, { status: 500 });
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
        clientToken: token,
      },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Enlace de cliente inválido o expirado' }, { status: 404 });
    }

    const {
      actionType, // 'ENTERADO' | 'COMMENT' | 'TOGGLE_PENDING'
      authorName = 'Representante de Cliente',
      commentText,
      pendingId,
      pendingStatus, // 'ABIERTO' | 'CERRADO' | 'CANCELADO'
    } = body;

    const dataToUpdate: any = {};

    // 1) Mark Enterado
    if (actionType === 'ENTERADO') {
      dataToUpdate.clientAcknowledged = true;
      dataToUpdate.clientAcknowledgedAt = new Date();
      dataToUpdate.clientAcknowledgedBy = authorName.trim();
    }

    // 2) Client Comment
    if (actionType === 'COMMENT' && commentText) {
      const existingStr = activity.clientComments || '[]';
      const existingComments = JSON.parse(existingStr);
      const newComment = {
        id: crypto.randomBytes(6).toString('hex'),
        author: authorName.trim(),
        comment: commentText.trim(),
        createdAt: new Date().toISOString(),
      };
      existingComments.push(newComment);
      dataToUpdate.clientComments = JSON.stringify(existingComments);
    }

    // 3) Toggle Pending item from Client Portal
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
        clientAcknowledged: true,
        clientAcknowledgedAt: true,
        clientAcknowledgedBy: true,
        clientComments: true,
        pendingItems: true,
      },
    });

    return NextResponse.json({
      success: true,
      activity: updatedActivity,
    });
  } catch (error: any) {
    console.error('Error updating client portal activity:', error);
    return NextResponse.json({ error: 'Error al procesar acción del cliente' }, { status: 500 });
  }
}
