import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();

    const opportunity = await prisma.opportunity.update({
      where: { id: params.id },
      data: {
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
        status: body.status,
        delayReason: body.delayReason || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(opportunity);
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // Remove activity references first
    await prisma.activity.updateMany({
      where: { opportunityId: params.id },
      data: { opportunityId: null },
    });

    await prisma.opportunity.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
