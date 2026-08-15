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

  return NextResponse.json({ status: 'Perry WhatsApp Intelligence Bot Active' }, { status: 200 });
}

// Webhook Incoming Messages (POST) - 100% Ingestión Informativa Desacoplada (Sin alterar Actividades)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Standardize incoming payload across vendors (UltraMsg, Evolution, Baileys, etc.)
    const payload: IncomingWhatsappPayload = normalizeWhatsappPayload(body);

    if (!payload.messageId || !payload.groupId) {
      return NextResponse.json({ status: 'Ignored: No messageId or groupId' }, { status: 200 });
    }

    // 2. Deduplication check
    const existingLog = await prisma.whatsappMessageLog.findUnique({
      where: { messageId: payload.messageId },
    });
    if (existingLog) {
      return NextResponse.json({ status: 'Already processed (deduplicated)' }, { status: 200 });
    }

    // 3. Manejo de Mensajes Privados Directos (1 a 1 - @c.us o sin @g.us)
    const isPrivateChat = !payload.groupId.endsWith('@g.us');

    if (isPrivateChat) {
      const privateAutoReply = `¡Hola! 🤖 Soy *Perry*, el asistente de inteligencia operativa del consorcio.\n\nActualmente me encuentro en proceso de entrenamiento y conociendo cómo están operando las empresas a través de los grupos de trabajo, por lo que en este momento no estoy en posibilidad de responderte de manera personalizada por este chat privado.\n\n¡Pero te prometo que muy próximamente sí podré hacerlo y podré ayudarte de manera directa! 🚀 Mientras tanto, continuaré recopilando y estructurando los reportes y avances en los grupos de operaciones.\n\n¡Muchas gracias por escribir y que tengas una excelente jornada! 👷🏽`;

      // Enviar respuesta cordial y profesional al usuario en privado
      await sendWhatsappGroupMessage({
        groupId: payload.groupId,
        messageText: privateAutoReply,
        replyToMessageId: payload.messageId,
      });

      // Registrar el contacto privado en logs para auditoría sin crear pseudo-grupos
      await prisma.whatsappMessageLog.create({
        data: {
          messageId: payload.messageId,
          groupId: payload.groupId,
          senderPhone: payload.senderPhone,
          senderName: payload.senderName || 'Contacto Directo',
          rawMessage: payload.messageText || '[Mensaje privado 1 a 1]',
          mediaUrls: payload.mediaUrls && payload.mediaUrls.length > 0 ? JSON.stringify(payload.mediaUrls) : null,
          parsedData: JSON.stringify({
            messageType: 'DIRECT_PRIVATE_CHAT',
            title: 'Mensaje Privado 1 a 1',
            summary: payload.messageText || 'Contacto directo en chat privado',
            tags: ['chat_privado', 'auto_reply'],
            isOperationalEvent: false,
          }),
          activityId: null,
          status: 'AUTO_REPLIED',
        },
      });

      return NextResponse.json({
        status: 'Direct private message handled with auto-reply',
        sender: payload.senderPhone,
      });
    }

    // 4. Group mapping lookup & Auto-discovery (Solo para grupos reales @g.us)
    let groupMap = await prisma.whatsappGroupMapping.findUnique({
      where: { groupId: payload.groupId },
    });

    if (!groupMap) {
      groupMap = await prisma.whatsappGroupMapping.create({
        data: {
          groupId: payload.groupId,
          groupName: payload.groupName || 'Grupo de Operaciones',
          isActive: true,
        },
      });
      console.log(`[WHATSAPP BOT] Nuevo grupo registrado automáticamente: ${groupMap.groupName} (${groupMap.groupId})`);
    } else if (payload.groupName && groupMap.groupName !== payload.groupName) {
      groupMap = await prisma.whatsappGroupMapping.update({
        where: { id: groupMap.id },
        data: { groupName: payload.groupName },
      });
    }

    // If group is explicitly paused/deactivated by admin in Perry App
    if (!groupMap.isActive) {
      return NextResponse.json({ status: 'Group paused / inactive' }, { status: 200 });
    }

    const messageText = payload.messageText?.trim() || '';
    const mediaUrls = payload.mediaUrls || [];
    const hasMedia = mediaUrls.length > 0;
    const isAudio = payload.messageType === 'audio' || payload.messageType === 'ptt' || (mediaUrls.length > 0 && /\.(ogg|mp3|wav|m4a|opus)(\?|$)/i.test(mediaUrls[0]));
    const audioUrl = isAudio ? mediaUrls[0] : null;

    // Check if message is completely empty
    if (!messageText && !hasMedia && !audioUrl) {
      return NextResponse.json({ status: 'Ignored: Empty message' }, { status: 200 });
    }

    // 5. Intelligent AI Parse with Gemini 2.5 Flash (Análisis informativo de contexto + Transcripción de Audio)
    const cleanedText = cleanTriggerTags(messageText);
    const parsed = await parseWhatsappMessageWithGemini({
      messageText: cleanedText,
      senderName: payload.senderName,
      groupWorkOrderFolio: groupMap.workOrderFolio,
      timestamp: payload.timestamp,
      hasMedia,
      audioUrl,
    });

    // Determine representative raw message
    let storedRawMessage = messageText;
    if (parsed.transcription) {
      storedRawMessage = `🎙️ [Nota de voz]: "${parsed.transcription}"`;
    } else if (!storedRawMessage && isAudio) {
      storedRawMessage = '[Nota de voz procesada]';
    } else if (!storedRawMessage && hasMedia) {
      storedRawMessage = '[Evidencia multimedia compartida]';
    }

    // 6. Registro 100% informativo en Supabase (WhatsappMessageLog)
    // NOTA: No se crea ni se altera ninguna Actividad en Perry App.
    const log = await prisma.whatsappMessageLog.create({
      data: {
        messageId: payload.messageId,
        groupId: payload.groupId,
        senderPhone: payload.senderPhone,
        senderName: payload.senderName || 'Personal Operativo',
        rawMessage: storedRawMessage,
        mediaUrls: hasMedia ? JSON.stringify(mediaUrls) : null,
        parsedData: JSON.stringify(parsed),
        activityId: null, // Desacoplado de actividades
        status: 'LOGGED',
      },
    });

    // 7. Verificación si fue invocado explícitamente con @perry
    const isExplicitCall = hasExplicitBotCall(messageText, body);

    if (isExplicitCall) {
      let replyText = `🤖 *Perry Intelligence*\nMensaje registrado en la base de datos informativa.`;
      if (parsed.transcription) {
        replyText += `\n🎙️ Transcripción: _"${parsed.transcription}"_`;
      }
      if (parsed.manPowerEquipo) {
        replyText += `\n📌 Equipo identificado: *${parsed.manPowerEquipo}*`;
      }
      if (parsed.workOrderFolio) {
        replyText += `\n📋 OT: *${parsed.workOrderFolio}*`;
      }
      if (parsed.summary) {
        replyText += `\n📝 Resumen: ${parsed.summary}`;
      }

      await sendWhatsappGroupMessage({
        groupId: payload.groupId,
        messageText: replyText,
        replyToMessageId: payload.messageId,
      });

      await sendWhatsappReaction({
        messageId: payload.messageId,
        groupId: payload.groupId,
        emoji: '🤖',
      });
    }

    return NextResponse.json({
      status: 'Logged successfully in knowledge base',
      logId: log.id,
      messageType: parsed.messageType,
      isOperational: parsed.isOperationalEvent,
      group: groupMap.groupName,
    });
  } catch (error: any) {
    console.error('Error procesando Webhook de WhatsApp:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}

// Check if message specifically tags or asks the bot directly
function hasExplicitBotCall(text: string, rawBody: any): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();

  const directKeywords = ['@perry', '@perrybot', '@copilot', '@co-pilot'];
  if (directKeywords.some(kw => lower.includes(kw))) {
    return true;
  }

  const botPhone = (process.env.WHATSAPP_BOT_PHONE || '').replace(/\D/g, '');
  if (botPhone && lower.includes(botPhone)) {
    return true;
  }

  return false;
}

// Clean trigger tags from message
function cleanTriggerTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/@perrybot|@perry|@copilot|@co-pilot/gi, '')
    .trim();
}

