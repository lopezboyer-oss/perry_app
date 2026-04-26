import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// Cache the UID to avoid re-authenticating on every request
let cachedUid: number | null = null;

function getOdooDb(url: string): string {
  // Extract DB name from Odoo URL: https://perryapp.odoo.com -> perryapp
  try {
    const hostname = new URL(url).hostname;
    return hostname.split('.')[0];
  } catch {
    return '';
  }
}

async function getUid(): Promise<number> {
  if (cachedUid) return cachedUid;

  const url = process.env.ODOO_URL;
  const user = process.env.ODOO_USER;
  const apiKey = process.env.ODOO_API_KEY;

  if (!url || !user || !apiKey) {
    throw new Error(`Odoo env vars missing - url:${!!url} user:${!!user} key:${!!apiKey}`);
  }

  const db = getOdooDb(url);
  if (!db) throw new Error('Could not extract DB name from ODOO_URL');

  const res = await fetch(`${url}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 1,
      params: { service: 'common', method: 'authenticate', args: [db, user, apiKey, {}] },
    }),
  });
  const data = await res.json();
  if (!data.result) throw new Error('Odoo authentication failed');
  cachedUid = data.result as number;
  return cachedUid;
}

async function searchOrder(folio: string) {
  const uid = await getUid();
  const url = process.env.ODOO_URL!;
  const apiKey = process.env.ODOO_API_KEY!;
  const db = getOdooDb(url);

  const res = await fetch(`${url}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 2,
      params: {
        service: 'object', method: 'execute_kw',
        args: [db, uid, apiKey, 'sale.order', 'search_read',
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
      stateLabel: ({ draft: 'Borrador', sent: 'Enviada', sale: 'Confirmada', cancel: 'Cancelada' } as Record<string, string>)[order.state] || order.state,
    });
  } catch (error: any) {
    console.error('Odoo lookup error:', error);
    if (error.message?.includes('auth') || error.message?.includes('missing')) cachedUid = null;
    return NextResponse.json({ error: 'Error al consultar Odoo', detail: error.message }, { status: 500 });
  }
}
