import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsappGroupMessage } from '@/lib/whatsapp/service';

const TARGET_GROUP_ID = '5216641103189-1594651582@g.us';

// POST /api/whatsapp/send-critical-items
// Sends the critical items tracking message to the coordination group
// and saves each item to the CriticalItemTracking table.
export async function POST(req: NextRequest) {
  try {
    // Auth: CRON_SECRET or check manually
    const { searchParams } = new URL(req.url);
    const secretFromUrl = searchParams.get('secret');
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isAuthorized = cronSecret && (
      secretFromUrl === cronSecret ||
      authHeader === `Bearer ${cronSecret}`
    );
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any = {};
    try { body = await req.json(); } catch {}

    const items: Array<{
      issueText: string;
      reportedGroup: string;
      reportedBy: string;
      companyName: string;
      aiStatus: string;
    }> = body.items || [];

    if (items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const now = new Date();

    // Group items by company
    const byCompany = new Map<string, typeof items>();
    items.forEach((item) => {
      const company = item.companyName || 'General';
      if (!byCompany.has(company)) byCompany.set(company, []);
      byCompany.get(company)!.push(item);
    });

    // Build WhatsApp message
    let text = `🚨 *SEGUIMIENTO DE PUNTOS CRÍTICOS*\n`;
    text += `📅 ${now.toLocaleDateString('es-MX', { timeZone: 'America/Tijuana', day: '2-digit', month: 'long', year: 'numeric' })} — Perry Intelligence\n\n`;

    let globalIdx = 1;
    const dbItems: Array<any> = [];

    byCompany.forEach((companyItems, companyName) => {
      text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🏢 *${companyName.toUpperCase()}* (${companyItems.length} punto${companyItems.length > 1 ? 's' : ''})\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      companyItems.forEach((item) => {
        const statusIcon = item.aiStatus.includes('ESPERA') ? '⚠️' :
          item.aiStatus.includes('SIN_SEGUIMIENTO') ? '🚫' : '🔺';

        text += `#${globalIdx} 🔴 ${item.issueText}\n`;
        text += `   📍 ${item.reportedGroup}\n`;
        text += `   👤 Reportó: ${item.reportedBy || 'Personal Operativo'}\n`;
        text += `   ${statusIcon} ${item.aiStatus}\n\n`;

        dbItems.push({
          itemNumber: globalIdx,
          issueText: item.issueText,
          reportedGroup: item.reportedGroup,
          reportedBy: item.reportedBy || null,
          companyName,
          aiStatus: item.aiStatus,
          currentStatus: 'ABIERTO',
          groupId: TARGET_GROUP_ID,
          sentDate: now,
        });

        globalIdx++;
      });
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `${items.length} puntos críticos abiertos 🔴\n\n`;
    text += `Para actualizar, respondan con:\n`;
    text += `  ✅ *#1 Cerrado* - comentario\n`;
    text += `  🔄 *#1 En proceso* - comentario\n`;
    text += `  ⛔ *#1 Sin atención*\n`;
    text += `  🗑️ *#1 Descartar* - comentario\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━`;

    // Save all items to DB
    await prisma.criticalItemTracking.createMany({
      data: dbItems,
    });

    // Send to WhatsApp
    const sent = await sendWhatsappGroupMessage({
      groupId: TARGET_GROUP_ID,
      messageText: text,
    });

    return NextResponse.json({
      status: sent ? 'Critical items sent and tracked' : 'Failed to send',
      sent,
      itemCount: items.length,
    });
  } catch (error: any) {
    console.error('[CRITICAL] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
