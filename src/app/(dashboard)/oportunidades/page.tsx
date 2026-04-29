import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OportunidadesClient } from './OportunidadesClient';

export interface DerivedOpportunity {
  folio: string | null;
  firstActivityId: string; // ID of the first/source activity
  title: string;
  responsable: string;
  responsableId: string | null;
  cliente: string;
  contacto: string;
  fechaInicio: string;
  fechaFin: string | null;
  leadTimeDays: number | null;
  estado: 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
  totalActividades: number;
  totalMinutos: number;
}

export default async function OportunidadesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  const userId = session.user.id;

  // Get all COTIZACION activities to derive opportunities
  const cotizaciones = await prisma.activity.findMany({
    where: { type: 'COTIZACION' },
    select: {
      id: true,
      workOrderFolio: true,
      title: true,
      date: true,
      status: true,
      type: true,
      durationMinutes: true,
      userId: true,
      user: { select: { id: true, name: true } },
      client: { select: { name: true } },
      contact: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  });

  // Also get ALL activities with a workOrderFolio that matches a cotizacion folio
  // (to include intermediate activities like field visits)
  const cotizacionFolios = [...new Set(cotizaciones.map(c => c.workOrderFolio).filter(Boolean))];
  
  const allLinkedActivities = await prisma.activity.findMany({
    where: {
      OR: [
        { type: 'COTIZACION' },
        { workOrderFolio: { in: cotizacionFolios as string[] } },
      ],
    },
    select: {
      workOrderFolio: true,
      type: true,
      status: true,
      durationMinutes: true,
      date: true,
    },
    orderBy: { date: 'asc' },
  });

  // Group cotizaciones by folio (or by id for those without folio)
  const grouped = new Map<string, typeof cotizaciones>();
  const noFolioList: typeof cotizaciones = [];

  for (const c of cotizaciones) {
    if (c.workOrderFolio) {
      const key = c.workOrderFolio;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(c);
    } else {
      noFolioList.push(c);
    }
  }

  // Build derived opportunities
  const opportunities: DerivedOpportunity[] = [];

  // From grouped folios
  for (const [folio, acts] of grouped) {
    const first = acts[0]; // earliest cotizacion
    const enProgreso = acts.find(a => a.status === 'EN_PROGRESO');
    const completada = acts.find(a => a.status === 'COMPLETADA');
    const cancelada = acts.find(a => a.status === 'CANCELADA');

    const startAct = enProgreso || first;
    const fechaInicio = startAct.date;
    const fechaFin = completada?.date || null;

    let estado: 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA' = 'EN_PROGRESO';
    if (completada) estado = 'COMPLETADA';
    else if (cancelada && !enProgreso) estado = 'CANCELADA';

    let leadTimeDays: number | null = null;
    if (fechaFin) {
      leadTimeDays = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
      if (leadTimeDays < 0) leadTimeDays = 0;
    }

    // Count ALL activities with this folio (not just cotizaciones)
    const allWithFolio = allLinkedActivities.filter(a => a.workOrderFolio === folio);
    const totalMinutos = allWithFolio.reduce((s, a) => s + (a.durationMinutes || 0), 0);

    opportunities.push({
      folio,
      firstActivityId: first.id,
      title: first.title,
      responsable: first.user?.name || 'Sin asignar',
      responsableId: first.userId,
      cliente: first.client?.name || '-',
      contacto: first.contact?.name || '-',
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin?.toISOString() || null,
      leadTimeDays,
      estado,
      totalActividades: allWithFolio.length,
      totalMinutos,
    });
  }

  // No-folio cotizaciones as individual opportunities
  for (const c of noFolioList) {
    opportunities.push({
      folio: null,
      firstActivityId: c.id,
      title: c.title,
      responsable: c.user?.name || 'Sin asignar',
      responsableId: c.userId,
      cliente: c.client?.name || '-',
      contacto: c.contact?.name || '-',
      fechaInicio: c.date.toISOString(),
      fechaFin: c.status === 'COMPLETADA' ? c.date.toISOString() : null,
      leadTimeDays: c.status === 'COMPLETADA' ? 0 : null,
      estado: c.status === 'COMPLETADA' ? 'COMPLETADA' : c.status === 'CANCELADA' ? 'CANCELADA' : 'EN_PROGRESO',
      totalActividades: 1,
      totalMinutos: c.durationMinutes || 0,
    });
  }

  // Role-based filtering
  let filtered = opportunities;
  if (role === 'INGENIERO') {
    filtered = opportunities.filter(o => o.responsableId === userId);
  } else if (role === 'SUPERVISOR') {
    const team = await prisma.user.findMany({ where: { supervisorId: userId }, select: { id: true } });
    const teamIds = [userId, ...team.map(t => t.id)];
    filtered = opportunities.filter(o => o.responsableId && teamIds.includes(o.responsableId));
  }

  // Sort: EN_PROGRESO first, then by fecha desc
  filtered.sort((a, b) => {
    if (a.estado !== b.estado) {
      const order = { EN_PROGRESO: 0, COMPLETADA: 1, CANCELADA: 2 };
      return order[a.estado] - order[b.estado];
    }
    return new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime();
  });

  // Get unique responsables for filter
  const users = await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });

  return (
    <OportunidadesClient
      opportunities={filtered}
      users={users}
      filters={{
        estatus: searchParams.estatus || '',
        responsable: searchParams.responsable || '',
        buscar: searchParams.buscar || '',
      }}
      userRole={role}
    />
  );
}
