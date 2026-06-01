import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReportesEspecialesClient } from './ReportesEspecialesClient';

export const dynamic = 'force-dynamic';

export default async function ReportesEspecialesPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const { role, email } = session.user as any;
  const hasAccess = ['ADMIN', 'ADMINISTRACION'].includes(role) || email === 'carlos.lopez@gsingenieria.mx';

  if (!hasAccess) {
    redirect('/dashboard');
  }

  // Obtener todas las empresas para asociar sus colores oficiales
  const companies = await prisma.company.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  return (
    <div className="max-w-7xl mx-auto pb-20 md:pb-0 animate-fade-in">
      <ReportesEspecialesClient
        companies={companies.map(c => ({
          id: c.id,
          name: c.name,
          shortName: c.shortName || c.name,
          color: c.color || '#4F46E5',
        }))}
        currentUserEmail={email}
      />
    </div>
  );
}
