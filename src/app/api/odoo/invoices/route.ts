import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { odooExecute, resetUid } from '@/lib/odoo';

// GET /api/odoo/invoices — fetch all unpaid/partial invoices from Odoo
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'SUPERVISOR' && role !== 'SUPERVISOR_SAFETY_LP') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Fetch UNPAID invoices (the ones we need to track) — no limit
    const unpaidInvoices = await odooExecute('account.move', 'search_read', [
      [[
        ['move_type', '=', 'out_invoice'],
        ['state', '=', 'posted'],
        ['payment_state', 'in', ['not_paid', 'partial']],
      ]],
      {
        fields: [
          'name', 'state', 'payment_state',
          'amount_total', 'amount_residual',
          'invoice_date', 'invoice_date_due',
          'ref', 'partner_id', 'invoice_origin',
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
      ]],
      {
        fields: [
          'name', 'state', 'payment_state',
          'amount_total', 'amount_residual',
          'invoice_date', 'invoice_date_due',
          'ref', 'partner_id', 'invoice_origin',
        ],
        order: 'invoice_date desc',
        limit: 30,
      },
    ]);

    const invoices = [...(unpaidInvoices || []), ...(paidInvoices || [])];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mapped = (invoices || []).map((inv: any) => {
      const dueDate = inv.invoice_date_due ? new Date(inv.invoice_date_due) : null;
      let daysUntilDue: number | null = null;
      let urgency: 'overdue' | 'urgent' | 'normal' | 'paid' = 'normal';

      if (inv.payment_state === 'paid' || inv.payment_state === 'in_payment') {
        urgency = 'paid';
      } else if (dueDate) {
        daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue < 0) urgency = 'overdue';
        else if (daysUntilDue <= 7) urgency = 'urgent';
      }

      // Split partner into company + contact
      const partnerFull = inv.partner_id ? inv.partner_id[1] : '';
      const parts = partnerFull.split(',');
      const company = parts[0]?.trim() || '';
      const contact = parts.slice(1).join(',').trim() || '';

      return {
        id: inv.id,
        number: inv.name,
        folio: inv.invoice_origin || null,
        po: inv.ref || null,
        paymentState: inv.payment_state,
        amountTotal: inv.amount_total,
        amountPending: inv.amount_residual,
        invoiceDate: inv.invoice_date,
        dueDate: inv.invoice_date_due,
        daysUntilDue,
        urgency,
        company,
        contact,
      };
    });

    return NextResponse.json({ invoices: mapped });
  } catch (error: any) {
    console.error('Odoo invoices error:', error);
    if (error.message?.includes('auth') || error.message?.includes('ODOO_CONFIG')) resetUid();
    return NextResponse.json({ error: 'Error al consultar Odoo', detail: error.message }, { status: 500 });
  }
}
