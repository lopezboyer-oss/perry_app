import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/equip-records/folio-report?folio=XXXX
// Returns all EquipRecord entries linked to activities with workOrderFolio = folio
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role;
  const allowedRoles = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR'];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const folio = searchParams.get('folio');

  if (!folio) return NextResponse.json({ error: 'folio required' }, { status: 400 });

  // Find all activities with this folio
  const activities = await prisma.activity.findMany({
    where: { workOrderFolio: { equals: folio, mode: 'insensitive' } },
    select: {
      id: true,
      title: true,
      date: true,
      startTime: true,
      endTime: true,
      workOrderFolio: true,
      user: { select: { name: true } },
      company: { select: { name: true, shortName: true } },
      equipRecords: {
        include: {
          equip: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  // Flatten into rows
  const rows = activities.flatMap(a =>
    a.equipRecords.map(r => ({
      recordId: r.id,
      activityId: a.id,
      activityTitle: a.title,
      activityDate: a.date.toISOString(),
      startTime: a.startTime,
      endTime: a.endTime,
      supOperativo: a.user?.name || null,
      company: a.company?.name || null,
      companyShort: a.company?.shortName || null,
      folio: a.workOrderFolio,
      equipId: r.equipId,
      equipName: r.equip.name,
      operatorName: r.operatorName,
      chkCondicionesGenerales: r.chkCondicionesGenerales,
      chkCargaBateria100: r.chkCargaBateria100,
      chk5sEquipo: r.chk5sEquipo,
      chkPaseClienteVigente: r.chkPaseClienteVigente,
      chkExtintorFuncional: r.chkExtintorFuncional,
      checklistUpdatedBy: r.checklistUpdatedBy,
      checklistUpdatedAt: r.checklistUpdatedAt?.toISOString() || null,
      evidenciasCount: r.evidencias ? JSON.parse(r.evidencias).length : 0,
      notes: r.notes,
      weekendOf: r.weekendOf,
    }))
  );

  return NextResponse.json({ folio, total: rows.length, rows });
}
