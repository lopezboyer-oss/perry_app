import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { activitySchema } from '@/lib/validators';
import { parseLocalDate } from '@/lib/timezone';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = activitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const activity = await prisma.activity.create({
      data: {
        date: parseLocalDate(data.date),
        userId: data.userId,
        type: data.type as any,
        status: data.status as any,
        title: data.title,
        clientId: data.clientId || null,
        contactId: data.contactId || null,
        workOrderFolio: data.workOrderFolio || null,
        purchaseOrder: data.purchaseOrder || null,
        projectArea: data.projectArea || null,
        result: data.result || null,
        nextStep: data.nextStep || null,
        commitmentDate: data.commitmentDate ? new Date(data.commitmentDate) : null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        durationMinutes: data.durationMinutes || null,
        location: data.location || null,
        notes: data.notes || null,
      },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error: any) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Error al crear actividad' },
      { status: 500 }
    );
  }
}
