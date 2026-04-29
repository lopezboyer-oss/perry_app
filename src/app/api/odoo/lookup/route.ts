import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { odooExecute, resetUid } from '@/lib/odoo';
import { prisma } from '@/lib/prisma';

async function searchOrder(folio: string) {
  return odooExecute('sale.order', 'search_read', [
    [[[  'name', '=', folio]]],
    { fields: ['name', 'x_studio_po_cliente_1', 'x_studio_proyecto', 'x_studio_empresa_relacionada', 'partner_id', 'state'], limit: 1 },
  ]);
}

/**
 * Auto-create client in Perry if it doesn't exist (fuzzy match by name).
 * Returns the client ID.
 */
async function ensureClient(companyName: string): Promise<string | null> {
  if (!companyName) return null;
  const upper = companyName.toUpperCase().trim();

  // Try fuzzy match
  const clients = await prisma.client.findMany({ select: { id: true, name: true } });
  const matched = clients.find((c) =>
    upper.includes(c.name.toUpperCase()) || c.name.toUpperCase().includes(upper)
  );
  if (matched) return matched.id;

  // Not found — auto-create
  const newClient = await prisma.client.create({
    data: { name: companyName.trim(), status: 'ACTIVO', notes: 'Creado automáticamente desde Odoo' },
  });
  return newClient.id;
}

/**
 * Auto-create contact under a client if it doesn't exist.
 * Returns the contact ID.
 */
async function ensureContact(clientId: string, contactName: string): Promise<string | null> {
  if (!clientId || !contactName) return null;
  const upper = contactName.toUpperCase().trim();

  // Try fuzzy match within the client
  const contacts = await prisma.contact.findMany({
    where: { clientId },
    select: { id: true, name: true },
  });
  const matched = contacts.find((c) =>
    upper.includes(c.name.toUpperCase()) || c.name.toUpperCase().includes(upper)
  );
  if (matched) return matched.id;

  // Not found — auto-create
  const newContact = await prisma.contact.create({
    data: { clientId, name: contactName.trim(), notes: 'Creado automáticamente desde Odoo' },
  });
  return newContact.id;
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

    // Extract company and contact names from Odoo
    const partnerFull = order.partner_id ? order.partner_id[1] : '';
    const empresa = order.x_studio_empresa_relacionada ? order.x_studio_empresa_relacionada[1] : null;
    let contactName: string | null = null;
    if (partnerFull && partnerFull.includes(',')) {
      contactName = partnerFull.split(',').slice(1).join(',').trim();
    }
    const companyName = empresa || (partnerFull ? partnerFull.split(',')[0].trim() : null);

    // Auto-create client and contact in Perry if they don't exist
    let clientId: string | null = null;
    let contactId: string | null = null;
    if (companyName) {
      clientId = await ensureClient(companyName);
      if (clientId && contactName) {
        contactId = await ensureContact(clientId, contactName);
      }
    }

    return NextResponse.json({
      found: true,
      folio: order.name,
      purchaseOrder: hasPO ? poValue : null,
      project: order.x_studio_proyecto || null,
      client: partnerFull,
      companyName,
      contactName,
      clientId,
      contactId,
      state: order.state,
      stateLabel: ({ draft: 'Borrador', sent: 'Enviada', sale: 'Confirmada', cancel: 'Cancelada' } as Record<string, string>)[order.state] || order.state,
    });
  } catch (error: any) {
    console.error('Odoo lookup error:', error);
    if (error.message?.includes('auth') || error.message?.includes('ODOO_CONFIG')) resetUid();
    return NextResponse.json({ error: 'Error al consultar Odoo', detail: error.message }, { status: 500 });
  }
}
