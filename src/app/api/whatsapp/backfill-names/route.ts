import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// POST /api/whatsapp/backfill-names
// Backfills senderName for historical records stored as 'Personal Operativo'
// by building a phone→name mapping from newer records that have real names.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Get all distinct (senderPhone, senderName) pairs where name is NOT generic
    const knownNames = await prisma.whatsappMessageLog.findMany({
      where: {
        senderName: {
          notIn: ['Personal Operativo', 'Contacto Directo', 'Usuario Remitente', ''],
        },
      },
      select: {
        senderPhone: true,
        senderName: true,
      },
      distinct: ['senderPhone'],
      orderBy: { createdAt: 'desc' }, // prefer the most recent name
    });

    // 2. Build phone → name map
    const phoneToName = new Map<string, string>();
    knownNames.forEach((record) => {
      if (record.senderPhone && record.senderName) {
        phoneToName.set(record.senderPhone, record.senderName);
      }
    });

    if (phoneToName.size === 0) {
      return NextResponse.json({
        status: 'No real names found yet. Wait for new messages to arrive with real sender names.',
        knownPhonesCount: 0,
        updatedCount: 0,
      });
    }

    // 3. Update all 'Personal Operativo' records that have a matching phone
    let totalUpdated = 0;
    const updates: Array<{ phone: string; name: string; count: number }> = [];

    for (const [phone, name] of phoneToName) {
      const result = await prisma.whatsappMessageLog.updateMany({
        where: {
          senderPhone: phone,
          senderName: {
            in: ['Personal Operativo', 'Contacto Directo', 'Usuario Remitente'],
          },
        },
        data: {
          senderName: name,
        },
      });

      if (result.count > 0) {
        updates.push({ phone, name, count: result.count });
        totalUpdated += result.count;
      }
    }

    return NextResponse.json({
      status: 'Backfill complete',
      knownPhonesCount: phoneToName.size,
      totalRecordsUpdated: totalUpdated,
      details: updates,
    });
  } catch (error: any) {
    console.error('Error in backfill-names:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
