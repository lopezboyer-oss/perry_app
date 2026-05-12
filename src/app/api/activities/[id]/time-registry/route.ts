import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const PHASES_ORDER = [
  'INICIO_LOGISTICO',
  'INICIO_OPERATIVO',
  'FINAL_OPERATIVO',
  'FINAL_LOGISTICO',
] as const;

type Phase = typeof PHASES_ORDER[number];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const entries = await prisma.timeRegistryEntry.findMany({
    where: { activityId: params.id },
    orderBy: { registeredAt: 'asc' },
  });

  return NextResponse.json(entries);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const body = await req.json();
  const { phase, time } = body;

  // Validate phase
  if (!PHASES_ORDER.includes(phase)) {
    return NextResponse.json({ error: `Fase inválida: ${phase}` }, { status: 400 });
  }

  // Validate time format (HH:MM)
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: 'Formato de hora inválido. Use HH:MM' }, { status: 400 });
  }
  const [h, m] = time.split(':').map(Number);
  if (h > 23 || m > 59) {
    return NextResponse.json({ error: 'Hora fuera de rango (00:00 - 23:59)' }, { status: 400 });
  }

  // Verify activity exists
  const activity = await prisma.activity.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!activity) {
    return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
  }

  // Get existing entries to validate sequential order
  const existing = await prisma.timeRegistryEntry.findMany({
    where: { activityId: params.id },
    select: { phase: true },
  });
  const existingPhases = new Set(existing.map(e => e.phase));

  // Check if this phase is already registered
  if (existingPhases.has(phase)) {
    return NextResponse.json({ error: `La fase "${phase}" ya fue registrada` }, { status: 409 });
  }

  // Validate sequential order: all previous phases must exist
  const phaseIndex = PHASES_ORDER.indexOf(phase as Phase);
  for (let i = 0; i < phaseIndex; i++) {
    if (!existingPhases.has(PHASES_ORDER[i])) {
      return NextResponse.json({
        error: `Debe registrar "${PHASES_ORDER[i]}" antes de "${phase}"`,
      }, { status: 400 });
    }
  }

  // Create the entry
  const entry = await prisma.timeRegistryEntry.create({
    data: {
      activityId: params.id,
      phase,
      time,
      registeredBy: session.user.name || 'Desconocido',
      userId: session.user.id,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
