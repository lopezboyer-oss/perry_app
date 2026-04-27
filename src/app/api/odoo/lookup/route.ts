import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { odooExecute, resetUid } from '@/lib/odoo';

async function searchOrder(folio: string) {
  return odooExecute('sale.order', 'search_read', [
    [[['name', '=', folio]]],
    { fields: ['name', 'x_studio_po_cliente_1', 'x_studio_proyecto', 'x_studio_empresa_relacionada', 'partner_id', 'state'], limit: 1 },
  ]);
}

// GET /api/odoo/lookup?folio=S06314
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const folio = req.nextUrl.searchParams.get('folio')?.trim().toUpperCase();
    if (!folio) return NextResponse.json({ error: 'Folio requerido' }, { status: 400 });

    const orders = await searchOrder(folio);

    if (!orders || orders.length === 0) {
      return NextResponse.json({ found: false, message: `No se encontró la orden "${folio}" en Odoo` });
    }

    const order = orders[0];
    const poValue = order.x_studio_po_cliente_1;
    const hasPO = poValue && poValue !== 'NO' && poValue !== 'no' && poValue !== 'N/A' && poValue.trim() !== '';

    // Extract company and contact names
    const partnerFull = order.partner_id ? order.partner_id[1] : '';
    const empresa = order.x_studio_empresa_relacionada ? order.x_studio_empresa_relacionada[1] : null;
    let contactName: string | null = null;
    if (partnerFull && partnerFull.includes(',')) {
      contactName = partnerFull.split(',').slice(1).join(',').trim();
    }

    return NextResponse.json({
      found: true,
      folio: order.name,
      purchaseOrder: hasPO ? poValue : null,
      project: order.x_studio_proyecto || null,
      client: partnerFull,
      companyName: empresa || (partnerFull ? partnerFull.split(',')[0].trim() : null),
      contactName,
      state: order.state,
      stateLabel: ({ draft: 'Borrador', sent: 'Enviada', sale: 'Confirmada', cancel: 'Cancelada' } as Record<string, string>)[order.state] || order.state,
    });
  } catch (error: any) {
    console.error('Odoo lookup error:', error);
    if (error.message?.includes('auth') || error.message?.includes('ODOO_CONFIG')) resetUid();
    return NextResponse.json({ error: 'Error al consultar Odoo', detail: error.message }, { status: 500 });
  }
}
