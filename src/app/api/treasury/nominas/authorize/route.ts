import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsappGroupMessage } from '@/lib/whatsapp/service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 400 });
    }

    const log = await prisma.payrollLog.findUnique({
      where: { tokenHash: token },
    });

    if (!log) {
      return NextResponse.json({ error: 'Nómina no encontrada o token inválido' }, { status: 404 });
    }

    return NextResponse.json({ log });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, action, signedBy, notes } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 400 });
    }

    const log = await prisma.payrollLog.findUnique({
      where: { tokenHash: token },
    });

    if (!log) {
      return NextResponse.json({ error: 'Nómina no encontrada' }, { status: 404 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'IP_DESCONOCIDA';
    const signerName = signedBy || 'Ivan López (Dirección)';

    if (action === 'REJECT') {
      const updated = await prisma.payrollLog.update({
        where: { id: log.id },
        data: {
          status: 'RECHAZADA',
          signedBy: signerName,
          signedAt: new Date(),
          observations: notes ? `RECHAZADA: ${notes}` : log.observations,
          ipAddress: clientIp,
        },
      });

      // Send rejection notification to group if groupId is present
      if (log.groupId) {
        const text = `❌ *NÓMINA RECHAZADA POR DIRECCIÓN*\n` +
          `🏢 *Empresa:* ${log.companyName}\n` +
          `📅 *Periodo:* ${log.periodNumber || 'Raya Semanal'}\n` +
          `💰 *Monto:* $${log.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
          `👤 *Revisó:* ${signerName}\n` +
          `${notes ? `📝 *Motivo:* ${notes}\n` : ''}` +
          `_Procesado vía Perry Intelligence 🤖_`;

        await sendWhatsappGroupMessage({
          groupId: log.groupId,
          messageText: text,
        });
      }

      return NextResponse.json({ success: true, log: updated });
    }

    // Default APPROVE
    const updated = await prisma.payrollLog.update({
      where: { id: log.id },
      data: {
        status: 'APROBADA_TOKENIZADA',
        signedBy: signerName,
        signedAt: new Date(),
        ipAddress: clientIp,
      },
    });

    // Send approval notification to group if groupId is present
    if (log.groupId) {
      const text = `✅ *NÓMINA APROBADA Y TOKENIZADA POR DIRECCIÓN*\n` +
        `🏢 *Empresa:* ${log.companyName}\n` +
        `📅 *Periodo:* ${log.periodNumber || 'Raya Semanal'}\n` +
        `💰 *Total Aprobado:* $${log.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN\n` +
        `✍️ *Firmado por:* ${signerName}\n` +
        `🔒 *Hash de Token:* ${token.substring(0, 18)}...\n` +
        `⏱️ *Fecha y Hora:* ${new Date().toLocaleString('es-MX', { timeZone: 'America/Tijuana' })}\n\n` +
        `_Autorización digital inmutable tokenizada en Perry App 🤖_`;

      await sendWhatsappGroupMessage({
        groupId: log.groupId,
        messageText: text,
      });
    }

    return NextResponse.json({ success: true, log: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error autorizando nómina' }, { status: 500 });
  }
}
