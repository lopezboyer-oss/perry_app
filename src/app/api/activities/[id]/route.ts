import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const body = await req.json();
  const allowedFields: Record<string, any> = {};

  // Only allow specific fields to be updated via PATCH
  if (body.loto !== undefined) allowedFields.loto = Boolean(body.loto);
  if (body.purchaseOrder !== undefined) allowedFields.purchaseOrder = body.purchaseOrder || null;

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  const activity = await prisma.activity.update({
    where: { id: params.id },
    data: allowedFields,
  });

  return NextResponse.json(activity);
}
