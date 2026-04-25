import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

const ODOO_URL = process.env.ODOO_URL!;
const ODOO_DB = process.env.ODOO_DB!;
const ODOO_USER = process.env.ODOO_USER!;
const ODOO_API_KEY = process.env.ODOO_API_KEY!;

// Cache the UID to avoid re-authenticating on every request
let cachedUid: number | null = null;

async function getUid(): Promise<number> {
  if (cachedUid) return cachedUid;

  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 1,
      params: { service: 'common', method: 'authenticate', args: [ODOO_DB, ODOO_USER, ODOO_API_KEY, {}] },
    }),
  });
  const data = await res.json();
  if (!data.result) throw new Error('Odoo authentication failed');
  cachedUid = data.result as number;
  return cachedUid;
}

async function searchOrder(folio: string) {
  const uid = await getUid();

  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 2,
      params: {
        service: 'object', method: 'execute_kw',
        args: [ODOO_DB, uid, ODOO_API_KEY, 'sale.order', 'search_read',
          [[['name', '=', folio]]],
          { fields: ['name', 'x_studio_po_cliente_1', 'partner_id', 'state'], limit: 1 },
        ],
      },
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Odoo query error');
  return data.result;
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

    return NextResponse.json({
      found: true,
      folio: order.name,
      purchaseOrder: hasPO ? poValue : null,
      client: order.partner_id ? order.partner_id[1] : null,
      state: order.state,
      stateLabel: { draft: 'Borrador', sent: 'Enviada', sale: 'Confirmada', cancel: 'Cancelada' }[order.state] || order.state,
    });
  } catch (error: any) {
    console.error('Odoo lookup error:', error);
    // Reset cached UID on auth errors
    if (error.message?.includes('auth')) cachedUid = null;
    return NextResponse.json({ error: 'Error al consultar Odoo', detail: error.message }, { status: 500 });
  }
}
