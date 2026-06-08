import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TrabajosAbiertosClient } from './TrabajosAbiertosClient';

export const metadata = {
  title: 'Trabajos Abiertos | Perry App',
  description: 'Reporte de folios Odoo con cotización y PO pendientes de facturación',
};

export default async function TrabajosAbiertosPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  const allowedRoles = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'INGENIERO'];
  
  if (!allowedRoles.includes(role)) {
    redirect('/dashboard');
  }

  return <TrabajosAbiertosClient userRole={role} />;
}
