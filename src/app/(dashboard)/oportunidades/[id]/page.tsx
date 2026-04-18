import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { OpportunityDetail } from '@/components/forms/OpportunityDetail';
import { OpportunityForm } from '@/components/forms/OpportunityForm';
import { toInputDate } from '@/lib/utils';

export default async function OportunidadDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { editar?: string };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      activities: {
        include: {
          user: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!opportunity) notFound();

  if (session.user.role === 'INGENIERO' && opportunity.userId !== session.user.id) {
    redirect('/oportunidades');
  }

  const isEditing = searchParams.editar === 'true';

  if (isEditing) {
    const [users, clients] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.client.findMany({
        select: { id: true, name: true, contacts: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    return (
      <div className="max-w-4xl mx-auto pb-20 md:pb-0 animate-fade-in">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Editar Oportunidad</h1>
        <OpportunityForm
          users={users}
          clients={clients}
          currentUserId={session.user.id}
          nextFolio={opportunity.folio}
          initialData={{
            ...opportunity,
            requestDate: toInputDate(opportunity.requestDate),
            scheduledVisitDate: toInputDate(opportunity.scheduledVisitDate),
            actualVisitDate: toInputDate(opportunity.actualVisitDate),
            infoCompleteDate: toInputDate(opportunity.infoCompleteDate),
            quotationDueDate: toInputDate(opportunity.quotationDueDate),
            quotationSentDate: toInputDate(opportunity.quotationSentDate),
          }}
        />
      </div>
    );
  }

  const serialized = {
    ...opportunity,
    requestDate: opportunity.requestDate?.toISOString() || null,
    scheduledVisitDate: opportunity.scheduledVisitDate?.toISOString() || null,
    actualVisitDate: opportunity.actualVisitDate?.toISOString() || null,
    infoCompleteDate: opportunity.infoCompleteDate?.toISOString() || null,
    quotationDueDate: opportunity.quotationDueDate?.toISOString() || null,
    quotationSentDate: opportunity.quotationSentDate?.toISOString() || null,
    createdAt: opportunity.createdAt.toISOString(),
    updatedAt: opportunity.updatedAt.toISOString(),
    activities: opportunity.activities.map((a) => ({
      ...a,
      date: a.date.toISOString(),
      commitmentDate: a.commitmentDate?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
  };

  return (
    <OpportunityDetail
      opportunity={serialized}
      userRole={session.user.role}
      currentUserId={session.user.id}
    />
  );
}
