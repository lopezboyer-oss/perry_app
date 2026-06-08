import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { odooExecute, resetUid } from '@/lib/odoo';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const role = session.user.role;
    const userId = session.user.id;
    const userName = session.user.name;

    // 1. Validar accesos de rol
    const allowedRoles = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'INGENIERO'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'No tienes permisos para ver este reporte' }, { status: 403 });
    }

    // 2. Resolver filtro multiempresa
    const companyParam = req.nextUrl.searchParams.get('companyId');
    let odooCompanyFilter: any = ['company_id', '=', 1]; // GC por defecto
    
    if (companyParam === 'ALL' && role === 'ADMIN') {
      odooCompanyFilter = ['company_id', 'in', [1, 2, 3, 4, 5]];
    } else if (companyParam && companyParam !== 'ALL') {
      if (role !== 'ADMIN') {
        const hasAccess = await prisma.userCompany.findFirst({
          where: { userId, companyId: companyParam },
        });
        if (!hasAccess) {
          return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 });
        }
      }
      const company = await prisma.company.findUnique({ where: { id: companyParam } });
      if (company) odooCompanyFilter = ['company_id', '=', company.odooId];
    } else {
      // Fallback a empresa por defecto o cualquiera a la que tenga acceso
      const userDefault = await prisma.userCompany.findFirst({
        where: { userId, isDefault: true },
        include: { company: { select: { odooId: true } } },
      });
      if (userDefault) {
        odooCompanyFilter = ['company_id', '=', userDefault.company.odooId];
      } else {
        const anyUC = await prisma.userCompany.findFirst({
          where: { userId },
          include: { company: { select: { odooId: true } } },
          orderBy: { company: { sortOrder: 'asc' } },
        });
        if (anyUC) odooCompanyFilter = ['company_id', '=', anyUC.company.odooId];
      }
    }

    // 3. Consultar Odoo (Pedidos de venta con cotización confirmada y PO, no completamente facturados)
    console.log('Querying sale.order with company filter:', odooCompanyFilter);
    const orders = await odooExecute('sale.order', 'search_read', [
      [[
        ['state', 'in', ['sale', 'done']],
        ['invoice_status', '!=', 'invoiced'],
        ['x_studio_po_cliente_1', '!=', false],
        odooCompanyFilter,
      ]],
      {
        fields: [
          'name', 'x_studio_po_cliente_1', 'x_studio_proyecto',
          'partner_id', 'state', 'invoice_status',
          'amount_total', 'amount_untaxed', 'date_order',
          'user_id', 'company_id'
        ],
        order: 'date_order desc'
      }
    ]);

    // 4. Limpieza y validación de POs en JS
    const hasPO = (po: any) => {
      if (!po || typeof po !== 'string') return false;
      const cleanPO = po.trim().toUpperCase();
      return cleanPO !== '' && cleanPO !== 'NO' && cleanPO !== 'N/A' && cleanPO !== 'NONE';
    };
    const validOrders = (orders || []).filter((o: any) => hasPO(o.x_studio_po_cliente_1));

    // 5. Restricción para Ingenieros (sólo ver folios propios)
    let filteredOrders = validOrders;
    if (role === 'INGENIERO') {
      // Obtener folios en Perry asignados a este ingeniero
      const userActivities = await prisma.activity.findMany({
        where: { userId, workOrderFolio: { not: null } },
        select: { workOrderFolio: true }
      });
      const userFolios = new Set(
        userActivities
          .map(a => a.workOrderFolio?.trim().toUpperCase())
          .filter(Boolean)
      );

      filteredOrders = validOrders.filter((o: any) => {
        // Coincide por vendedor en Odoo
        const odooSalesperson = o.user_id ? o.user_id[1] : '';
        const isSalesperson = odooSalesperson.toUpperCase().includes(userName.toUpperCase()) ||
                              userName.toUpperCase().includes(odooSalesperson.toUpperCase());
        // O coincide por folio asignado en Perry
        const isPerryAssigned = userFolios.has(o.name.toUpperCase());
        
        return isSalesperson || isPerryAssigned;
      });
    }

    // 6. Cargar notas/comentarios desde la base de datos de Perry
    const folios = filteredOrders.map((o: any) => o.name);
    const comments = folios.length > 0
      ? await prisma.odooFolioComment.findMany({
          where: { folio: { in: folios } },
          orderBy: { createdAt: 'desc' }
        })
      : [];

    // 7. Mapear y unificar la respuesta
    const mapped = filteredOrders.map((o: any) => {
      const partnerFull = o.partner_id ? o.partner_id[1] : '';
      const parts = partnerFull.split(',');
      const clientCompany = parts[0]?.trim() || '';
      const clientContact = parts.slice(1).join(',').trim() || '';

      return {
        id: o.id,
        name: o.name,
        po: o.x_studio_po_cliente_1,
        project: o.x_studio_proyecto || null,
        clientCompany,
        clientContact,
        state: o.state,
        invoiceStatus: o.invoice_status,
        amountTotal: o.amount_total,
        amountUntaxed: o.amount_untaxed,
        dateOrder: o.date_order,
        salesperson: o.user_id ? o.user_id[1] : null,
        companyName: o.company_id ? o.company_id[1] : null,
        comments: comments
          .filter((c) => c.folio.toUpperCase() === o.name.toUpperCase())
          .map((c) => ({
            id: c.id,
            content: c.content,
            userName: c.userName,
            createdAt: c.createdAt.toISOString()
          }))
      };
    });

    return NextResponse.json({ orders: mapped });
  } catch (error: any) {
    console.error('Odoo trabajos-abiertos error:', error);
    if (error.message?.includes('auth') || error.message?.includes('ODOO_CONFIG')) resetUid();
    return NextResponse.json({ error: 'Error al consultar Odoo', detail: error.message }, { status: 500 });
  }
}
