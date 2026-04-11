import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OpportunityForm } from '@/components/forms/OpportunityForm';

export default async function NuevaOportunidadPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const [users, clients] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.client.findMany({
      select: { id: true, name: true, contacts: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Generate next folio
  const lastOpp = await prisma.opportunity.findFirst({ orderBy: { folio: 'desc' } });
  const nextNum = lastOpp ? parseInt(lastOpp.folio.split('-').pop() || '0') + 1 : 1;
  const nextFolio = `OPP-${new Date().getFullYear()}-${nextNum.toString().padStart(3, '0')}`;

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-0 animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">Nueva Oportunidad</h1>
      <OpportunityForm
        users={users}
        clients={clients}
        currentUserId={session.user.id}
        nextFolio={nextFolio}
      />
    </div>
  );
}
