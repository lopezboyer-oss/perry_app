import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET all WhatsApp group mappings + recent message logs
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const groups = await prisma.whatsappGroupMapping.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    const recentLogs = await prisma.whatsappMessageLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        activity: {
          select: {
            id: true,
            title: true,
            workOrderFolio: true,
            manPowerEquipo: true,
          },
        },
      },
    });

    return NextResponse.json({
      groups,
      recentLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}

// POST create or update a WhatsApp Group Mapping
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { groupId, groupName, workOrderFolio, isActive } = body;

    if (!groupId || !groupId.trim()) {
      return NextResponse.json({ error: 'El ID del grupo (groupId / JID) es obligatorio' }, { status: 400 });
    }

    const group = await prisma.whatsappGroupMapping.upsert({
      where: { groupId: groupId.trim() },
      create: {
        groupId: groupId.trim(),
        groupName: groupName ? groupName.trim() : 'Grupo WhatsApp Campo',
        workOrderFolio: workOrderFolio ? workOrderFolio.trim() : null,
        isActive: isActive !== undefined ? isActive : true,
      },
      update: {
        groupName: groupName !== undefined ? groupName.trim() : undefined,
        workOrderFolio: workOrderFolio !== undefined ? (workOrderFolio ? workOrderFolio.trim() : null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json(group);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error guardando grupo' }, { status: 500 });
  }
}

// DELETE a WhatsApp Group Mapping
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de mapeo requerido' }, { status: 400 });
    }

    await prisma.whatsappGroupMapping.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al eliminar' }, { status: 500 });
  }
}
