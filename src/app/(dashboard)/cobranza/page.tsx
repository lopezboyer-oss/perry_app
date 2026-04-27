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

  const role = session.user.role;
  if (role !== 'ADMIN' && role !== 'SUPERVISOR' && role !== 'SUPERVISOR_SAFETY_LP') {
    redirect('/dashboard');
  }

  return <CobranzaClient />;
}
