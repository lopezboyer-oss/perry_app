import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const body = await req.json();
  const allowedFields: Record<string, any> = {};

  if (body.loto !== undefined) allowedFields.loto = Boolean(body.loto);
  if (body.purchaseOrder !== undefined) allowedFields.purchaseOrder = body.purchaseOrder || null;
  if (body.workOrderFolio !== undefined) allowedFields.workOrderFolio = body.workOrderFolio ? String(body.workOrderFolio).slice(0, 6) : null;
  if (body.weekendNotes !== undefined) allowedFields.weekendNotes = body.weekendNotes || null;
  if (body.actualStartTime !== undefined) allowedFields.actualStartTime = body.actualStartTime || null;
  if (body.actualEndTime !== undefined) allowedFields.actualEndTime = body.actualEndTime || null;

  // Audit notes: only ADMIN and SUPERVISOR_SAFETY_LP
  if (body.auditNotes !== undefined) {
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'SUPERVISOR_SAFETY_LP') {
      return NextResponse.json({ error: 'Sin permisos para notas de auditoría' }, { status: 403 });
    }
    allowedFields.auditNotes = body.auditNotes || null;
  }

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  const activity = await prisma.activity.update({
    where: { id: params.id },
    data: allowedFields,
  });

  return NextResponse.json(activity);
}
