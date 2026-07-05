import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const parts = await prisma.activityPart.findMany({
      where: { activityId: params.id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(parts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();

    if (Array.isArray(body)) {
      // Bulk insert
      const data = body.map((item: any) => ({
        activityId: params.id,
        name: item.name,
        quantity: item.quantity || 1,
        status: item.status || 'VALIDANDO',
        providerType: item.providerType || 'COTIZAR',
        providedBy: item.providedBy || 'CASEME',
        notes: item.notes,
      }));

      await prisma.activityPart.createMany({
        data,
      });

      // return the created parts (re-fetch them to get IDs)
      const parts = await prisma.activityPart.findMany({
        where: { activityId: params.id },
        orderBy: { createdAt: 'desc' },
        take: data.length,
      });
      return NextResponse.json(parts.reverse(), { status: 201 });
    } else {
      const { name, quantity, status, providerType, providedBy, notes } = body;

      const part = await prisma.activityPart.create({
        data: {
          activityId: params.id,
          name,
          quantity: quantity || 1,
          status: status || 'VALIDANDO',
          providerType: providerType || 'COTIZAR',
          providedBy: providedBy || 'CASEME',
          notes,
        },
      });

      return NextResponse.json(part, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
