import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const role = session.user.role;
    const isSupervisor = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(role);
    if (!isSupervisor) {
      return NextResponse.json({ error: 'Solo supervisores pueden generar QR de asistencia' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get('activityId');
    const type = searchParams.get('type') || 'CHECK_IN'; // CHECK_IN or CHECK_OUT

    const payload = {
      supervisorId: session.user.id,
      activityId: activityId || null,
      type,
      timestamp: Date.now(),
    };

    const tokenData = Buffer.from(JSON.stringify(payload)).toString('base64');
    const secret = process.env.NEXTAUTH_SECRET || 'perry_app_secret_fallback';
    const signature = crypto.createHmac('sha256', secret).update(tokenData).digest('hex');

    const token = `${tokenData}.${signature}`;

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating QR token:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
