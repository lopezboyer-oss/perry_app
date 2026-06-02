import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getTijuanaToday, parseLocalDate } from '@/lib/timezone';
import { getCompanyFilterFromCookies } from '@/lib/company-context';
import { RegistroEquiposClient } from './RegistroEquiposClient';

export const dynamic = 'force-dynamic';

export default async function RegistroEquiposPage({
  searchParams,
}: {
  searchParams: { weekend?: string };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const companyFilter = await getCompanyFilterFromCookies();
  const userRole = session.user.role;
  const userName = session.user.name || '';
  const userId = session.user.id || '';

  // ── Weekend date logic (same as ALARMA TERA: Mon-Fri → previous weekend) ──
  const todayStr = getTijuanaToday();
  const today = new Date(`${todayStr}T12:00:00`);
  const dow = today.getDay();

  let satOffset: number;
  if (dow === 6) satOffset = 0;
  else if (dow === 0) satOffset = -1;
  else satOffset = -(dow + 1);

  const saturdayDate = new Date(today);
  saturdayDate.setDate(today.getDate() + satOffset);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const currentSaturday = fmt(saturdayDate);

  // Build weekend selector list
  const weekendDates: string[] = [currentSaturday];
  for (let i = 1; i <= 8; i++) {
    const d = new Date(saturdayDate);
    d.setDate(d.getDate() - 7 * i);
    weekendDates.push(fmt(d));
  }

  const selectedWeekend = searchParams.weekend || currentSaturday;

  // ── Extra plan days ──
  const extraDays = await prisma.extraPlanDay.findMany({
    where: { weekendOf: selectedWeekend },
    orderBy: { date: 'asc' },
  });

  const satDate = new Date(`${selectedWeekend}T12:00:00`);
  const sunDate = new Date(satDate);
  sunDate.setDate(satDate.getDate() + 1);
  const sunDateStr = fmt(sunDate);

  const allDates = [...new Set([selectedWeekend, sunDateStr, ...extraDays.map(d => d.date)])];
  allDates.sort();

  // Build date ranges
  const dateRanges = allDates.map(dateStr => {
    const d = parseLocalDate(dateStr);
    const start = new Date(d); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(d); end.setUTCHours(23, 59, 59, 999);
    return { date: { gte: start, lte: end } };
  });

  // ── Fetch activities with equipment assignments ──
  const activities = dateRanges.length > 0
    ? await prisma.activity.findMany({
        where: {
          OR: dateRanges,
          ...companyFilter,
          weekendEquipAssignments: { some: {} }, // Only activities with equipment
          status: { not: 'CANCELADA' },
        },
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          endTime: true,
          workOrderFolio: true,
          userId: true,
          user: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
          company: { select: { id: true, name: true, shortName: true } },
          weekendEquipAssignments: {
            select: {
              id: true,
              equipId: true,
              equip: {
                select: {
                  id: true,
                  name: true,
                  ownership: true,
                  supplier: { select: { name: true } },
                },
              },
            },
          },
          weekendTechAssignments: {
            select: {
              technicianId: true,
              technician: { select: { id: true, name: true } },
            },
          },
          equipRecords: {
            select: {
              id: true,
              equipId: true,
              operatorId: true,
              operatorName: true,
              operatorUpdatedBy: true,
              operatorUpdatedAt: true,
              chkCondicionesGenerales: true,
              chkCargaBateria100: true,
              chk5sEquipo: true,
              chkPaseClienteVigente: true,
              chkExtintorFuncional: true,
              checklistUpdatedBy: true,
              checklistUpdatedAt: true,
              evidencias: true,
              notes: true,
              notesUpdatedBy: true,
              notesUpdatedAt: true,
              weekendOf: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      })
    : [];

  // Serialize for client
  const serialized = activities.map(a => ({
    id: a.id,
    title: a.title,
    date: a.date.toISOString(),
    startTime: a.startTime,
    endTime: a.endTime,
    workOrderFolio: a.workOrderFolio,
    userId: a.userId,
    user: a.user,
    client: a.client,
    company: a.company,
    equips: a.weekendEquipAssignments.map(e => ({
      assignmentId: e.id,
      equipId: e.equipId,
      equipName: e.equip.name,
      equipOwnership: e.equip.ownership,
      supplierName: e.equip.supplier?.name || null,
    })),
    techs: a.weekendTechAssignments.map(t => ({
      technicianId: t.technicianId,
      technicianName: t.technician.name,
    })),
    equipRecords: a.equipRecords.map(r => ({
      ...r,
      operatorUpdatedAt: r.operatorUpdatedAt?.toISOString() || null,
      checklistUpdatedAt: r.checklistUpdatedAt?.toISOString() || null,
      notesUpdatedAt: r.notesUpdatedAt?.toISOString() || null,
      evidencias: r.evidencias ? JSON.parse(r.evidencias) : [],
    })),
  }));

  return (
    <RegistroEquiposClient
      activities={serialized}
      weekendDates={weekendDates}
      selectedWeekend={selectedWeekend}
      userRole={userRole}
      userName={userName}
      userId={userId}
    />
  );
}
