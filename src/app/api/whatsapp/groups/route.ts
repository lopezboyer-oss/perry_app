import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessWhatsappCoPilot } from '@/lib/permissions';

// GET all WhatsApp group mappings + statistics + recent message logs
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessWhatsappCoPilot(email)) {
      return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filterGroupId = searchParams.get('groupId');

    const [groups, companies] = await Promise.all([
      prisma.whatsappGroupMapping.findMany({
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true, shortName: true, color: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const companyMap = new Map(companies.map(c => [c.id, c]));

    // Compute stats for each group
    const groupsWithStats = await Promise.all(
      groups.map(async (g) => {
        const messageCount = await prisma.whatsappMessageLog.count({
          where: { groupId: g.groupId },
        });
        const mediaCount = await prisma.whatsappMessageLog.count({
          where: {
            groupId: g.groupId,
            mediaUrls: { not: null },
          },
        });
        const lastLog = await prisma.whatsappMessageLog.findFirst({
          where: { groupId: g.groupId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        const company = g.companyId ? companyMap.get(g.companyId) || null : null;

        return {
          ...g,
          company,
          messageCount,
          mediaCount,
          lastActivityAt: lastLog?.createdAt || g.updatedAt,
        };
      })
    );

    const whereClause: any = {};
    if (filterGroupId) {
      whereClause.groupId = filterGroupId;
    }

    const recentLogs = await prisma.whatsappMessageLog.findMany({
      where: whereClause,
      take: 100,
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

    const totalIngestedMessages = await prisma.whatsappMessageLog.count();
    const totalMediaFiles = await prisma.whatsappMessageLog.count({
      where: { mediaUrls: { not: null } },
    });

    return NextResponse.json({
      groups: groupsWithStats,
      companies,
      recentLogs,
      stats: {
        totalGroups: groups.length,
        totalIngestedMessages,
        totalMediaFiles,
      },
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
    const { groupId, groupName, workOrderFolio, companyId, groupCategory, isActive } = body;

    if (!groupId || !groupId.trim()) {
      return NextResponse.json({ error: 'El ID del grupo (groupId / JID) es obligatorio' }, { status: 400 });
    }

    const group = await prisma.whatsappGroupMapping.upsert({
      where: { groupId: groupId.trim() },
      create: {
        groupId: groupId.trim(),
        groupName: groupName ? groupName.trim() : 'Grupo WhatsApp Operaciones',
        workOrderFolio: workOrderFolio ? workOrderFolio.trim() : null,
        companyId: companyId ? companyId.trim() : null,
        groupCategory: groupCategory ? groupCategory.trim() : 'OPERACIONAL',
        isActive: isActive !== undefined ? isActive : true,
      },
      update: {
        groupName: groupName !== undefined ? (groupName ? groupName.trim() : null) : undefined,
        workOrderFolio: workOrderFolio !== undefined ? (workOrderFolio ? workOrderFolio.trim() : null) : undefined,
        companyId: companyId !== undefined ? (companyId ? companyId.trim() : null) : undefined,
        groupCategory: groupCategory !== undefined ? (groupCategory ? groupCategory.trim() : 'OPERACIONAL') : undefined,
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
