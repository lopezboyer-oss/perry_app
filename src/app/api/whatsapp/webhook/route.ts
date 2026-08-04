import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseWhatsappMessageWithGemini } from '@/lib/whatsapp/parser';
import { sendWhatsappReaction, sendWhatsappGroupMessage } from '@/lib/whatsapp/service';
import { IncomingWhatsappPayload } from '@/lib/whatsapp/types';

// Webhook Verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_API_TOKEN || 'perry_whatsapp_bot_secret';

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: 'Perry WhatsApp Bot Webhook Active' }, { status: 200 });
}

// Webhook Incoming Messages (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Standardize incoming payload structure across vendors (UltraMsg, Evolution, Baileys, etc.)
    const payload: IncomingWhatsappPayload = normalizeWhatsappPayload(body);

    if (!payload.messageId || !payload.groupId) {
      return NextResponse.json({ status: 'Ignored: No messageId or groupId' }, { status: 200 });
    }

    // 1. Deduplication check
    const existingLog = await prisma.whatsappMessageLog.findUnique({
      where: { messageId: payload.messageId },
    });
    if (existingLog) {
      return NextResponse.json({ status: 'Already processed' }, { status: 200 });
    }

    // 2. Group mapping lookup
    let groupMap = await prisma.whatsappGroupMapping.findUnique({
      where: { groupId: payload.groupId },
    });

    // Auto-register group mapping if new
    if (!groupMap) {
      groupMap = await prisma.whatsappGroupMapping.create({
        data: {
          groupId: payload.groupId,
          groupName: payload.groupName || 'Grupo WhatsApp Campo',
          isActive: true,
        },
      });
    }

    if (!groupMap.isActive) {
      return NextResponse.json({ status: 'Group inactive' }, { status: 200 });
    }

    const messageText = payload.messageText?.trim() || '';
    const mediaUrls = payload.mediaUrls || [];

    // Check if message is empty and has no media
    if (!messageText && mediaUrls.length === 0) {
      return NextResponse.json({ status: 'Empty message' }, { status: 200 });
    }

    // 3. ALBUM BURST HANDLING (< 60 seconds)
    // If a technician sends multiple photos (album burst), WhatsApp sends multiple events milliseconds apart.
    // The 1st event carries text with tag/equipo, while subsequent photo events carry empty captions.
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    const recentActivityLog = await prisma.whatsappMessageLog.findFirst({
      where: {
        groupId: payload.groupId,
        senderPhone: payload.senderPhone,
        status: 'PROCESSED',
        activityId: { not: null },
        createdAt: { gte: sixtySecondsAgo },
      },
      orderBy: { createdAt: 'desc' },
      include: { activity: true },
    });

    // If there is an active activity created in the last 60s for this tech in this group, AND this message has media or no explicit new equipo
    if (recentActivityLog && recentActivityLog.activity && (mediaUrls.length > 0 || !messageText)) {
      const formattedPhotos = mediaUrls.map((url, idx) => ({
        id: `wa_${Date.now()}_${idx}`,
        url,
        uploadedBy: payload.senderName || 'Técnico via WhatsApp',
        uploadedAt: new Date().toISOString(),
      }));

      let existingPhotos: any[] = [];
      if (recentActivityLog.activity.manPowerPhotos) {
        try { existingPhotos = JSON.parse(recentActivityLog.activity.manPowerPhotos); } catch {}
      }
      const updatedPhotos = [...existingPhotos, ...formattedPhotos];

      let updatedNotes = recentActivityLog.activity.weekendNotes || '';
      if (messageText && !updatedNotes.includes(messageText)) {
        updatedNotes += `\n[WhatsApp - ${payload.senderName || 'Técnico'}]: ${messageText}`;
      }

      await prisma.activity.update({
        where: { id: recentActivityLog.activity.id },
        data: {
          manPowerPhotos: JSON.stringify(updatedPhotos),
          weekendNotes: updatedNotes,
          reportSource: 'WHATSAPP_BOT',
        },
      });

      // Log secondary burst photo
      await prisma.whatsappMessageLog.create({
        data: {
          messageId: payload.messageId,
          groupId: payload.groupId,
          senderPhone: payload.senderPhone,
          senderName: payload.senderName || 'Técnico',
          rawMessage: messageText || '[Foto de ráfaga / álbum]',
          mediaUrls: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
          parsedData: JSON.stringify({ isBurstMedia: true, targetActivityId: recentActivityLog.activity.id }),
          activityId: recentActivityLog.activity.id,
          status: 'PROCESSED',
        },
      });

      // Silent reaction with 🤖 emoji
      await sendWhatsappReaction({
        messageId: payload.messageId,
        groupId: payload.groupId,
        emoji: '🤖',
      });

      return NextResponse.json({
        status: 'Success (Appended to 60s burst album)',
        activityId: recentActivityLog.activity.id,
        manPowerEquipo: recentActivityLog.activity.manPowerEquipo,
      });
    }

    // 4. TRIGGER TAG / EQUIPO CHECK: Process messages tagged with @Perry, #reporte, #equipo OR specifying an equipment code (C-10, EQ-01, etc.)
    const isTaggedMessage = hasBotTriggerTag(messageText, body);
    if (!isTaggedMessage && mediaUrls.length === 0) {
      await prisma.whatsappMessageLog.create({
        data: {
          messageId: payload.messageId,
          groupId: payload.groupId,
          senderPhone: payload.senderPhone,
          senderName: payload.senderName || 'Usuario',
          rawMessage: messageText,
          mediaUrls: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
          parsedData: JSON.stringify({ triggerTagPresent: false }),
          status: 'CHAT_IGNORED',
        },
      });

      return NextResponse.json({ status: 'Ignored: No bot trigger tag or equipment' }, { status: 200 });
    }

    // Clean trigger tags from message before passing to Gemini
    const cleanedText = cleanTriggerTags(messageText);

    // 5. Check for pending context thread (if tech is replying to a missing info prompt)
    const pendingLog = await prisma.whatsappMessageLog.findFirst({
      where: {
        groupId: payload.groupId,
        senderPhone: payload.senderPhone,
        status: 'PENDING_INFO',
      },
      orderBy: { createdAt: 'desc' },
    });

    let combinedText = cleanedText;
    if (pendingLog && pendingLog.rawMessage) {
      combinedText = `${pendingLog.rawMessage}\n[Dato Adicional enviado]: ${cleanedText}`;
    }

    // 6. AI Parse using Gemini 2.5 Flash
    const parsed = await parseWhatsappMessageWithGemini({
      messageText: combinedText,
      senderName: payload.senderName,
      groupWorkOrderFolio: groupMap.workOrderFolio,
      timestamp: payload.timestamp,
    });

    const workOrderFolio = parsed.workOrderFolio || groupMap.workOrderFolio || null;

    // 7. If missing vital info (manPowerEquipo), request info using simplified prompt (with 15s burst throttling)
    if (!parsed.isComplete || !parsed.manPowerEquipo) {
      const log = await prisma.whatsappMessageLog.create({
        data: {
          messageId: payload.messageId,
          groupId: payload.groupId,
          senderPhone: payload.senderPhone,
          senderName: payload.senderName || 'Técnico',
          rawMessage: combinedText,
          mediaUrls: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
          parsedData: JSON.stringify(parsed),
          status: 'PENDING_INFO',
          missingField: 'manPowerEquipo',
        },
      });

      // Check if another PENDING_INFO log was created for this tech/group in the last 15 seconds (to avoid prompt spam during multi-photo burst)
      const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
      const previousRecentPending = await prisma.whatsappMessageLog.findFirst({
        where: {
          groupId: payload.groupId,
          senderPhone: payload.senderPhone,
          status: 'PENDING_INFO',
          id: { not: log.id },
          createdAt: { gte: fifteenSecondsAgo },
        },
      });

      // Only send prompt message if no prompt was sent in the last 15 seconds
      if (!previousRecentPending) {
        const promptText = `🤖 Gracias ${payload.senderName || 'Técnico'}, apóyame con el NÚMERO DE EQUIPO para registrar tu reporte`;
        await sendWhatsappGroupMessage({
          groupId: payload.groupId,
          messageText: promptText,
          replyToMessageId: payload.messageId,
        });
      }

      return NextResponse.json({ status: 'Prompted for missing info', logId: log.id });
    }

    // 8. Complete Data: Create/Update Activity in Perry App
    let sampleActivity = null;
    if (workOrderFolio) {
      sampleActivity = await prisma.activity.findFirst({
        where: { workOrderFolio: workOrderFolio.trim() },
        select: { clientId: true, companyId: true, purchaseOrder: true, projectArea: true },
      });
    }

    // Format photos array for manPowerPhotos
    let formattedPhotos = mediaUrls.map((url, idx) => ({
      id: `wa_${Date.now()}_${idx}`,
      url,
      uploadedBy: payload.senderName || 'Técnico via WhatsApp',
      uploadedAt: new Date().toISOString(),
    }));

    // RETROACTIVE MEDIA CLAIM: Claim any pending photos sent by this tech in the last 120s before text arrived
    const twoMinutesAgo = new Date(Date.now() - 120 * 1000);
    const unattachedPendingLogs = await prisma.whatsappMessageLog.findMany({
      where: {
        groupId: payload.groupId,
        senderPhone: payload.senderPhone,
        status: 'PENDING_INFO',
        createdAt: { gte: twoMinutesAgo },
      },
    });

    for (const pLog of unattachedPendingLogs) {
      if (pLog.mediaUrls) {
        try {
          const pendingMediaArr: string[] = JSON.parse(pLog.mediaUrls);
          pendingMediaArr.forEach((pUrl, pIdx) => {
            if (!formattedPhotos.some(fp => fp.url === pUrl)) {
              formattedPhotos.push({
                id: `wa_pending_${Date.now()}_${pIdx}`,
                url: pUrl,
                uploadedBy: payload.senderName || 'Técnico via WhatsApp',
                uploadedAt: new Date().toISOString(),
              });
            }
          });
        } catch {}
      }
    }

    // Find existing activity for this workOrder + equipo or create new one
    let targetActivity = null;
    if (workOrderFolio && parsed.manPowerEquipo) {
      targetActivity = await prisma.activity.findFirst({
        where: {
          workOrderFolio: workOrderFolio.trim(),
          manPowerEquipo: parsed.manPowerEquipo,
          isManPower: true,
        },
      });
    }

    if (targetActivity) {
      // Append new notes and photos to existing activity
      const currentNotes = targetActivity.weekendNotes ? `${targetActivity.weekendNotes}\n` : '';
      const newNotes = `${currentNotes}[WhatsApp ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} - ${payload.senderName || 'Técnico'}]: ${parsed.weekendNotes || parsed.title}`;
      
      let existingPhotos: any[] = [];
      if (targetActivity.manPowerPhotos) {
        try { existingPhotos = JSON.parse(targetActivity.manPowerPhotos); } catch {}
      }
      const updatedPhotos = [...existingPhotos, ...formattedPhotos];

      targetActivity = await prisma.activity.update({
        where: { id: targetActivity.id },
        data: {
          weekendNotes: newNotes,
          equipmentStatus: parsed.equipmentStatus || targetActivity.equipmentStatus,
          manPowerPhotos: JSON.stringify(updatedPhotos),
          reportSource: 'WHATSAPP_BOT',
        },
      });
    } else {
      // Create new Activity
      targetActivity = await prisma.activity.create({
        data: {
          title: parsed.title,
          type: 'EJECUCION',
          isManPower: true,
          workOrderFolio: workOrderFolio ? workOrderFolio.trim() : null,
          purchaseOrder: sampleActivity?.purchaseOrder || null,
          clientId: sampleActivity?.clientId || null,
          companyId: sampleActivity?.companyId || null,
          projectArea: sampleActivity?.projectArea || 'CAMPO',
          date: new Date(),
          status: 'PENDIENTE',
          manPowerEquipo: parsed.manPowerEquipo,
          weekendNotes: parsed.weekendNotes || parsed.title,
          equipmentStatus: parsed.equipmentStatus || 'OPERATIVO',
          startTime: parsed.startTime || null,
          endTime: parsed.endTime || null,
          manPowerPhotos: formattedPhotos.length > 0 ? JSON.stringify(formattedPhotos) : null,
          reportSource: 'WHATSAPP_BOT',
        },
      });
    }

    // Insert extracted parts if any
    if (parsed.parts && parsed.parts.length > 0) {
      for (const part of parsed.parts) {
        await prisma.activityPart.create({
          data: {
            activityId: targetActivity.id,
            name: part.name,
            quantity: part.quantity || 1,
            providerType: part.providerType || 'COTIZAR',
            status: 'VALIDANDO',
            notes: `Reportado vía WhatsApp por ${payload.senderName || 'Técnico'}`,
          },
        });
      }
    }

    // Resolve all previous pending logs for this thread & react 🤖 to pending messages
    for (const pLog of unattachedPendingLogs) {
      await prisma.whatsappMessageLog.update({
        where: { id: pLog.id },
        data: { status: 'RESOLVED', activityId: targetActivity.id },
      });
      await sendWhatsappReaction({
        messageId: pLog.messageId,
        groupId: payload.groupId,
        emoji: '🤖',
      });
    }

    if (pendingLog) {
      await prisma.whatsappMessageLog.update({
        where: { id: pendingLog.id },
        data: { status: 'RESOLVED', activityId: targetActivity.id },
      });
    }

    // Record message log
    await prisma.whatsappMessageLog.create({
      data: {
        messageId: payload.messageId,
        groupId: payload.groupId,
        senderPhone: payload.senderPhone,
        senderName: payload.senderName || 'Técnico',
        rawMessage: combinedText,
        mediaUrls: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
        parsedData: JSON.stringify(parsed),
        activityId: targetActivity.id,
        status: 'PROCESSED',
      },
    });

    // 9. Silent confirmation: React with 🤖 emoji on tech's message!
    await sendWhatsappReaction({
      messageId: payload.messageId,
      groupId: payload.groupId,
      emoji: '🤖',
    });

    return NextResponse.json({
      status: 'Success',
      activityId: targetActivity.id,
      manPowerEquipo: parsed.manPowerEquipo,
    });
  } catch (error: any) {
    console.error('Error procesando Webhook de WhatsApp:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}

// Check if message text or raw payload contains bot trigger tag (@Perry, #reporte, @copilot, #equipo, etc.) OR an equipment code
function hasBotTriggerTag(text: string, rawBody: any): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();

  // 1. Explicit Trigger Keywords & Hashtags
  const triggerKeywords = [
    '@perry',
    '@copilot',
    '@co-pilot',
    '@perrybot',
    '#reporte',
    '#reporte',
    '#manpower',
    '#equipo',
    '#actividad',
  ];

  if (triggerKeywords.some(kw => lower.includes(kw))) {
    return true;
  }

  // 2. Explicit equipment mention (e.g. C-10, EQ-0105, G-02, A20, EQUIPO 102)
  if (/\b(equipo|eq-?|c-|g-|a-?|grúa|grua)\s*([a-z0-9-]{1,10})/i.test(text)) {
    return true;
  }

  // 3. Check if raw message contains @mentions array or phone number tags
  const botPhone = (process.env.WHATSAPP_BOT_PHONE || '').replace(/\D/g, '');
  if (botPhone && lower.includes(botPhone)) {
    return true;
  }

  return false;
}

// Clean trigger tags like @Perry, @copilot, #reporte from text before passing to Gemini
function cleanTriggerTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/@perrybot|@perry|@copilot|@co-pilot|#reporte|#manpower/gi, '')
    .trim();
}

// Normalizer to convert different WhatsApp API payload formats (UltraMsg, Evolution, etc.) to standard structure
function normalizeWhatsappPayload(body: any): IncomingWhatsappPayload {
  // UltraMsg Event Wrapper format (body.data)
  const d = body.data || body;

  const msgId = d.id || d.messageId || body.id || d.key?.id || '';
  const groupJid = d.chatId || d.from || d.groupId || body.chatId || body.groupId || '';
  const authorPhone = d.author || d.senderPhone || d.from || body.author || '';
  const authorName = d.authorName || d.pushName || d.senderName || 'Técnico';
  const textContent = d.body || d.caption || d.text || d.messageText || body.body || body.text || '';
  
  // Media URL extraction (UltraMsg provides 'media' or 'mediaUrl')
  let media: string[] = [];
  if (d.media) media.push(d.media);
  if (d.mediaUrl) media.push(d.mediaUrl);
  if (body.media) media.push(body.media);

  return {
    messageId: msgId,
    groupId: groupJid,
    groupName: d.groupName || body.groupName,
    senderPhone: authorPhone,
    senderName: authorName,
    messageText: textContent,
    mediaUrls: media,
    timestamp: d.time || d.timestamp || Date.now(),
  };
}
