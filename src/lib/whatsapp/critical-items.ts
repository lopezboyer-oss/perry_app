import { prisma } from '@/lib/prisma';

export const COORD_GROUP_ID = '5216641103189-1594651582@g.us';

/**
 * Renumbers all active (ABIERTO / EN_PROCESO) critical items starting from #1 sequentially.
 * Oldest active items are placed first (#1, #2, etc.).
 * Closed and discarded items retain their historical numbers.
 */
export async function renumberOpenCriticalItems(groupId: string = COORD_GROUP_ID) {
  try {
    const openItems = await prisma.criticalItemTracking.findMany({
      where: {
        groupId,
        currentStatus: { in: ['ABIERTO', 'EN_PROCESO'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    const updates = [];
    for (let i = 0; i < openItems.length; i++) {
      const item = openItems[i];
      const newNumber = i + 1;
      if (item.itemNumber !== newNumber) {
        updates.push(
          prisma.criticalItemTracking.update({
            where: { id: item.id },
            data: { itemNumber: newNumber },
          })
        );
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    console.log(`[CRITICAL RENUMBER] Renumbered ${openItems.length} open items. Updated ${updates.length} records.`);
    return { totalOpen: openItems.length, renumberedCount: updates.length };
  } catch (error) {
    console.error('[CRITICAL RENUMBER] Error renumbering items:', error);
    throw error;
  }
}
