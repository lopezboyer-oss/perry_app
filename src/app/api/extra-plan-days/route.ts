import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/extra-plan-days?weekendOf=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const weekendOf = req.nextUrl.searchParams.get('weekendOf');
  if (!weekendOf) return NextResponse.json({ error: 'weekendOf requerido' }, { status: 400 });

  const days = await prisma.extraPlanDay.findMany({
    where: { weekendOf },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({ days });
}

// POST /api/extra-plan-days — create extra day (ADMIN, ADMINISTRACION, SUPERVISOR, SAFETY_LP)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const role = session.user.role;
  if (!['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos para crear días extra' }, { status: 403 });
  }

  const body = await req.json();
  const { date, weekendOf, label } = body;

  if (!date || !weekendOf) {
    return NextResponse.json({ error: 'date y weekendOf requeridos' }, { status: 400 });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Formato de fecha inválido (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const day = await prisma.extraPlanDay.create({
      data: {
        date,
        weekendOf,
        label: label || null,
        createdBy: session.user.id,
      },
    });
    return NextResponse.json({ day }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ese día ya está agregado al plan' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear día extra' }, { status: 500 });
  }
}

// DELETE /api/extra-plan-days — remove extra day
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const role = session.user.role;
  if (!['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  const body = await req.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  await prisma.extraPlanDay.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
