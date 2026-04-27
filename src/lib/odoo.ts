// Shared Odoo JSON-RPC helpers
// Used by /api/odoo/lookup and /api/odoo/invoices

let cachedUid: number | null = null;

export interface OdooConfig {
  url: string;
  user: string;
  key: string;
}

export function getOdooConfig(): OdooConfig {
  // Try base64 encoded ODOO_CONFIG first
  const encoded = process.env.ODOO_CONFIG;
  if (encoded) {
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      throw new Error('Failed to decode ODOO_CONFIG');
    }
  }
  // Fallback to individual env vars
  const url = process.env.ODOO_URL;
  const user = process.env.ODOO_USER;
  const key = process.env.ODOO_API_KEY;
  if (url && user && key) return { url, user, key };
  throw new Error('ODOO_CONFIG or ODOO_URL/ODOO_USER/ODOO_API_KEY env vars are not set');
}

export function getOdooDb(url: string): string {
  // Use explicit env var first, fallback to hostname extraction
  if (process.env.ODOO_DB) return process.env.ODOO_DB;
  return new URL(url).hostname.split('.')[0];
}

export async function getUid(): Promise<number> {
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

export function resetUid() {
  cachedUid = null;
}

export async function odooExecute(model: string, method: string, args: any[], kwargs?: any) {
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
        args: [db, uid, config.key, model, method, ...args],
        ...(kwargs ? { kwargs } : {}),
      },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Odoo query error');
  return data.result;
}
