import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessTreasuryDashboard } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    const userRole = (session.user as any)?.role || '';
    if (!canAccessTreasuryDashboard(email) && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const payroll = await prisma.payrollLog.findUnique({
      where: { id },
      select: { imageUrl: true, signedImageUrl: true, companyName: true },
    });

    if (!payroll) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    const fileUrl = payroll.imageUrl || payroll.signedImageUrl;
    if (!fileUrl) {
      return NextResponse.json({ error: 'No hay archivo adjunto' }, { status: 404 });
    }

    const res = await fetch(fileUrl);
    if (!res.ok) {
      return NextResponse.json({ error: 'Error al obtener el archivo desde el almacenamiento' }, { status: 502 });
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect true MIME type from magic numbers
    let mimeType = res.headers.get('content-type') || 'application/octet-stream';
    if (buffer.length >= 4) {
      if (buffer.slice(0, 4).toString() === '%PDF') {
        mimeType = 'application/pdf';
      } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        mimeType = 'image/jpeg';
      } else if (buffer[0] === 0x89 && buffer[1] === 0x50) {
        mimeType = 'image/png';
      }
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[PAYROLL MEDIA ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al procesar archivo' }, { status: 500 });
  }
}
