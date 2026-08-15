import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Endpoint temporal de diagnóstico para probar envío de audio por UltraMsg
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to'); // número de teléfono para enviar test

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_API_TOKEN;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'https://perryapp.netlify.app';
  const audioUrl = `${appBaseUrl.replace(/\/+$/, '')}/audio/perry_welcome.m4a`;

  // Step 1: Check env vars
  const envCheck = {
    WHATSAPP_API_URL: apiUrl ? `SET (${apiUrl.substring(0, 30)}...)` : 'MISSING',
    WHATSAPP_VERIFY_TOKEN: apiToken ? `SET (${apiToken.substring(0, 8)}...)` : 'MISSING',
    WHATSAPP_INSTANCE_ID: instanceId || 'MISSING',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    URL: process.env.URL || 'NOT SET',
    audioUrl,
  };

  // Step 2: Verify audio file is reachable from server
  let audioReachable = 'NOT TESTED';
  try {
    const audioCheck = await fetch(audioUrl, { method: 'HEAD' });
    audioReachable = `${audioCheck.status} ${audioCheck.headers.get('content-type')} (${audioCheck.headers.get('content-length')} bytes)`;
  } catch (e: any) {
    audioReachable = `ERROR: ${e.message}`;
  }

  // Step 3: Build the UltraMsg URL
  let cleanUrl = (apiUrl || '').trim().replace(/\/+$/, '');
  if (instanceId && instanceId.trim() && !cleanUrl.includes(instanceId.trim())) {
    cleanUrl = `${cleanUrl}/${instanceId.trim()}`;
  }
  const ultraMsgAudioUrl = `${cleanUrl}/messages/audio`;
  const ultraMsgVoiceUrl = `${cleanUrl}/messages/voice`;

  // Step 4: If 'to' is provided, actually send a test audio
  let sendResult: any = null;
  if (to) {
    // Try messages/audio first
    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append('token', apiToken || '');
      bodyParams.append('to', to);
      bodyParams.append('audio', audioUrl);

      const res = await fetch(ultraMsgAudioUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
      });
      const resBody = await res.text();
      sendResult = {
        endpoint: 'messages/audio',
        status: res.status,
        response: resBody,
      };
    } catch (e: any) {
      sendResult = {
        endpoint: 'messages/audio',
        error: e.message,
      };
    }
  }

  return NextResponse.json({
    diagnosis: 'WhatsApp Voice Note Debug',
    envCheck,
    audioReachable,
    constructedUrls: {
      audioEndpoint: ultraMsgAudioUrl,
      voiceEndpoint: ultraMsgVoiceUrl,
    },
    sendResult,
    instructions: !to
      ? 'Agrega ?to=NUMERO_TELEFONO para enviar prueba de audio (ej: ?to=5215512345678@c.us)'
      : undefined,
  }, { status: 200 });
}
