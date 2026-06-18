import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { odooExecute } from '@/lib/odoo';
import { prisma } from '@/lib/prisma';
import { canViewEconomicAnalysis } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

function toMin(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getDurationHours(startTime: string | null, endTime: string | null): number {
  if (!startTime || !endTime) return 8; // Default 8 hours
  let diff = toMin(endTime) - toMin(startTime);
  if (diff <= 0) diff += 1440; // Crosses midnight
  return diff / 60;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const role = session.user.role;
    const email = session.user.email || '';

    // 1. Validar seguridad exclusiva
    if (!canViewEconomicAnalysis(email, role)) {
      return NextResponse.json({ error: 'No tienes acceso a esta funcionalidad en etapa de pruebas.' }, { status: 403 });
    }

    const activityId = req.nextUrl.searchParams.get('activityId');
    const searchFolio = req.nextUrl.searchParams.get('folio');

    if (!activityId && !searchFolio) {
      return NextResponse.json({ error: 'Se requiere activityId o folio' }, { status: 400 });
    }

    // 2. Obtener folio y TODAS las actividades asociadas
    let folio = '';
    let allActivities: any[] = [];

    const includeConfig = {
      client: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, weeklySalary: true } },
      weekendTechAssignments: {
        include: {
          technician: {
            include: {
              contractor: { select: { id: true, name: true } }
            }
          }
        }
      },
      weekendSafetyAssignments: {
        include: { safetyDedicado: true }
      },
      weekendUserSafetyAssignments: {
        include: { user: { select: { id: true, name: true, weeklySalary: true } } }
      },
      weekendEquipAssignments: {
        include: { equip: true }
      },
      timeRegistryEntries: true
    };

    if (activityId) {
      // First get the clicked activity to find the folio
      const clickedActivity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: { workOrderFolio: true }
      });
      
      if (!clickedActivity) {
        return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
      }
      folio = clickedActivity.workOrderFolio || '';
      
      if (!folio) {
        return NextResponse.json({ error: 'La actividad seleccionada no tiene un Folio Odoo asociado.' }, { status: 400 });
      }

      // Now get ALL activities with this folio
      allActivities = await prisma.activity.findMany({
        where: { workOrderFolio: folio },
        include: includeConfig,
        orderBy: { date: 'asc' }
      });
    } else if (searchFolio) {
      folio = searchFolio.toUpperCase().trim();
      
      allActivities = await prisma.activity.findMany({
        where: { workOrderFolio: { equals: folio, mode: 'insensitive' } },
        include: includeConfig,
        orderBy: { date: 'asc' }
      });
    }

    if (!folio) {
      return NextResponse.json({ error: 'La actividad seleccionada no tiene un Folio Odoo asociado.' }, { status: 400 });
    }

    // 3. Consultar Odoo para obtener detalles del folio
    console.log(`Buscando orden de venta ${folio} en Odoo...`);
    const odooOrders = await odooExecute('sale.order', 'search_read', [
      [[[`name`, '=', folio]]],
      {
        fields: ['name', 'amount_total', 'amount_untaxed', 'order_line', 'company_id']
      }
    ]);

    if (!odooOrders || odooOrders.length === 0) {
      return NextResponse.json({ 
        error: `No se encontró la orden de venta "${folio}" en Odoo.`, 
        activityFound: allActivities.length > 0
      }, { status: 404 });
    }

    const order = odooOrders[0];
    let odooLines: any[] = [];

    if (order.order_line && order.order_line.length > 0) {
      odooLines = await odooExecute('sale.order.line', 'search_read', [
        [[['id', 'in', order.order_line]]],
        {
          fields: ['name', 'product_id', 'product_uom_qty', 'price_unit', 'price_subtotal', 'display_type']
        }
      ]);
    }

    // 4. Procesar y clasificar en memoria las líneas de Odoo
    const odooBreakdown = {
      materials: [] as any[],
      labor: [] as any[],
      coordination: [] as any[],
      equipmentRental: [] as any[],
      indirects: [] as any[],
      other: [] as any[]
    };

    let totalQuotedAmount = order.amount_total;
    let totalQuotedUntaxed = order.amount_untaxed;

    // Si el total es igual al subtotal (sin IVA), estimar el total con 16% de IVA
    if (totalQuotedAmount === totalQuotedUntaxed && totalQuotedAmount > 0) {
      totalQuotedAmount = totalQuotedAmount * 1.16;
    }

    odooLines.forEach((l: any) => {
      if (l.display_type === 'line_section') return; // Omitir secciones de títulos

      const desc = (l.name || '').toUpperCase();
      const productName = l.product_id ? l.product_id[1].toUpperCase() : '';

      const item = {
        id: l.id,
        product: l.product_id ? l.product_id[1] : '—',
        description: l.name ? l.name.replace(/\n/g, ' / ').trim() : '',
        qty: l.product_uom_qty,
        price: l.price_unit,
        subtotal: l.price_subtotal
      };

      // Classification priority: productName first (most reliable), then description as fallback
      // Step 1: Classify by productName (definitive — product catalog is controlled)
      if (productName.includes('SERVICIO') || productName.includes('MANO DE OBRA')) {
        // Product is a service/labor item. Check description for indirect override
        if (desc.includes('INDIRECTO')) {
          odooBreakdown.indirects.push(item);
        } else {
          odooBreakdown.labor.push(item);
        }
        return;
      }
      if (productName.includes('MATERIAL') || productName.includes('SUMINISTRO')) {
        odooBreakdown.materials.push(item);
        return;
      }
      if (productName.includes('RENTA') || productName.includes('PLATAFORMA')) {
        odooBreakdown.equipmentRental.push(item);
        return;
      }
      if (productName.includes('COORDINACION') || productName.includes('SEGURIDAD')) {
        odooBreakdown.coordination.push(item);
        return;
      }

      // Step 2: Fallback to description keywords (less reliable — free text)
      const isRental = desc.includes('RENTA') || desc.includes('PLATAFORMA') || desc.includes('TIJERA') || desc.includes('GENIE') || desc.includes('GRUA') || desc.includes('ELEVACION') || desc.includes('MANLIFT');
      const isCoord = desc.includes('COORDINACION') || desc.includes('SAFETY') || desc.includes('SUPERVISOR') || desc.includes('JSRA') || desc.includes('VIGILANTE');
      const isIndirect = desc.includes('INDIRECTO') || desc.includes('EPP') || desc.includes('CONSUMIBLES') || desc.includes('ADMINISTRACION');
      const isMaterial = desc.includes('MATERIAL') || desc.includes('SUMINISTRO');
      const isLabor = desc.includes('INSTALACION') || desc.includes('EJECUCION') || desc.includes('FABRICACION');

      if (isRental) odooBreakdown.equipmentRental.push(item);
      else if (isCoord) odooBreakdown.coordination.push(item);
      else if (isLabor) odooBreakdown.labor.push(item);
      else if (isIndirect) odooBreakdown.indirects.push(item);
      else if (isMaterial) odooBreakdown.materials.push(item);
      else odooBreakdown.other.push(item);
    });

    // 5. Procesar asignaciones de TODAS las actividades del folio
    const perryResources = {
      technicians: [] as any[],
      safety: [] as any[],
      equipment: [] as any[],
      summary: {
        laborCost: 0,
        equipmentCost: 0,
        safetyCost: 0,
        totalCost: 0
      }
    };

    // Track unique resources to avoid double-counting within same activity
    // but correctly count across different activities (same tech can work multiple days)
    const techEntries: any[] = [];
    const safetyEntries: any[] = [];
    const equipEntries: any[] = [];

    // Pre-fetch all linked User records for PROPIO technicians to get weeklySalary
    const linkedUserIds = allActivities
      .flatMap(a => a.weekendTechAssignments || [])
      .map((ta: any) => ta.technician?.linkedUserId)
      .filter(Boolean);

    const linkedUsersMap = new Map<string, { weeklySalary: number }>();
    if (linkedUserIds.length > 0) {
      const linkedUsers = await prisma.user.findMany({
        where: { id: { in: [...new Set(linkedUserIds)] } },
        select: { id: true, weeklySalary: true },
      });
      for (const u of linkedUsers) {
        linkedUsersMap.set(u.id, { weeklySalary: u.weeklySalary || 0 });
      }
    }

    for (const activity of allActivities) {
      const durationHours = getDurationHours(activity.startTime, activity.endTime);
      const actDate = activity.date instanceof Date 
        ? activity.date.toISOString().substring(0, 10) 
        : String(activity.date).substring(0, 10);

      // A. Mano de Obra (Técnicos)
      activity.weekendTechAssignments?.forEach((ta: any) => {
        const t = ta.technician;
        if (!t) return;

        let rate = t.hourlyRate || 0;
        if (rate === 0 && t.linkedUserId) {
          // Look up the linked User's weeklySalary from our pre-fetched map
          const linkedUser = linkedUsersMap.get(t.linkedUserId);
          const weeklySalary = linkedUser?.weeklySalary || 0;
          if (weeklySalary > 0) {
            rate = Number((weeklySalary / 48).toFixed(2));
          }
        }

        const cost = Number((rate * durationHours).toFixed(2));
        techEntries.push({
          id: t.id,
          name: t.name,
          type: t.type,
          contractor: t.contractor?.name || 'Interno',
          hours: durationHours,
          rate,
          cost,
          activityId: activity.id,
          activityTitle: activity.title,
          activityDate: actDate,
        });
        perryResources.summary.laborCost += cost;
      });

      // B. Seguridad y Supervisores
      // B.1 Safety Dedicados
      activity.weekendSafetyAssignments?.forEach((sa: any) => {
        const s = sa.safetyDedicado;
        if (!s) return;
        const cost = 1200; 
        safetyEntries.push({
          id: s.id,
          name: s.name,
          role: 'Safety Dedicado',
          cost,
          activityId: activity.id,
          activityDate: actDate,
        });
        perryResources.summary.safetyCost += cost;
      });

      // B.2 Safety Designados / Supervisores (Usuarios locales)
      activity.weekendUserSafetyAssignments?.forEach((sa: any) => {
        const u = sa.user;
        if (!u) return;

        const weeklySalary = u.weeklySalary || 0;
        const rate = weeklySalary > 0 ? Number((weeklySalary / 48).toFixed(2)) : 150;
        const cost = Number((rate * durationHours).toFixed(2));

        safetyEntries.push({
          id: u.id,
          name: u.name,
          role: 'Supervisor Operativo',
          cost,
          activityId: activity.id,
          activityDate: actDate,
        });
        perryResources.summary.safetyCost += cost;
      });

      // B.3 Fallback to main activity user if no explicit safety users are assigned
      const hasExplicitSafetyUsers = activity.weekendUserSafetyAssignments && activity.weekendUserSafetyAssignments.length > 0;
      if (!hasExplicitSafetyUsers && activity.user && activity.type === 'EJECUCION') {
        const u = activity.user;
        const weeklySalary = u.weeklySalary || 0;
        const rate = weeklySalary > 0 ? Number((weeklySalary / 48).toFixed(2)) : 150;
        const cost = Number((rate * durationHours).toFixed(2));

        safetyEntries.push({
          id: u.id,
          name: u.name,
          role: 'Supervisor Operativo',
          cost,
          activityId: activity.id,
          activityDate: actDate,
        });
        perryResources.summary.safetyCost += cost;
      }

      // C. Renta de Equipos (Plataformas)
      activity.weekendEquipAssignments?.forEach((ea: any) => {
        const eq = ea.equip;
        if (!eq) return;

        const dailyCost = eq.costPerDay || 0;
        const freight = eq.freightCost || 0;
        const totalEquipCost = dailyCost + freight;

        equipEntries.push({
          id: eq.id,
          name: eq.name,
          ownership: eq.ownership,
          costPerDay: dailyCost,
          freightCost: freight,
          cost: totalEquipCost,
          activityId: activity.id,
          activityDate: actDate,
        });
        perryResources.summary.equipmentCost += totalEquipCost;
      });
    }

    // Aggregate technicians: group by person, sum hours and cost across activities
    const techMap = new Map<string, any>();
    for (const t of techEntries) {
      const key = t.id;
      if (techMap.has(key)) {
        const existing = techMap.get(key)!;
        existing.hours += t.hours;
        existing.cost += t.cost;
        existing.activityCount += 1;
        existing.activities.push({ id: t.activityId, title: t.activityTitle, date: t.activityDate, hours: t.hours });
      } else {
        techMap.set(key, {
          id: t.id,
          name: t.name,
          type: t.type,
          contractor: t.contractor,
          hours: t.hours,
          rate: t.rate,
          cost: t.cost,
          activityCount: 1,
          activities: [{ id: t.activityId, title: t.activityTitle, date: t.activityDate, hours: t.hours }],
        });
      }
    }
    perryResources.technicians = Array.from(techMap.values());

    // Aggregate safety: group by person, sum cost
    const safetyMap = new Map<string, any>();
    for (const s of safetyEntries) {
      const key = `${s.id}-${s.role}`;
      if (safetyMap.has(key)) {
        const existing = safetyMap.get(key)!;
        existing.cost += s.cost;
        existing.activityCount += 1;
      } else {
        safetyMap.set(key, {
          id: s.id,
          name: s.name,
          role: s.role,
          cost: s.cost,
          activityCount: 1,
        });
      }
    }
    perryResources.safety = Array.from(safetyMap.values());

    // Aggregate equipment: group by equip, sum cost
    const equipMap = new Map<string, any>();
    for (const eq of equipEntries) {
      const key = eq.id;
      if (equipMap.has(key)) {
        const existing = equipMap.get(key)!;
        existing.cost += eq.cost;
        existing.activityCount += 1;
      } else {
        equipMap.set(key, {
          id: eq.id,
          name: eq.name,
          ownership: eq.ownership,
          costPerDay: eq.costPerDay,
          freightCost: eq.freightCost,
          cost: eq.cost,
          activityCount: 1,
        });
      }
    }
    perryResources.equipment = Array.from(equipMap.values());

    // Calcular Costo Total
    perryResources.summary.totalCost = 
      perryResources.summary.laborCost + 
      perryResources.summary.equipmentCost + 
      perryResources.summary.safetyCost;

    // Build the perryActivities summary for the response header
    const perryActivitiesSummary = allActivities.map(a => ({
      id: a.id,
      title: a.title,
      date: a.date instanceof Date ? a.date.toISOString() : String(a.date),
      type: a.type,
      clientName: a.client?.name || 'Desconocido',
      companyName: a.company?.name || 'Desconocido',
      durationHours: getDurationHours(a.startTime, a.endTime),
      startTime: a.startTime,
      endTime: a.endTime,
      userName: a.user?.name || null,
    }));

    const totalDurationHours = perryActivitiesSummary.reduce((s, a) => s + a.durationHours, 0);

    // Use the first activity for backward compatibility in banner display
    const firstActivity = allActivities[0] || null;

    // 6. Enviar respuesta unificada
    return NextResponse.json({
      folio,
      odooOrder: {
        id: order.id,
        name: order.name,
        companyName: order.company_id ? order.company_id[1] : null,
        amountTotal: totalQuotedAmount,
        amountUntaxed: totalQuotedUntaxed,
      },
      odooBreakdown,
      // Backward compat: single activity for banner
      perryActivity: firstActivity ? {
        id: firstActivity.id,
        title: firstActivity.title,
        date: firstActivity.date instanceof Date ? firstActivity.date.toISOString() : String(firstActivity.date),
        clientName: firstActivity.client?.name || 'Desconocido',
        companyName: firstActivity.company?.name || 'Desconocido',
        durationHours: totalDurationHours,
        startTime: firstActivity.startTime,
        endTime: firstActivity.endTime
      } : null,
      // New: all activities summary
      perryActivities: perryActivitiesSummary,
      perryResources
    });

  } catch (error: any) {
    console.error('Odoo breakdown API error:', error);
    return NextResponse.json({ error: 'Error al procesar desglose económico', detail: error.message }, { status: 500 });
  }
}
