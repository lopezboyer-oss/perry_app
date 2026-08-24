import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessWhatsappCoPilot } from '@/lib/permissions';
import { backfillPastWhatsappMedia } from '@/lib/whatsapp/media-backup';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessWhatsappCoPilot(email)) {
      return NextResponse.json({ error: 'Acceso restringido a dirección' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const company = searchParams.get('company') || '';
    const groupId = searchParams.get('groupId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const search = searchParams.get('search') || '';
    const action = searchParams.get('action') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '40');

    // Run backfill if requested
    if (action === 'backfill') {
      const result = await backfillPastWhatsappMedia(60);
      return NextResponse.json({ status: 'Backfill completed', result });
    }

    // 1. Fetch group mappings & companies
    const [groups, companies] = await Promise.all([
      prisma.whatsappGroupMapping.findMany({ where: { isActive: true } }),
      prisma.company.findMany({ select: { id: true, name: true, shortName: true, color: true } }),
    ]);

    const groupMap = new Map(groups.map((g) => [g.groupId, g]));
    const companyMap = new Map(companies.map((c) => [c.id, c.name]));

    // Build filter clause
    const where: any = {
      mediaUrls: { not: null },
    };

    if (groupId) {
      where.groupId = groupId;
    } else if (company) {
      // Find group IDs associated with this company
      const companyGroupIds = groups
        .filter((g) => {
          const compName = (companyMap.get(g.companyId || '') || '').toLowerCase();
          return compName.includes(company.toLowerCase()) || (g.groupName || '').toLowerCase().includes(company.toLowerCase());
        })
        .map((g) => g.groupId);
      if (companyGroupIds.length > 0) {
        where.groupId = { in: companyGroupIds };
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { rawMessage: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
        { parsedData: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Query DB
    const [totalCount, logs] = await Promise.all([
      prisma.whatsappMessageLog.count({ where }),
      prisma.whatsappMessageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Format evidencias list
    const items: any[] = [];
    logs.forEach((log) => {
      if (!log.mediaUrls) return;
      let urls: string[] = [];
      try {
        urls = JSON.parse(log.mediaUrls);
      } catch {}

      if (!Array.isArray(urls) || urls.length === 0) return;

      const groupInfo = groupMap.get(log.groupId);
      let companyName = groupInfo ? companyMap.get(groupInfo.companyId || '') || 'GRUPO CASEME' : 'COORDINACIÓN';
      if (groupInfo?.groupName?.toUpperCase().includes('DROBOTS')) companyName = 'DROBOTS';
      if (groupInfo?.groupName?.toUpperCase().includes('OPUS')) companyName = 'OPUS INGENIUM';
      if (groupInfo?.groupName?.toUpperCase().includes('VULCAN')) companyName = 'VULCAN FORGE';
      if (groupInfo?.groupName?.toUpperCase().includes('SAINPRO')) companyName = 'SAINPRO';

      let parsedInfo: any = {};
      try {
        if (log.parsedData) parsedInfo = JSON.parse(log.parsedData);
      } catch {}

      urls.forEach((url, urlIdx) => {
        if (!url) return;
        items.push({
          id: `${log.id}_${urlIdx}`,
          logId: log.id,
          url,
          senderName: log.senderName || 'Personal Operativo',
          senderPhone: log.senderPhone,
          groupId: log.groupId,
          groupName: groupInfo?.groupName || log.groupId,
          companyName,
          caption: log.rawMessage || '',
          summary: parsedInfo.summary || '',
          workOrderFolio: groupInfo?.workOrderFolio || parsedInfo.workOrderFolio || null,
          createdAt: log.createdAt,
        });
      });
    });

    return NextResponse.json({
      items,
      totalItems: totalCount,
      page,
      limit,
      companies: Array.from(new Set(Array.from(companyMap.values()))),
      groups: groups.map((g) => ({ id: g.groupId, name: g.groupName || g.groupId })),
    });
  } catch (error: any) {
    console.error('Error fetching evidencias:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
