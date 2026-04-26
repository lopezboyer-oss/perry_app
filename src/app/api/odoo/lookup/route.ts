import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// Cache the UID to avoid re-authenticating on every request
let cachedUid: number | null = null;

interface OdooConfig {
  url: string;
  user: string;
  key: string;
}

function getOdooConfig(): OdooConfig {
  const encoded = process.env.ODOO_CONFIG;
  if (!encoded) throw new Error('ODOO_CONFIG env var is not set');

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    throw new Error('Failed to decode ODOO_CONFIG');
  }
}

function getOdooDb(url: string): string {
  // Extract DB name from Odoo URL: https://perryapp.odoo.com -> perryapp
  return new URL(url).hostname.split('.')[0];
}

async function getUid(): Promise<number> {
  if (cachedUid) return cachedUid;

  const config = getOdooConfig();
  const db = getOdooDb(config.url);

  const res = await fetch(`${config.url}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 1,
      params: { service: 'common', method: 'authenticate', args: [db, config.user, config.key, {}] },
    }),
  });
  const data = await res.json();
  if (!data.result) throw new Error('Odoo authentication failed');
  cachedUid = data.result as number;
  return cachedUid;
}

async function searchOrder(folio: string) {
  const uid = await getUid();
  const config = getOdooConfig();
  const db = getOdooDb(config.url);

  const res = await fetch(`${config.url}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 2,
      params: {
        service: 'object', method: 'execute_kw',
        args: [db, uid, config.key, 'sale.order', 'search_read',
          [[['name', '=', folio]]],
          { fields: ['name', 'x_studio_po_cliente_1', 'x_studio_proyecto', 'x_studio_empresa_relacionada', 'partner_id', 'state'], limit: 1 },
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

    // Extract company and contact names
    const partnerFull = order.partner_id ? order.partner_id[1] : '';
    const empresa = order.x_studio_empresa_relacionada ? order.x_studio_empresa_relacionada[1] : null;
    // Contact name: partner_id often has "COMPANY, CONTACT" format
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
    if (error.message?.includes('auth') || error.message?.includes('ODOO_CONFIG')) cachedUid = null;
    return NextResponse.json({ error: 'Error al consultar Odoo', detail: error.message }, { status: 500 });
  }
}
