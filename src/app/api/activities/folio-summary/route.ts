import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canViewEconomicAnalysis } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (!canViewEconomicAnalysis(session.user.email || '', session.user.role)) {
      return NextResponse.json({ error: 'No tienes acceso a esta funcionalidad.' }, { status: 403 });
    }

    const folio = req.nextUrl.searchParams.get('folio');
    if (!folio) {
      return NextResponse.json({ error: 'Se requiere el parámetro folio' }, { status: 400 });
    }

    // Fetch all activities linked to this folio — same logic as /oportunidades/[id]/page.tsx
    const activities = await prisma.activity.findMany({
      where: { workOrderFolio: folio },
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Serialize dates
    const serialized = activities.map(a => ({
      id: a.id,
      title: a.title,
      type: a.type,
      status: a.status,
      date: a.date.toISOString(),
      startTime: a.startTime,
      endTime: a.endTime,
      durationMinutes: a.durationMinutes,
      result: a.result,
      notes: a.notes,
      workOrderFolio: a.workOrderFolio,
      user: a.user,
      client: a.client,
      contact: a.contact,
    }));

    return NextResponse.json({ folio, activities: serialized });
  } catch (error: any) {
    console.error('Folio summary API error:', error);
    return NextResponse.json({ error: 'Error al obtener resumen del folio' }, { status: 500 });
  }
}
