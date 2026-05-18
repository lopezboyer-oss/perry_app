import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/equip-records?weekendOf=YYYY-MM-DD&companyId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekendOf = searchParams.get('weekendOf');
  const companyId = searchParams.get('companyId');

  if (!weekendOf) return NextResponse.json({ error: 'weekendOf required' }, { status: 400 });

  const records = await prisma.equipRecord.findMany({
    where: {
      weekendOf,
      ...(companyId ? { activity: { companyId } } : {}),
    },
    include: {
      equip: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(records);
}

// POST /api/equip-records — upsert a record
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { activityId, equipId, weekendOf } = body;

  if (!activityId || !equipId || !weekendOf) {
    return NextResponse.json({ error: 'activityId, equipId, weekendOf required' }, { status: 400 });
  }

  const record = await prisma.equipRecord.upsert({
    where: { activityId_equipId_weekendOf: { activityId, equipId, weekendOf } },
    create: { activityId, equipId, weekendOf },
    update: {},
  });

  return NextResponse.json(record);
}