// Normalizer to convert different WhatsApp API payload formats to standard structure
function normalizeWhatsappPayload(body: any): IncomingWhatsappPayload {
  const d = body.data || body;

  const msgId = d.id || d.messageId || body.id || d.key?.id || `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const groupJid = d.chatId || d.from || d.groupId || body.chatId || body.groupId || '';
  const authorPhone = d.author || d.senderPhone || d.from || body.author || '';
  const authorName = d.authorName || d.pushName || d.senderName || 'Personal Operativo';
  const textContent = d.body || d.caption || d.text || d.messageText || body.body || body.text || '';
  
  // Media URL extraction (UltraMsg, Evolution, Baileys, etc.)
  let media: string[] = [];
  if (d.media) media.push(d.media);
  if (d.mediaUrl) media.push(d.mediaUrl);
  if (body.media) media.push(body.media);
  if (body.mediaUrl) media.push(body.mediaUrl);
  if (Array.isArray(d.mediaUrls)) media.push(...d.mediaUrls);

  // Type of message
  let msgType: IncomingWhatsappPayload['messageType'] = 'text';
  if (d.type === 'audio' || body.type === 'audio' || d.type === 'ptt' || body.type === 'ptt') {
    msgType = 'audio';
  } else if (d.type === 'image' || body.type === 'image') {
    msgType = 'image';
  } else if (d.type === 'video' || body.type === 'video') {
    msgType = 'video';
  } else if (d.type === 'document' || body.type === 'document') {
    msgType = 'document';
  } else if (media.length > 0) {
    const firstUrl = (media[0] || '').toLowerCase();
    if (/\.(ogg|mp3|wav|m4a|opus)(\?|$)/i.test(firstUrl)) {
      msgType = 'audio';
    } else {
      msgType = 'image';
    }
  }

  return {
    messageId: String(msgId),
    groupId: String(groupJid),
    groupName: d.groupName || body.groupName || undefined,
    senderPhone: String(authorPhone),
    senderName: String(authorName),
    messageText: textContent,
    mediaUrls: media,
    messageType: msgType,
    timestamp: d.time || d.timestamp || Date.now(),
  };
}

