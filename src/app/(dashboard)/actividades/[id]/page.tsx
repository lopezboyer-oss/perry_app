import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { ActivityForm } from '@/components/forms/ActivityForm';
import { ActivityDetail } from '@/components/forms/ActivityDetail';
import { toInputDate } from '@/lib/utils';

export default async function ActividadDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { editar?: string };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      opportunity: { select: { id: true, folio: true, title: true } },
      dailyReport: { select: { id: true, reportDate: true, source: true } },
    },
  });

  if (!activity) notFound();

  // Permission check
  if (session.user.role === 'INGENIERO' && activity.userId !== session.user.id) {
    redirect('/actividades');
  }

  const isEditing = searchParams.editar === 'true';

  if (isEditing) {
    const [users, clients, opportunities] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.client.findMany({
        select: { id: true, name: true, contacts: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.opportunity.findMany({
        select: { id: true, folio: true, title: true },
        orderBy: { folio: 'desc' },
      }),
    ]);

    return (
      <div className="max-w-4xl mx-auto pb-20 md:pb-0 animate-fade-in">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Editar Actividad</h1>
        <ActivityForm
          users={users}
          clients={clients}
          opportunities={opportunities}
          currentUserId={session.user.id}
          userRole={session.user.role}
          initialData={{
            ...activity,
            date: toInputDate(activity.date),
            commitmentDate: toInputDate(activity.commitmentDate),
          }}
        />
      </div>
    );
  }

  return (
    <ActivityDetail
      activity={{
        ...activity,
        date: activity.date.toISOString(),
        commitmentDate: activity.commitmentDate?.toISOString() || null,
        createdAt: activity.createdAt.toISOString(),
        updatedAt: activity.updatedAt.toISOString(),
        dailyReport: activity.dailyReport
          ? { ...activity.dailyReport, reportDate: activity.dailyReport.reportDate.toISOString() }
          : null,
      }}
      userRole={session.user.role}
      currentUserId={session.user.id}
    />
  );
}
