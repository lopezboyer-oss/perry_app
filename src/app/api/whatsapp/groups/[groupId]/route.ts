import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessWhatsappCoPilot } from '@/lib/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessWhatsappCoPilot(email)) {
      return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 });
    }

    const { groupId } = params;
    const decodedGroupId = decodeURIComponent(groupId);

    // 1. Fetch group mapping
    let group = await prisma.whatsappGroupMapping.findUnique({
      where: { groupId: decodedGroupId },
    });

    if (!group) {
      // Check by JID or ID
      group = await prisma.whatsappGroupMapping.findFirst({
        where: {
          OR: [
            { id: decodedGroupId },
            { groupId: decodedGroupId },
          ],
        },
      });
    }

    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
    }

    // 2. Fetch associated company
    let company = null;
    if (group.companyId) {
      company = await prisma.company.findUnique({
        where: { id: group.companyId },
        select: { id: true, name: true, shortName: true, color: true },
      });
    }

    // 3. Fetch all logs for this group
    const logs = await prisma.whatsappMessageLog.findMany({
      where: { groupId: group.groupId },
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

    // 4. Aggregations & Analytics
    let totalMedia = 0;
    let totalAudios = 0;
    let operationalCount = 0;
    const typeCounts: Record<string, number> = {};
    const equipmentMap: Map<string, { equipo: string; lastStatus: string | null; count: number; lastSeenAt: Date }> = new Map();
    const otMap: Map<string, { folio: string; count: number; lastSeenAt: Date }> = new Map();
    const partsList: Array<{ name: string; quantity: number; providerType: string; senderName: string; createdAt: Date }> = [];

    logs.forEach((log) => {
      let parsed: any = {};
      try {
        parsed = JSON.parse(log.parsedData || '{}');
      } catch {}

      if (log.mediaUrls) {
        totalMedia++;
      }

      if (parsed.transcription || (parsed.tags && parsed.tags.includes('nota_de_voz'))) {
        totalAudios++;
      }

      if (parsed.isOperationalEvent) {
        operationalCount++;
      }

      const msgType = parsed.messageType || 'GENERAL_OPERATIONAL';
      typeCounts[msgType] = (typeCounts[msgType] || 0) + 1;

      // Extract OTs
      if (parsed.workOrderFolio && parsed.workOrderFolio !== 'Sin asignar') {
        const folio = parsed.workOrderFolio.toUpperCase().trim();
        const existing = otMap.get(folio);
        if (existing) {
          existing.count++;
          if (log.createdAt > existing.lastSeenAt) {
            existing.lastSeenAt = log.createdAt;
          }
        } else {
          otMap.set(folio, { folio, count: 1, lastSeenAt: log.createdAt });
        }
      }

      // Extract Equipment
      if (parsed.manPowerEquipo) {
        const eq = parsed.manPowerEquipo.toUpperCase().trim();
        const existing = equipmentMap.get(eq);
        if (existing) {
          existing.count++;
          if (log.createdAt > existing.lastSeenAt) {
            existing.lastSeenAt = log.createdAt;
            existing.lastStatus = parsed.equipmentStatus || existing.lastStatus;
          }
        } else {
          equipmentMap.set(eq, {
            equipo: eq,
            lastStatus: parsed.equipmentStatus || null,
            count: 1,
            lastSeenAt: log.createdAt,
          });
        }
      }

      // Extract Parts
      if (parsed.parts && Array.isArray(parsed.parts) && parsed.parts.length > 0) {
        parsed.parts.forEach((p: any) => {
          if (p.name) {
            partsList.push({
              name: p.name,
              quantity: p.quantity || 1,
              providerType: p.providerType || 'COTIZAR',
              senderName: log.senderName || log.senderPhone,
              createdAt: log.createdAt,
            });
          }
        });
      }
    });

    const totalMessages = logs.length;
    const operationalPercentage = totalMessages > 0 
      ? Math.round((operationalCount / totalMessages) * 100) 
      : 0;

    const detectedOTs = Array.from(otMap.values()).sort((a, b) => b.count - a.count);
    const detectedEquipments = Array.from(equipmentMap.values()).sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());

    return NextResponse.json({
      group: {
        ...group,
        company,
      },
      stats: {
        totalMessages,
        totalMedia,
        totalAudios,
        operationalCount,
        operationalPercentage,
        typeCounts,
      },
      detectedOTs,
      detectedEquipments,
      partsList,
      logs,
    });
  } catch (error: any) {
    console.error('Error al obtener detalle del grupo de WhatsApp:', error);
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}
