import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/equip-records/[id] — update operator, checklist, or notes
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userName = session.user.name || 'Usuario';
  const body = await req.json();
  const now = new Date();

  const updateData: Record<string, unknown> = {};

  // Operator update
  if ('operatorId' in body) {
    updateData.operatorId = body.operatorId;
    updateData.operatorName = body.operatorName || null;
    updateData.operatorUpdatedBy = userName;
    updateData.operatorUpdatedAt = now;
  }

  // Checklist update
  if ('checklist' in body) {
    const chk = body.checklist as Record<string, boolean>;
    if ('chkCondicionesGenerales' in chk) updateData.chkCondicionesGenerales = chk.chkCondicionesGenerales;
    if ('chkCargaBateria100' in chk) updateData.chkCargaBateria100 = chk.chkCargaBateria100;
    if ('chk5sEquipo' in chk) updateData.chk5sEquipo = chk.chk5sEquipo;
    if ('chkPaseClienteVigente' in chk) updateData.chkPaseClienteVigente = chk.chkPaseClienteVigente;
    if ('chkExtintorFuncional' in chk) updateData.chkExtintorFuncional = chk.chkExtintorFuncional;
    updateData.checklistUpdatedBy = userName;
    updateData.checklistUpdatedAt = now;
  }

  // Notes update
  if ('notes' in body) {
    updateData.notes = body.notes;
    updateData.notesUpdatedBy = userName;
    updateData.notesUpdatedAt = now;
  }

  // Evidence update (full replacement of JSON array)
  if ('evidencias' in body) {
    updateData.evidencias = JSON.stringify(body.evidencias);
  }

  const record = await prisma.equipRecord.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(record);
}
