import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseWhatsappMessageWithGemini } from '@/lib/whatsapp/parser';
import { sendWhatsappGroupMessage, sendWhatsappVoiceNote } from '@/lib/whatsapp/service';
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
      const privateAutoReply = `¡Hola! 🤖 Soy *Perry*, tu copiloto de inteligencia operativa.\n\nEn este momento me encuentro en fase de entrenamiento dentro de los grupos de trabajo, pero muy pronto podré asistirte de forma directa por este medio.\n\n¡Gracias por escribir! 🚀`;

      // 1) Enviar respuesta cordial y profesional al usuario en privado por escrito
      await sendWhatsappGroupMessage({
        groupId: payload.groupId,
        messageText: privateAutoReply,
        replyToMessageId: payload.messageId,
      });

      // 2) Enviar nota de voz con el mensaje hablado de Perry
      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'https://perryapp.netlify.app';
      const welcomeAudioUrl = `${appBaseUrl.replace(/\/+$/, '')}/audio/perry_welcome.mp3`;

      try {
        await sendWhatsappVoiceNote({
          groupId: payload.groupId,
          audioUrl: welcomeAudioUrl,
          replyToMessageId: payload.messageId,
        });
      } catch (voiceErr) {
        console.error('[WHATSAPP VOICE AUTO-REPLY] Error enviando nota de voz en privado:', voiceErr);
      }

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
            tags: ['chat_privado', 'auto_reply', 'nota_de_voz'],
            isOperationalEvent: false,
          }),
          activityId: null,
          status: 'AUTO_REPLIED',
        },
      });

      return NextResponse.json({
        status: 'Direct private message handled with written auto-reply and voice note',
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

    // 4b. Critical Item Feedback Detection (only in COORDINACION MULTIEMPRESA group)
    const COORD_GROUP_ID = '5216641103189-1594651582@g.us';
    if (payload.groupId === COORD_GROUP_ID && messageText) {
      const criticalFeedbackMatch = messageText.match(/^#(\d+)\s+(cerrado|en proceso|en progreso|sin atenci[oó]n|sin atencion|descartar|cancelar|eliminar|listo|resuelto)/i);
      if (criticalFeedbackMatch) {
        const itemNumber = parseInt(criticalFeedbackMatch[1]);
        const rawStatus = criticalFeedbackMatch[2].toLowerCase();
        const comment = messageText.replace(criticalFeedbackMatch[0], '').replace(/^[\s\-:]+/, '').trim();

        // Map to canonical status
        let newStatus = 'ABIERTO';
        let reactionEmoji = '👀';
        if (/cerrado|listo|resuelto/i.test(rawStatus)) {
          newStatus = 'CERRADO';
          reactionEmoji = '✅';
        } else if (/en proceso|en progreso/i.test(rawStatus)) {
          newStatus = 'EN_PROCESO';
          reactionEmoji = '🔄';
        } else if (/sin atenci|sin atencion/i.test(rawStatus)) {
          newStatus = 'ABIERTO';
          reactionEmoji = '⛔';
        } else if (/descartar|cancelar|eliminar/i.test(rawStatus)) {
          newStatus = 'DESCARTADO';
          reactionEmoji = '🗑️';
        }

        // Find the most recent open item with this number
        const item = await prisma.criticalItemTracking.findFirst({
          where: {
            itemNumber,
            groupId: COORD_GROUP_ID,
            currentStatus: { in: ['ABIERTO', 'EN_PROCESO'] },
          },
          orderBy: { sentDate: 'desc' },
        });

        if (item) {
          const senderName = payload.senderName || payload.senderPhone || 'Coordinador';

          // Update main record (latest feedback)
          await prisma.criticalItemTracking.update({
            where: { id: item.id },
            data: {
              currentStatus: newStatus,
              feedbackBy: senderName,
              feedbackPhone: payload.senderPhone,
              feedbackText: comment || null,
              feedbackAt: new Date(),
            },
          });

          // Create progressive log entry
          await prisma.criticalItemLog.create({
            data: {
              itemId: item.id,
              status: newStatus,
              updatedBy: senderName,
              updatedPhone: payload.senderPhone,
              comment: comment || null,
            },
          });

          // Send short emoji confirmation
          const statusLabels: Record<string, string> = {
            'CERRADO': '✅ Cerrado',
            'EN_PROCESO': '🔄 En proceso',
            'ABIERTO': '⛔ Sin atención',
            'DESCARTADO': '🗑️ Descartado',
          };
          const senderShort = senderName.split(' ')[0];
          await sendWhatsappGroupMessage({
            groupId: payload.groupId,
            messageText: `${reactionEmoji} #${itemNumber} → ${statusLabels[newStatus] || newStatus} (por ${senderShort})`,
          });

          console.log(`[CRITICAL TRACKING] Item #${itemNumber} updated to ${newStatus} by ${senderName} — "${comment}"`);

          // Still log the message normally (continue to Gemini parse below)
        }
      }

      // 4c. Critical Item ADD Detection (#Agregar / #Nuevo)
      const addMatch = messageText.match(/^#(agregar|nuevo|nueva|add)\s+(.+)/is);
      if (addMatch) {
        const issueDescription = addMatch[2].trim();

        // Try to detect company from message context
        const companyKeywords: Record<string, string[]> = {
          'DROBOTS': ['drobots', 'drobot'],
          'OPUS INGENIUM': ['opus', 'infineon'],
          'GRUPO CASEME': ['caseme', 'global support'],
          'VULCAN FORGE': ['vulcan', 'forge'],
          'SAINPRO': ['sainpro'],
        };
        let detectedCompany = 'COORDINACION';
        const lowerText = issueDescription.toLowerCase();
        for (const [company, keywords] of Object.entries(companyKeywords)) {
          if (keywords.some(kw => lowerText.includes(kw))) {
            detectedCompany = company;
            break;
          }
        }

        // Get next item number based on highest open item number
        const maxOpenItem = await prisma.criticalItemTracking.findFirst({
          where: {
            groupId: COORD_GROUP_ID,
            currentStatus: { in: ['ABIERTO', 'EN_PROCESO'] },
          },
          orderBy: { itemNumber: 'desc' },
        });
        const nextNumber = (maxOpenItem?.itemNumber || 0) + 1;

        // Create the new tracking item
        await prisma.criticalItemTracking.create({
          data: {
            itemNumber: nextNumber,
            issueText: issueDescription,
            reportedGroup: COORD_GROUP_ID,
            reportedBy: payload.senderName || payload.senderPhone || 'Coordinador',
            companyName: detectedCompany,
            aiStatus: 'REPORTADO_MANUAL',
            currentStatus: 'ABIERTO',
            groupId: COORD_GROUP_ID,
            sentDate: new Date(),
          },
        });

        const senderShort = (payload.senderName || 'Coordinador').split(' ')[0];
        await sendWhatsappGroupMessage({
          groupId: payload.groupId,
          messageText: `🆕 *#${nextNumber}* agregado al seguimiento (por ${senderShort})\n🏢 ${detectedCompany}\n→ "${issueDescription}"`,
        });

        console.log(`[CRITICAL TRACKING] New item #${nextNumber} added by ${payload.senderName} — "${issueDescription}" (${detectedCompany})`);
      }
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

    // 5b. Automatic AI Critical Directive Detection (Directores/Coordinadores)
    // ONLY create a critical item if Gemini classifies it as a true critical followup or high-impact operational issue
    if (messageText && !messageText.startsWith('#') && parsed.isCriticalFollowup) {
      const isRoutineBroadcast = /(forms\.gle|excelente inicio de semana|buen inicio de semana|registros de horas extras|en caso de tener complicaciones|facturas pendientes de recibo|no podre ir a traila)/i.test(messageText);
      
      if (!isRoutineBroadcast) {
        try {
          const lowerText = messageText.toLowerCase();
          const companyKeywords: Record<string, string[]> = {
            'DROBOTS': ['drobots', 'drobot'],
            'OPUS INGENIUM': ['opus', 'infineon'],
            'GRUPO CASEME': ['caseme', 'global support'],
            'VULCAN FORGE': ['vulcan', 'forge'],
            'SAINPRO': ['sainpro'],
          };
          let detectedCompany = 'COORDINACION';
          for (const [company, keywords] of Object.entries(companyKeywords)) {
            if (keywords.some(kw => lowerText.includes(kw))) {
              detectedCompany = company;
              break;
            }
          }

          // Check for duplicate open item created in last 24h
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const existingItem = await prisma.criticalItemTracking.findFirst({
            where: {
              groupId: COORD_GROUP_ID,
              createdAt: { gte: oneDayAgo },
              currentStatus: { in: ['ABIERTO', 'EN_PROCESO'] },
              issueText: { contains: messageText.substring(0, 30) },
            },
          });

          if (!existingItem) {
            const maxOpenItem = await prisma.criticalItemTracking.findFirst({
              where: {
                groupId: COORD_GROUP_ID,
                currentStatus: { in: ['ABIERTO', 'EN_PROCESO'] },
              },
              orderBy: { itemNumber: 'desc' },
            });
            const nextNumber = (maxOpenItem?.itemNumber || 0) + 1;

            await prisma.criticalItemTracking.create({
              data: {
                itemNumber: nextNumber,
                issueText: messageText.length > 280 ? `${messageText.substring(0, 277)}...` : messageText,
                reportedGroup: groupMap.groupName || payload.groupId,
                reportedBy: payload.senderName || payload.senderPhone || 'Director',
                companyName: detectedCompany,
                aiStatus: 'DETECTADO_PERRY',
                currentStatus: 'ABIERTO',
                groupId: COORD_GROUP_ID,
                sentDate: new Date(),
              },
            });
            console.log(`[CRITICAL AUTO-DETECT] Item #${nextNumber} auto-created from WhatsApp directive by ${payload.senderName}: "${messageText.substring(0, 60)}"`);
          }
        } catch (autoErr) {
          console.error('[CRITICAL AUTO-DETECT] Error auto-creating critical item:', autoErr);
        }
      }
    }

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
    // NOTA: Perry en grupos NO envía mensajes ni notas de voz ni altera Actividades.
    // Opera 100% pasivo y silencioso como base de conocimiento operativa.
    const log = await prisma.whatsappMessageLog.create({
      data: {
        messageId: payload.messageId,
        groupId: payload.groupId,
        senderPhone: payload.senderPhone,
        senderName: payload.senderName || payload.senderPhone || 'Personal Operativo',
        rawMessage: storedRawMessage,
        mediaUrls: hasMedia ? JSON.stringify(mediaUrls) : null,
        parsedData: JSON.stringify(parsed),
        activityId: null, // Desacoplado de actividades
        status: 'LOGGED',
      },
    });

    return NextResponse.json({
      status: 'Logged silently in knowledge base (100% passive memory)',
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
  const authorName = d.authorName || d.pushName || d.pushname || d.notifyName || d.notify_name || d.senderName || d.sender_name || 'Personal Operativo';
  console.log(`[WA] Sender: "${authorName}" | Phone: ${d.author || d.senderPhone || d.from} | Payload keys: ${Object.keys(d).join(',')}`);
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

