import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();

    const opportunity = await prisma.opportunity.create({
      data: {
        folio: body.folio,
        clientId: body.clientId,
        contactId: body.contactId || null,
        userId: body.userId,
        title: body.title,
        description: body.description || null,
        requestDate: body.requestDate ? new Date(body.requestDate) : null,
        scheduledVisitDate: body.scheduledVisitDate ? new Date(body.scheduledVisitDate) : null,
        actualVisitDate: body.actualVisitDate ? new Date(body.actualVisitDate) : null,
        infoCompleteDate: body.infoCompleteDate ? new Date(body.infoCompleteDate) : null,
        quotationDueDate: body.quotationDueDate ? new Date(body.quotationDueDate) : null,
        quotationSentDate: body.quotationSentDate ? new Date(body.quotationSentDate) : null,
        status: body.status || 'PROGRAMADA',
        delayReason: body.delayReason || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error: any) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json({ error: 'Error al crear oportunidad' }, { status: 500 });
  }
}
