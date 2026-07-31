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
      where: { clientToken: token },
    });

    let workOrderFolio = odooLink?.workOrderFolio;

    // Fallback: check Activity table for legacy activity token
    if (!workOrderFolio) {
      const act = await prisma.activity.findFirst({
        where: { clientToken: token },
        select: { workOrderFolio: true },
      });
      if (act?.workOrderFolio) workOrderFolio = act.workOrderFolio;
    }

    if (!workOrderFolio) {
      return NextResponse.json({ error: 'Enlace de cliente inválido o revocado' }, { status: 404 });
    }

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

    return NextResponse.json({
      workOrderFolio,
      activities,
      clientComments: odooLink?.clientComments ? JSON.parse(odooLink.clientComments) : [],
    });
  } catch (error: any) {
    console.error('Error fetching client portal activities by token:', error);
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

    // 1) Find Odoo Order Link
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
      return NextResponse.json({ error: 'Enlace de cliente inválido o revocado' }, { status: 404 });
    }

    const {
      actionType, // 'ENTERADO_ACTIVITY' | 'COMMENT' | 'TOGGLE_PENDING'
      activityId,
      authorName = 'Representante de Cliente',
      commentText,
      pendingId,
      pendingStatus,
    } = body;

    // ── 1) ENTERADO EN ACTIVIDAD ESPECÍFICA CERRADA/COMPLETADA ──
    if (actionType === 'ENTERADO_ACTIVITY' && activityId) {
      const activity = await prisma.activity.findFirst({
        where: { id: activityId, workOrderFolio },
      });

      if (!activity) {
        return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
      }

      const updatedActivity = await prisma.activity.update({
        where: { id: activityId },
        data: {
          clientAcknowledged: true,
          clientAcknowledgedAt: new Date(),
          clientAcknowledgedBy: authorName.trim(),
        },
      });

      return NextResponse.json({
        success: true,
        activity: updatedActivity,
      });
    }

    // ── 2) COMENTARIOS GENERALES DE LA ORDEN DE TRABAJO O ACTIVIDAD ──
    if (actionType === 'COMMENT' && commentText) {
      if (activityId) {
        const activity = await prisma.activity.findFirst({
          where: { id: activityId, workOrderFolio },
        });

        if (activity) {
          const existingStr = activity.clientComments || '[]';
          const existingComments = JSON.parse(existingStr);
          existingComments.push({
            id: crypto.randomBytes(6).toString('hex'),
            author: authorName.trim(),
            comment: commentText.trim(),
            createdAt: new Date().toISOString(),
          });
          const updated = await prisma.activity.update({
            where: { id: activityId },
            data: { clientComments: JSON.stringify(existingComments) },
          });
          return NextResponse.json({ success: true, activity: updated });
        }
      }

      // Order-level comment
      if (odooLink) {
        const existingStr = odooLink.clientComments || '[]';
        const existingComments = JSON.parse(existingStr);
        existingComments.push({
          id: crypto.randomBytes(6).toString('hex'),
          author: authorName.trim(),
          comment: commentText.trim(),
          createdAt: new Date().toISOString(),
        });
        await prisma.odooOrderAccessLink.update({
          where: { id: odooLink.id },
          data: { clientComments: JSON.stringify(existingComments) },
        });
      }
      return NextResponse.json({ success: true });
    }

    // ── 3) TOGGLE PENDING ITEM ──
    if (actionType === 'TOGGLE_PENDING' && activityId && pendingId && pendingStatus) {
      const activity = await prisma.activity.findFirst({
        where: { id: activityId, workOrderFolio },
      });

      if (activity) {
        const existingStr = activity.pendingItems || '[]';
        const existingItems = JSON.parse(existingStr);
        const itemIndex = existingItems.findIndex((i: any) => i.id === pendingId);
        if (itemIndex !== -1) {
          existingItems[itemIndex].status = pendingStatus;
          if (pendingStatus === 'CERRADO' || pendingStatus === 'CANCELADO') {
            existingItems[itemIndex].closedAt = new Date().toISOString();
            existingItems[itemIndex].closedBy = authorName;
          }
          const updated = await prisma.activity.update({
            where: { id: activityId },
            data: { pendingItems: JSON.stringify(existingItems) },
          });
          return NextResponse.json({ success: true, activity: updated });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating client portal POST API:', error);
    return NextResponse.json({ error: 'Error al procesar respuesta del cliente' }, { status: 500 });
  }
}
