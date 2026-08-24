import { prisma } from '@/lib/prisma';

/**
 * Optimizes an image URL buffer by fetching it and converting to a lightweight, high-quality data URL or stored URL
 */
export async function optimizeWhatsappImage(imageUrl: string): Promise<string> {
  try {
    if (!imageUrl || imageUrl.startsWith('data:image')) {
      return imageUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[MEDIA-BACKUP] Could not fetch image (${res.status}): ${imageUrl.substring(0, 80)}`);
      return imageUrl;
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    // Return stored data URL for 100% persistence
    return `data:${contentType};base64,${base64}`;
  } catch (err: any) {
    console.error('[MEDIA-BACKUP] Optimization error:', err.message || err);
    return imageUrl;
  }
}

/**
 * Backfill past WhatsApp logs that have external media URLs to persistent storage format
 */
export async function backfillPastWhatsappMedia(limit = 50) {
  try {
    const logsWithMedia = await prisma.whatsappMessageLog.findMany({
      where: {
        mediaUrls: { not: null },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    let updatedCount = 0;
    for (const log of logsWithMedia) {
      if (!log.mediaUrls) continue;
      try {
        let urls: string[] = JSON.parse(log.mediaUrls);
        if (!Array.isArray(urls)) continue;

        let modified = false;
        const newUrls = await Promise.all(
          urls.map(async (url) => {
            if (url && !url.startsWith('data:')) {
              modified = true;
              return await optimizeWhatsappImage(url);
            }
            return url;
          })
        );

        if (modified) {
          await prisma.whatsappMessageLog.update({
            where: { id: log.id },
            data: { mediaUrls: JSON.stringify(newUrls) },
          });
          updatedCount++;
        }
      } catch {}
    }

    return { processed: logsWithMedia.length, updated: updatedCount };
  } catch (err: any) {
    console.error('[MEDIA-BACKUP] Backfill error:', err);
    return { processed: 0, updated: 0, error: err.message };
  }
}
