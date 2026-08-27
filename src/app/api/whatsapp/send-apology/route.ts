import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsappGroupMessage } from '@/lib/whatsapp/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const groupId = '120363367042076187@g.us'; // ADMINISTRACION GRUPO CASEME
    const messageText = `🙏 *AVISO DE OPTIMIZACIÓN — PERRY INTELLIGENCE* 🤖\n\n` +
      `Estimado equipo de Administración:\n\n` +
      `Les ofrecemos una sincera disculpa por las notificaciones automáticas y solicitudes de firma que se generaron anteriormente al mencionar la palabra "nómina" en sus mensajes de chat.\n\n` +
      `Hemos actualizado y optimizado nuestros algoritmos de análisis: a partir de este momento, **únicamente procesaré solicitudes de aprobación cuando se compartan reportes y hojas oficiales de nómina reales** (documentos Excel, PDF o desgloses financieros de dispersión).\n\n` +
      `Agradecemos mucho su paciencia y apoyo para seguir perfeccionando nuestro control operativo.\n\n` +
      `_Perry Intelligence 🤖_`;

    const success = await sendWhatsappGroupMessage({
      groupId,
      messageText,
    });

    return NextResponse.json({ success, groupId, sentMessage: messageText });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error enviando mensaje' }, { status: 500 });
  }
}
