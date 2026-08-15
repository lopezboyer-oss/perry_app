/**
 * Servicio para interactuar con la API del proveedor de WhatsApp (UltraMsg / Evolution API / etc.)
 * Soporta envío de reacciones (emoji) y mensajes de texto para peticiones de información.
 */

function buildUltraMsgUrl(apiUrl: string, instanceId: string | undefined, path: string): string {
  let cleanUrl = apiUrl.trim().replace(/\/+$/, '');
  // If user provided base URL like https://api.ultramsg.com and instanceId instanceXXXXX
  if (instanceId && instanceId.trim() && !cleanUrl.includes(instanceId.trim())) {
    cleanUrl = `${cleanUrl}/${instanceId.trim()}`;
  }
  return `${cleanUrl}/${path.replace(/^\/+/, '')}`;
}

export async function sendWhatsappReaction(params: {
  messageId: string;
  groupId: string;
  emoji: string; // ej: "🤖"
}): Promise<boolean> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;

  if (!apiUrl || !apiToken) {
    console.log(`[WHATSAPP BOT MOCK REACTION] Reaccionando con ${params.emoji} al mensaje ${params.messageId} en grupo ${params.groupId}`);
    return true;
  }

  try {
    const url = buildUltraMsgUrl(apiUrl, instanceId, 'messages/reaction');

    // Form data payload for UltraMsg API (UltraMsg expects token, msgId, icon)
    const bodyParams = new URLSearchParams();
    bodyParams.append('token', apiToken);
    bodyParams.append('msgId', params.messageId);
    bodyParams.append('icon', params.emoji);
    bodyParams.append('reaction', params.emoji);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('UltraMsg Reaction API Error:', res.status, errText);
    }

    return res.ok;
  } catch (error) {
    console.error('Error enviando reacción a WhatsApp:', error);
    return false;
  }
}

export async function sendWhatsappGroupMessage(params: {
  groupId: string;
  messageText: string;
  replyToMessageId?: string;
}): Promise<boolean> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;

  if (!apiUrl || !apiToken) {
    console.log(`[WHATSAPP BOT MOCK MESSAGE] Enviando al grupo ${params.groupId}:\n${params.messageText}`);
    return true;
  }

  try {
    const url = buildUltraMsgUrl(apiUrl, instanceId, 'messages/chat');

    const bodyParams = new URLSearchParams();
    bodyParams.append('token', apiToken);
    bodyParams.append('to', params.groupId);
    bodyParams.append('body', params.messageText);
    if (params.replyToMessageId) {
      bodyParams.append('msgId', params.replyToMessageId);
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('UltraMsg Chat API Error:', res.status, errText);
    }

    return res.ok;
  } catch (error) {
    console.error('Error enviando mensaje a WhatsApp:', error);
    return false;
  }
}

export async function sendWhatsappVoiceNote(params: {
  groupId: string;
  audioUrl: string;
  replyToMessageId?: string;
}): Promise<boolean> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;

  console.log(`[WHATSAPP VOICE] Intentando enviar nota de voz:`, {
    to: params.groupId,
    audioUrl: params.audioUrl,
    hasApiUrl: !!apiUrl,
    hasApiToken: !!apiToken,
    hasInstanceId: !!instanceId,
  });

  if (!apiUrl || !apiToken) {
    console.log(`[WHATSAPP BOT MOCK VOICE] Enviando nota de voz a ${params.groupId}: ${params.audioUrl}`);
    return true;
  }

  try {
    const url = buildUltraMsgUrl(apiUrl, instanceId, 'messages/audio');
    console.log(`[WHATSAPP VOICE] URL construida: ${url}`);

    const bodyParams = new URLSearchParams();
    bodyParams.append('token', apiToken);
    bodyParams.append('to', params.groupId);
    bodyParams.append('audio', params.audioUrl);
    if (params.replyToMessageId) {
      bodyParams.append('msgId', params.replyToMessageId);
    }

    console.log(`[WHATSAPP VOICE] Payload:`, {
      to: params.groupId,
      audio: params.audioUrl,
      msgId: params.replyToMessageId || 'none',
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    const responseText = await res.text();
    console.log(`[WHATSAPP VOICE] Response status: ${res.status}, body: ${responseText}`);

    if (!res.ok) {
      console.error('[WHATSAPP VOICE] UltraMsg Audio API Error:', res.status, responseText);
    }

    return res.ok;
  } catch (error) {
    console.error('[WHATSAPP VOICE] Error enviando nota de voz:', error);
    return false;
  }
}

