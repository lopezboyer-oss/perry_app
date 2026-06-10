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

    let activity: any = null;
    let folio = '';

    // 2. Obtener actividad y folio
    if (activityId) {
      activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          client: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
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
        }
      });
      
      if (!activity) {
        return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
      }
      folio = activity.workOrderFolio || '';
    } else if (searchFolio) {
      folio = searchFolio.toUpperCase().trim();
      
      // Intentar buscar alguna actividad en Perry asociada a ese folio para traer sus asignaciones
      activity = await prisma.activity.findFirst({
        where: { workOrderFolio: { equals: folio, mode: 'insensitive' } },
        include: {
          client: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
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
        },
        orderBy: { date: 'desc' }
      });
    }

    if (!folio) {
      return NextResponse.json({ error: 'La actividad seleccionada no tiene un Folio Odoo asociado.' }, { status: 400 });
    }

    // 3. Consultar Odoo para obtener detalles del folio
    console.log(`Buscando orden de venta ${folio} en Odoo...`);
    const odooOrders = await odooExecute('sale.order', 'search_read', [
      [[['name', '=', folio]]],
      {
        fields: ['name', 'amount_total', 'amount_untaxed', 'order_line', 'company_id']
      }
    ]);

    if (!odooOrders || odooOrders.length === 0) {
      return NextResponse.json({ 
        error: `No se encontró la orden de venta "${folio}" en Odoo.`, 
        activityFound: !!activity 
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

      const isRental = desc.includes('RENTA') || desc.includes('PLATAFORMA') || desc.includes('TIJERA') || desc.includes('GENIE') || desc.includes('GRUA') || desc.includes('ELEVACION') || desc.includes('MANLIFT') ||
                       productName.includes('RENTA') || productName.includes('PLATAFORMA');
                       
      const isCoord = desc.includes('COORDINACION') || desc.includes('SAFETY') || desc.includes('SUPERVISOR') || desc.includes('JSRA') || desc.includes('VIGILANTE') ||
                      productName.includes('COORDINACION') || productName.includes('SEGURIDAD');

      const isIndirect = desc.includes('INDIRECTO') || desc.includes('EPP') || desc.includes('CONSUMIBLES') || desc.includes('ADMINISTRACION');

      const isMaterial = productName.includes('MATERIAL') || productName.includes('SUMINISTRO') || desc.includes('MATERIAL') || desc.includes('SUMINISTRO');

      const isLabor = productName.includes('SERVICIO') || productName.includes('MANO DE OBRA') || desc.includes('INSTALACION') || desc.includes('EJECUCION') || desc.includes('FABRICACION');

      const item = {
        id: l.id,
        product: l.product_id ? l.product_id[1] : '—',
        description: l.name ? l.name.replace(/\n/g, ' / ').trim() : '',
        qty: l.product_uom_qty,
        price: l.price_unit,
        subtotal: l.price_subtotal
      };

      if (isRental) odooBreakdown.equipmentRental.push(item);
      else if (isCoord) odooBreakdown.coordination.push(item);
      else if (isIndirect) odooBreakdown.indirects.push(item);
      else if (isMaterial) odooBreakdown.materials.push(item);
      else if (isLabor) odooBreakdown.labor.push(item);
      else odooBreakdown.other.push(item);
    });

    // 5. Procesar asignaciones en Perry y calcular costos programados
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

    if (activity) {
      const durationHours = getDurationHours(activity.startTime, activity.endTime);

      // A. Mano de Obra (Técnicos)
      activity.weekendTechAssignments?.forEach((ta: any) => {
        const t = ta.technician;
        if (!t) return;

        let rate = t.hourlyRate || 0;
        // Si no tiene tarifa pero tiene usuario vinculado, estimar de su salario semanal
        if (rate === 0 && t.linkedUserId) {
          // Buscamos salario semanal si es usuario interno
          const matchedUser = activity.weekendUserSafetyAssignments?.find((sa: any) => sa.userId === t.linkedUserId)?.user 
                            || activity.weekendTechAssignments?.find((ta2: any) => ta2.technician?.linkedUserId === t.linkedUserId)?.user;
          const weeklySalary = matchedUser?.weeklySalary || 0;
          if (weeklySalary > 0) {
            rate = Number((weeklySalary / 48).toFixed(2)); // Estimar 48 hrs semanales
          }
        }

        const cost = Number((rate * durationHours).toFixed(2));
        perryResources.technicians.push({
          id: t.id,
          name: t.name,
          type: t.type,
          contractor: t.contractor?.name || 'Interno',
          hours: durationHours,
          rate,
          cost
        });
        perryResources.summary.laborCost += cost;
      });

      // B. Seguridad y Supervisores
      // B.1 Safety Dedicados
      activity.weekendSafetyAssignments?.forEach((sa: any) => {
        const s = sa.safetyDedicado;
        if (!s) return;
        // Asignamos un costo estimado o tasa por evento (ej: $1,200 por turno)
        const cost = 1200; 
        perryResources.safety.push({
          id: s.id,
          name: s.name,
          role: 'Safety Dedicado',
          cost
        });
        perryResources.summary.safetyCost += cost;
      });

      // B.2 Safety Designados / Supervisores (Usuarios locales)
      activity.weekendUserSafetyAssignments?.forEach((sa: any) => {
        const u = sa.user;
        if (!u) return;

        const weeklySalary = u.weeklySalary || 0;
        const rate = weeklySalary > 0 ? Number((weeklySalary / 48).toFixed(2)) : 150; // default $150/hr
        const cost = Number((rate * durationHours).toFixed(2));

        perryResources.safety.push({
          id: u.id,
          name: u.name,
          role: 'Supervisor Operativo',
          cost
        });
        perryResources.summary.safetyCost += cost;
      });

      // C. Renta de Equipos (Plataformas)
      activity.weekendEquipAssignments?.forEach((ea: any) => {
        const eq = ea.equip;
        if (!eq) return;

        const dailyCost = eq.costPerDay || 0;
        const freight = eq.freightCost || 0;
        const totalEquipCost = dailyCost + freight; // Asumimos 1 día por asignación

        perryResources.equipment.push({
          id: eq.id,
          name: eq.name,
          ownership: eq.ownership,
          costPerDay: dailyCost,
          freightCost: freight,
          cost: totalEquipCost
        });
        perryResources.summary.equipmentCost += totalEquipCost;
      });

      // Calcular Costo Total
      perryResources.summary.totalCost = 
        perryResources.summary.laborCost + 
        perryResources.summary.equipmentCost + 
        perryResources.summary.safetyCost;
    }

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
      perryActivity: activity ? {
        id: activity.id,
        title: activity.title,
        date: activity.date.toISOString(),
        clientName: activity.client?.name || 'Desconocido',
        companyName: activity.company?.name || 'Desconocido',
        durationHours: getDurationHours(activity.startTime, activity.endTime),
        startTime: activity.startTime,
        endTime: activity.endTime
      } : null,
      perryResources
    });

  } catch (error: any) {
    console.error('Odoo breakdown API error:', error);
    return NextResponse.json({ error: 'Error al procesar desglose económico', detail: error.message }, { status: 500 });
  }
}
