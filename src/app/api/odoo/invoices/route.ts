import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { odooExecute, resetUid } from '@/lib/odoo';
import { prisma } from '@/lib/prisma';

// GET /api/odoo/invoices — fetch all unpaid/partial invoices from Odoo
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const role = session.user.role;

    // Determine which Odoo company_id(s) to query
    const companyParam = req.nextUrl.searchParams.get('companyId');
    let odooCompanyFilter: any = ['company_id', '=', 1]; // fallback GC
    
    if (companyParam === 'ALL' && role === 'ADMIN') {
      // ADMIN consolidated view — all companies except test (6)
      odooCompanyFilter = ['company_id', 'in', [1, 2, 3, 4, 5]];
    } else if (companyParam && companyParam !== 'ALL') {
      // If not ADMIN, validate access to the requested company
      if (role !== 'ADMIN') {
        const hasAccess = await prisma.userCompany.findFirst({
          where: { userId: session.user.id, companyId: companyParam },
        });
        if (!hasAccess) {
          return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 });
        }
      }
      // Specific company — look up its odooId
      const company = await prisma.company.findUnique({ where: { id: companyParam } });
      if (company) odooCompanyFilter = ['company_id', '=', company.odooId];
    } else {
      // No cookie/param — resolve user's default company
      const userDefault = await prisma.userCompany.findFirst({
        where: { userId: session.user.id, isDefault: true },
        include: { company: { select: { odooId: true } } },
      });
      if (userDefault) {
        odooCompanyFilter = ['company_id', '=', userDefault.company.odooId];
      } else {
        // Fallback: any company the user has access to
        const anyUC = await prisma.userCompany.findFirst({
          where: { userId: session.user.id },
          include: { company: { select: { odooId: true } } },
          orderBy: { company: { sortOrder: 'asc' } },
        });
        if (anyUC) odooCompanyFilter = ['company_id', '=', anyUC.company.odooId];
      }
    }

    // Fetch UNPAID invoices (the ones we need to track) — no limit
    const unpaidInvoices = await odooExecute('account.move', 'search_read', [
      [[
        ['move_type', '=', 'out_invoice'],
        ['state', '=', 'posted'],
        ['payment_state', 'in', ['not_paid', 'partial']],
        odooCompanyFilter,
      ]],
      {
        fields: [
          'name', 'state', 'payment_state',
          'amount_total', 'amount_residual',
          'invoice_date',
          'ref', 'partner_id', 'invoice_origin',
          'invoice_user_id',
          'company_id',
        ],
        order: 'invoice_date_due asc',
      },
    ]);

    // Fetch recent PAID invoices (for context, last 30)
    const paidInvoices = await odooExecute('account.move', 'search_read', [
      [[
        ['move_type', '=', 'out_invoice'],
        ['state', '=', 'posted'],
        ['payment_state', 'in', ['paid', 'in_payment']],
        odooCompanyFilter,
      ]],
      {
        fields: [
          'name', 'state', 'payment_state',
          'amount_total', 'amount_residual',
          'invoice_date',
          'ref', 'partner_id', 'invoice_origin',
          'invoice_user_id',
          'company_id',
        ],
        order: 'invoice_date desc',
        limit: 30,
      },
    ]);

    const invoices = [...(unpaidInvoices || []), ...(paidInvoices || [])];

    // Secondary source: cross-reference folios with Perry activities to find the engineer and title
    const folios = [...new Set(invoices.map((inv: any) => inv.invoice_origin).filter(Boolean))];
    const engineerMap: Record<string, string> = {};
    const titleMap: Record<string, string> = {};

    if (folios.length > 0) {
      const activities = await prisma.activity.findMany({
        where: { workOrderFolio: { in: folios } },
        select: {
          workOrderFolio: true,
          title: true,
          user: { select: { name: true } },
        },
      });
      activities.forEach((a) => {
        if (a.workOrderFolio) {
          if (a.user?.name) engineerMap[a.workOrderFolio] = a.user.name;
          if (a.title) titleMap[a.workOrderFolio] = a.title;
        }
      });
    }

    const mapped = (invoices || []).map((inv: any) => {
      const isPaid = inv.payment_state === 'paid' || inv.payment_state === 'in_payment';

      // Split partner into company + contact
      const partnerFull = inv.partner_id ? inv.partner_id[1] : '';
      const parts = partnerFull.split(',');
      const company = parts[0]?.trim() || '';
      const contact = parts.slice(1).join(',').trim() || '';

      // Engineer: primary from Odoo salesperson, fallback to Perry activity match
      const odooEngineer = inv.invoice_user_id ? inv.invoice_user_id[1] : null;
      const perryEngineer = inv.invoice_origin ? (engineerMap[inv.invoice_origin] || null) : null;

      // Get clean signature/company name from company_id
      const officialCompany = inv.company_id ? inv.company_id[1] : '';
      let sellerCompany = 'GS Ingeniería'; // fallback
      if (officialCompany.toUpperCase().includes('TRAILA')) {
        sellerCompany = 'Traila Maquinaria';
      } else if (officialCompany.toUpperCase().includes('CONSORCIO')) {
        sellerCompany = 'Consorcio Operativo Perry';
      } else if (officialCompany.toUpperCase().includes('SOLUCIONES')) {
        sellerCompany = 'Soluciones Industriales';
      } else if (officialCompany.toUpperCase().includes('GS INGENIERIA')) {
        sellerCompany = 'GS Ingeniería';
      } else if (officialCompany) {
        sellerCompany = officialCompany
          .replace(/\s+(S\.?[A-Z]\.?\s+DE\s+C\.?[V]\.?|S\.?\s+DE\s+R\.?\s+L\.?.*)$/i, '')
          .trim();
      }

      const poTitle = inv.invoice_origin ? (titleMap[inv.invoice_origin] || null) : null;

      return {
        id: inv.id,
        number: inv.name,
        folio: inv.invoice_origin || null,
        po: inv.ref || null,
        paymentState: inv.payment_state,
        amountTotal: inv.amount_total,
        amountPending: inv.amount_residual,
        invoiceDate: inv.invoice_date,
        isPaid,
        company,
        contact,
        engineer: odooEngineer || perryEngineer || null,
        sellerCompany,
        poTitle,
      };
    });

    return NextResponse.json({ invoices: mapped });
  } catch (error: any) {
    console.error('Odoo invoices error:', error);
    if (error.message?.includes('auth') || error.message?.includes('ODOO_CONFIG')) resetUid();
    return NextResponse.json({ error: 'Error al consultar Odoo', detail: error.message }, { status: 500 });
  }
}
