import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsappGroupMessage } from '@/lib/whatsapp/service';

const TARGET_GROUP_ID = '5216641103189-1594651582@g.us';

// GET or POST /api/cron/daily-summary?secret=YOUR_CRON_SECRET
// Called by an external cron service (e.g., cron-job.org) daily at 8 PM Tijuana time.
// Generates the director summary for today and sends it to the coordination group.
export async function GET(req: NextRequest) {
  return handleCronSummary(req);
}

export async function POST(req: NextRequest) {
  return handleCronSummary(req);
}

async function handleCronSummary(req: NextRequest) {
  try {
    // 1. Verify CRON_SECRET (via query param or header)
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

    // 2. Call director-summary API internally
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'https://perryapp.netlify.app';
    const summaryRes = await fetch(`${appUrl}/api/whatsapp/director-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ period: 'today' }),
    });

    if (!summaryRes.ok) {
      const errText = await summaryRes.text();
      console.error('[CRON] Director summary API error:', summaryRes.status, errText);
      return NextResponse.json({ error: 'Failed to generate summary', details: errText }, { status: 500 });
    }

    const data = await summaryRes.json();
    const summary = data.summary;

    if (!summary || !summary.executiveSummary) {
      return NextResponse.json({ error: 'No summary data returned' }, { status: 500 });
    }

    // 3. Format as WhatsApp message
    const text = formatDirectorSummaryForWhatsApp(summary);

    // 4. Send greeting + summary to group
    const greeting = `Buenas noches coordinadores, les comparto el resumen ejecutivo Multiempresa del día de hoy. 🤖📊`;
    const fullMessage = `${greeting}\n\n${text}`;

    const sent = await sendWhatsappGroupMessage({
      groupId: TARGET_GROUP_ID,
      messageText: fullMessage,
    });

    return NextResponse.json({
      status: sent ? 'Summary sent successfully' : 'Failed to send via WhatsApp',
      sent,
      groupId: TARGET_GROUP_ID,
      messageLength: fullMessage.length,
    });
  } catch (error: any) {
    console.error('[CRON] Daily summary error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function formatDirectorSummaryForWhatsApp(summary: any): string {
  const periodName = summary.period || 'Hoy';

  let text = `👔 *RESUMEN EJECUTIVO PARA DIRECCIÓN*\n`;
  text += `*PERRY INTELLIGENCE*\n`;
  text += `📅 *Periodo:* ${periodName}\n`;
  text += `👥 *Grupos WhatsApp:* ${summary.totalGroupsAnalyzed || 0} | 💬 *Mensajes:* ${summary.messageCount || 0}`;
  if (summary.activityCount) {
    text += ` | 📋 *Actividades Perry:* ${summary.activityCount}`;
  }
  text += `\n\n`;

  text += `📌 *SÍNTESIS GENERAL:* \n${summary.executiveSummary}\n\n`;

  if (summary.companySummaries && summary.companySummaries.length > 0) {
    text += `🏢 *DESGLOSE POR EMPRESA*\n`;
    summary.companySummaries.forEach((c: any) => {
      text += `• *${c.companyName}:*\n  ${c.summary}\n\n`;
    });
  }

  if (summary.sharedTopicsSummary) {
    text += `🌐 *RECURSOS Y TEMAS TRANSVERSALES COMPARTIDOS*\n${summary.sharedTopicsSummary}\n\n`;
  }

  if (summary.resolvedCrossIssues && summary.resolvedCrossIssues.length > 0) {
    text += `🟢 *ASUNTOS RESUELTOS CRUZADOS (${summary.resolvedCrossIssues.length})*\n`;
    summary.resolvedCrossIssues.forEach((item: any, i: number) => {
      text += `${i + 1}. *${item.issue}*\n   • Detalle: ${item.resolutionDetails}\n   • Campo: _${item.originGroup}_ -> Gestión: _${item.resolutionGroup}_\n`;
    });
    text += `\n`;
  }

  if (summary.unresolvedCriticalPending && summary.unresolvedCriticalPending.length > 0) {
    text += `🔴 *PENDIENTES CRÍTICOS REALES (${summary.unresolvedCriticalPending.length})*\n`;
    summary.unresolvedCriticalPending.forEach((item: any, i: number) => {
      text += `${i + 1}. *${item.issue}*\n   • Grupo: _${item.reportedGroup}_${item.reportedBy ? ` — Reportó: *${item.reportedBy}*` : ''} | Estatus: *${item.status}*\n`;
    });
    text += `\n`;
  }

  if (summary.globalMaterialRequests && summary.globalMaterialRequests.length > 0) {
    text += `📦 *SOLICITUDES DE MATERIALES (${summary.globalMaterialRequests.length})*\n`;
    summary.globalMaterialRequests.forEach((mat: any) => {
      text += `• *${mat.name}* (Cant: ${mat.quantity}) - _${mat.requestedInGroup}_${mat.requestedBy ? ` — Solicitó: *${mat.requestedBy}*` : ''}\n`;
    });
    text += `\n`;
  }

  if (summary.directorRecommendations && summary.directorRecommendations.length > 0) {
    text += `👔 *RECOMENDACIONES DIRECTIVAS*\n`;
    summary.directorRecommendations.forEach((rec: string, i: number) => {
      text += `${i + 1}. ${rec}\n`;
    });
    text += `\n`;
  }

  text += `_\nReporte generado automáticamente por Perry Intelligence 🤖_`;

  return text;
}
