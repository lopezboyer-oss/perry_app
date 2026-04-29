import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CobranzaClient } from './CobranzaClient';

export const metadata = {
  title: 'Recibos | Perry App',
  description: 'Dashboard de seguimiento de facturas y pendientes de recibo',
};

export default async function CobranzaPage() {
  const session = await auth();
  if (!session) redirect('/login');

  // All roles can now access Recibos (engineers see only their own activities' invoices)
  const role = session.user.role;

  return <CobranzaClient />;
}
