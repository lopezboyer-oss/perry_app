import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ActivityForm } from '@/components/forms/ActivityForm';
import { getCompanyFilterFromCookies } from '@/lib/company-context';

export default async function NuevaActividadPage({
  searchParams,
}: {
  searchParams: { folio?: string };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  // Company-scoped user filter
  const companyFilter = await getCompanyFilterFromCookies(session.user.role, session.user.id);
  const activeCompanyId = (companyFilter as any).companyId || null;
  const usersWhere: any = { isActive: true };
  if (activeCompanyId) {
    usersWhere.companies = { some: { companyId: activeCompanyId } };
  }

  const [users, clients] = await Promise.all([
    prisma.user.findMany({ where: usersWhere, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.client.findMany({
      select: { id: true, name: true, contacts: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  const prefillFolio = searchParams.folio?.trim().toUpperCase() || '';

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-0 animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">Nueva Actividad</h1>
      <ActivityForm
        users={users}
        clients={clients}
        currentUserId={session.user.id}
        userRole={session.user.role}
        prefillFolio={prefillFolio}
      />
    </div>
  );
}
