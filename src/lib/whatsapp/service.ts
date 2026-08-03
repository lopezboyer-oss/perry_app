/**
 * Servicio para interactuar con la API del proveedor de WhatsApp (UltraMsg / Evolution API / etc.)
 * Soporta envio de reacciones (emoji) y mensajes de texto para peticiones de información.
 */

export async function sendWhatsappReaction(params: {
  messageId: string;
  groupId: string;
  emoji: string; // ej: "🤖"
}): Promise<boolean> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_API_TOKEN;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;

  if (!apiUrl || !apiToken) {
    console.log(`[WHATSAPP BOT MOCK REACTION] Reaccionando con ${params.emoji} al mensaje ${params.messageId} en grupo ${params.groupId}`);
    return true;
  }

  try {
    // UltraMsg format: POST https://api.ultramsg.com/instanceXXXXX/messages/reaction or standard API
    const url = instanceId 
      ? `${apiUrl}/${instanceId}/messages/reaction`
      : `${apiUrl}/messages/reaction`;

    const res = await fetch(`${url}?token=${apiToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        token: apiToken,
        msgId: params.messageId,
        messageId: params.messageId,
        chatId: params.groupId,
        groupId: params.groupId,
        reaction: params.emoji,
        emoji: params.emoji,
      }),
    });
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
  const apiToken = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_API_TOKEN;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;

  if (!apiUrl || !apiToken) {
    console.log(`[WHATSAPP BOT MOCK MESSAGE] Enviando al grupo ${params.groupId}:\n${params.messageText}`);
    return true;
  }

  try {
    // UltraMsg format: POST https://api.ultramsg.com/instanceXXXXX/messages/chat
    const url = instanceId 
      ? `${apiUrl}/${instanceId}/messages/chat`
      : `${apiUrl}/messages/chat`;

    const res = await fetch(`${url}?token=${apiToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        token: apiToken,
        to: params.groupId,
        chatId: params.groupId,
        groupId: params.groupId,
        body: params.messageText,
        message: params.messageText,
        quotedMessageId: params.replyToMessageId,
      }),
    });
    return res.ok;
  } catch (error) {
    console.error('Error enviando mensaje a WhatsApp:', error);
    return false;
  }
}
