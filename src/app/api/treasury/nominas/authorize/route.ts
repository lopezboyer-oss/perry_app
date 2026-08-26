import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAuthorizePayroll, resolveDirectorSignerName } from '@/lib/permissions';
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

    // Check user session status if available
    const session = await auth();
    const userEmail = (session?.user as any)?.email || '';
    const userName = (session?.user as any)?.name || '';
    const isDirector = canAuthorizePayroll(userEmail, (session?.user as any)?.role);
    const signerName = isDirector ? resolveDirectorSignerName(userEmail, userName) : null;

    return NextResponse.json({
      log,
      userSession: {
        isAuthenticated: Boolean(session?.user),
        email: userEmail,
        isDirector,
        signerName,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Acceso no autenticado: Debes iniciar sesión con tu cuenta de Dirección General en Perry App para autorizar esta nómina.' },
        { status: 401 }
      );
    }

    const userEmail = (session.user as any)?.email || '';
    const userRole = (session.user as any)?.role || '';
    const userName = (session.user as any)?.name || '';

    if (!canAuthorizePayroll(userEmail, userRole)) {
      return NextResponse.json(
        { error: 'Acceso restringido: Tu cuenta de usuario no cuenta con privilegios directivos para autorizar nóminas.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { token, action, notes } = body;

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
    const signerName = resolveDirectorSignerName(userEmail, userName);

    if (action === 'REJECT') {
      const updated = await prisma.payrollLog.update({
        where: { id: log.id },
        data: {
          status: 'RECHAZADA',
          signedBy: signerName,
          signedAt: new Date(),
          observations: notes ? `RECHAZADA por ${signerName}: ${notes}` : log.observations,
          ipAddress: clientIp,
        },
      });

      // Send rejection notification to WhatsApp group
      if (log.groupId) {
        const text = `❌ *NÓMINA RECHAZADA POR DIRECCIÓN*\n` +
          `🏢 *Empresa:* ${log.companyName}\n` +
          `📅 *Periodo:* ${log.periodNumber || 'Raya Semanal'}\n` +
          `💰 *Monto:* $${log.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN\n` +
          `👤 *Revisó:* ${signerName}\n` +
          `${notes ? `📝 *Motivo:* ${notes}\n` : ''}\n` +
          `_Notificación automática Perry Intelligence 🤖_`;

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

    // Send approval notification to group with explicit Director Name and Receipt Link
    if (log.groupId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'https://perryapp.netlify.app';
      const receiptUrl = `${appUrl}/nominas/comprobante/${token}`;

      const text = `✅ *NÓMINA APROBADA Y TOKENIZADA POR DIRECCIÓN*\n` +
        `🏢 *Empresa:* ${log.companyName}\n` +
        `📅 *Periodo:* ${log.periodNumber || 'Raya Semanal'}\n` +
        `💰 *Total Aprobado:* $${log.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN\n` +
        `✍️ *Firmado por:* ${signerName}\n` +
        `🔒 *Hash de Token:* ${token.substring(0, 18)}...\n` +
        `⏱️ *Fecha y Hora:* ${new Date().toLocaleString('es-MX', { timeZone: 'America/Tijuana' })}\n\n` +
        `📥 *Descargar Comprobante Digital (Imagen/PDF):*\n${receiptUrl}\n\n` +
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
