import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsappGroupMessage } from '@/lib/whatsapp/service';

const TARGET_GROUP_ID = '5216641103189-1594651582@g.us';

// GET or POST /api/cron/critical-update?secret=CRON_SECRET
// Sends a critical items status update to the coordination group at noon.
export async function GET(req: NextRequest) {
  return handleCriticalUpdate(req);
}

export async function POST(req: NextRequest) {
  return handleCriticalUpdate(req);
}

async function handleCriticalUpdate(req: NextRequest) {
  try {
    // Auth
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

    // Fetch all items that are NOT cerrado/descartado, with logs
    const openItems = await prisma.criticalItemTracking.findMany({
      where: {
        groupId: TARGET_GROUP_ID,
        currentStatus: { in: ['ABIERTO', 'EN_PROCESO'] },
      },
      include: {
        logs: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { itemNumber: 'asc' },
    });

    // Fetch items closed today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const closedToday = await prisma.criticalItemTracking.findMany({
      where: {
        groupId: TARGET_GROUP_ID,
        currentStatus: { in: ['CERRADO', 'DESCARTADO'] },
        feedbackAt: { gte: todayStart },
      },
      orderBy: { itemNumber: 'asc' },
    });

    if (openItems.length === 0 && closedToday.length === 0) {
      return NextResponse.json({ status: 'No open critical items to report' });
    }

    // Build message
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-MX', {
      timeZone: 'America/Tijuana',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    let text = `🚨 *ACTUALIZACIÓN DE PUNTOS CRÍTICOS*\n`;
    text += `📅 ${dateStr} — 12:00 PM — Perry Intelligence\n\n`;

    // Filter out any accidentally ingested system update messages
    const validOpenItems = openItems.filter(i => {
      const isSystemMsg = /(ACTUALIZACIÓN DE PUNTOS|SEGUIMIENTO DE PUNTOS|Perry Intelligence|━━━━)/i.test(i.issueText);
      return !isSystemMsg;
    });

    // Group by status
    const enProceso = validOpenItems.filter(i => i.currentStatus === 'EN_PROCESO');
    const sinRespuesta = validOpenItems.filter(i => i.currentStatus === 'ABIERTO');

    if (enProceso.length > 0) {
      text += `━━━━ 🔄 EN PROCESO (${enProceso.length}) ━━━━\n\n`;
      enProceso.forEach(item => {
        text += `#${item.itemNumber} 🔴 ${item.issueText}\n`;
        text += `   🏢 ${item.companyName || 'N/A'}\n`;
        // Show log entries
        const logEntries = item.logs.length > 0 ? item.logs : (item.feedbackBy ? [{
          updatedBy: item.feedbackBy,
          status: item.currentStatus,
          comment: item.feedbackText,
          createdAt: item.feedbackAt || item.updatedAt,
        }] : []);
        if (logEntries.length > 0) {
          text += `   📝 Log:\n`;
          logEntries.forEach((log: any) => {
            const logTime = new Date(log.createdAt).toLocaleString('es-MX', {
              timeZone: 'America/Tijuana',
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            text += `     🔄 *${log.updatedBy}* (${logTime})${log.comment ? ` — "${log.comment}"` : ''}\n`;
          });
        }
        text += `\n`;
      });
    }

    if (sinRespuesta.length > 0) {
      text += `━━━━ ⛔ SIN RESPUESTA (${sinRespuesta.length}) ━━━━\n\n`;
      sinRespuesta.forEach(item => {
        const daysSince = Math.floor((now.getTime() - new Date(item.sentDate).getTime()) / (1000 * 60 * 60 * 24));
        const originTag = (item.aiStatus === 'DETECTADO_PERRY' || item.aiStatus === 'DETECTADO_IA') 
          ? '🤖 *Detectado por Perry*' 
          : `👤 Reportó: ${item.reportedBy || 'Personal Operativo'}`;
        text += `#${item.itemNumber} 🔴 ${item.issueText}\n`;
        text += `   🏢 ${item.companyName || 'N/A'} — ${originTag} — *${daysSince > 0 ? daysSince + ' día(s) sin respuesta' : 'Hoy'}*\n\n`;
      });
    }

    if (closedToday.length > 0) {
      text += `━━━━ ✅ CERRADOS HOY (${closedToday.length}) ━━━━\n\n`;
      closedToday.forEach(item => {
        const icon = item.currentStatus === 'DESCARTADO' ? '🗑️' : '✅';
        text += `#${item.itemNumber} ${icon} ${item.issueText.substring(0, 60)}${item.issueText.length > 60 ? '...' : ''}\n`;
        text += `   ${item.feedbackBy ? `Por: *${item.feedbackBy}*` : ''}${item.feedbackText ? ` — "${item.feedbackText}"` : ''}\n\n`;
      });
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `${enProceso.length} en proceso 🔄 | ${sinRespuesta.length} sin respuesta ⛔ | ${closedToday.length} cerrados hoy ✅\n\n`;
    text += `Para actualizar, respondan con:\n`;
    text += `  ✅ *#1 Cerrado* - comentario\n`;
    text += `  🔄 *#1 En proceso* - comentario\n`;
    text += `  ⛔ *#1 Sin atención*\n`;
    text += `  🗑️ *#1 Descartar* - comentario\n`;
    text += `  🆕 *#Agregar* descripción del nuevo punto\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━`;

    const sent = await sendWhatsappGroupMessage({
      groupId: TARGET_GROUP_ID,
      messageText: text,
    });

    return NextResponse.json({
      status: sent ? 'Critical update sent' : 'Failed to send',
      sent,
      openCount: openItems.length,
      closedTodayCount: closedToday.length,
    });
  } catch (error: any) {
    console.error('[CRON] Critical update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
