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

    // 2. Fetch Activity photos
    const activityWhere: any = {
      OR: [
        { photosBefore: { not: null } },
        { photosAfter: { not: null } },
        { manPowerPhotos: { not: null } },
      ],
    };

    if (startDate || endDate) {
      activityWhere.date = {};
      if (startDate) activityWhere.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        activityWhere.date.lte = end;
      }
    }

    if (search) {
      activityWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { workOrderFolio: { contains: search, mode: 'insensitive' } },
        { projectArea: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Query DB for logs & activities
    const [totalCount, logs, activitiesWithPhotos] = await Promise.all([
      prisma.whatsappMessageLog.count({ where }),
      prisma.whatsappMessageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activity.findMany({
        where: activityWhere,
        include: {
          user: { select: { name: true } },
          client: { select: { name: true } },
          company: { select: { name: true, shortName: true } },
        },
        orderBy: { date: 'desc' },
        take: 100,
      }),
    ]);

    // Format evidencias list from WhatsApp logs
    const items: any[] = [];
    logs.forEach((log) => {
      if (!log.mediaUrls) return;
      let urls: string[] = [];
      try {
        urls = JSON.parse(log.mediaUrls);
      } catch {}

      if (!Array.isArray(urls) || urls.length === 0) return;

      const groupInfo = groupMap.get(log.groupId || '');
      const gNameUpper = (groupInfo?.groupName || '').toUpperCase();
      let companyName = groupInfo ? companyMap.get(groupInfo.companyId || '') || 'GRUPO CASEME' : 'COORDINACIÓN MULTIEMPRESA';
      
      if (gNameUpper.includes('DROBOTS')) companyName = 'DROBOTS';
      else if (gNameUpper.includes('OPUS')) companyName = 'OPUS INGENIUM';
      else if (gNameUpper.includes('VULCAN')) companyName = 'VULCAN FORGE';
      else if (gNameUpper.includes('SAINPRO')) companyName = 'SAINPRO';
      else if (gNameUpper.includes('ALTURA')) companyName = 'ALTURA TEAM (ELEVACIÓN)';
      else if (gNameUpper.includes('AVANCE') || gNameUpper.includes('CONTROL')) companyName = 'CONTROL Y AVANCE';
      else if (gNameUpper.includes('COORDINACION') || gNameUpper.includes('COORDINACIÓN')) companyName = 'COORDINACIÓN MULTIEMPRESA';

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
          source: 'WHATSAPP',
        });
      });
    });

    // Format evidencias list from Activity uploads
    activitiesWithPhotos.forEach((act) => {
      const allPhotoJson = [act.photosBefore, act.photosAfter, act.manPowerPhotos].filter(Boolean);
      allPhotoJson.forEach((jsonStr) => {
        let photoArray: any[] = [];
        try {
          photoArray = typeof jsonStr === 'string' ? JSON.parse(jsonStr as string) : jsonStr;
        } catch {}
        if (!Array.isArray(photoArray)) return;

        photoArray.forEach((p, pIdx) => {
          if (!p.url) return;
          items.push({
            id: `act_${act.id}_${p.id || pIdx}`,
            logId: act.id,
            url: p.url,
            senderName: p.uploadedBy || act.user?.name || 'Registro en Actividad',
            senderPhone: '',
            groupId: 'ACTIVIDADES',
            groupName: `Actividad: ${act.title}`,
            companyName: act.company?.name || 'GRUPO CASEME',
            caption: `[Actividad] ${act.title}${act.projectArea ? ' - ' + act.projectArea : ''}`,
            summary: `Cliente: ${act.client?.name || 'N/A'} | Folio: ${act.workOrderFolio || 'N/A'}`,
            workOrderFolio: act.workOrderFolio || null,
            activityId: act.id,
            createdAt: p.uploadedAt || act.createdAt,
            source: 'ACTIVIDAD',
          });
        });
      });
    });

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
