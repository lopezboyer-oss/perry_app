import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ENDPOINT TEMPORAL — Regenerar nota de voz corta de Perry con Gemini TTS
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'Configurado_En_Netlify') {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const text = `¡Hola! Soy Perry, tu copiloto de inteligencia operativa. En este momento me encuentro en fase de entrenamiento dentro de los grupos de trabajo, pero muy pronto podré asistirte de forma directa por este medio. ¡Gracias por escribir!`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Puck',
                },
              },
            },
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Gemini TTS error: ${res.status}`, details: errText }, { status: 500 });
    }

    const json = await res.json();
    const audioPart = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!audioPart) {
      return NextResponse.json({ error: 'No audio data' }, { status: 500 });
    }

    // Gemini TTS returns raw PCM (signed 16-bit LE, 24000 Hz, mono)
    const pcmBuffer = Buffer.from(audioPart.data, 'base64');
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.length;

    // Build a proper WAV file
    const wavHeader = Buffer.alloc(44);
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(36 + dataSize, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20);
    wavHeader.writeUInt16LE(numChannels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(byteRate, 28);
    wavHeader.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);
    const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);

    return new NextResponse(wavBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'attachment; filename="perry_welcome.wav"',
        'Content-Length': String(wavBuffer.length),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
