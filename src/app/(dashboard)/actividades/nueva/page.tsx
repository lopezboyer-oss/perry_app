import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ActivityForm } from '@/components/forms/ActivityForm';
import { getCompanyFilterFromCookies } from '@/lib/company-context';
import { getLocalToday } from '@/lib/utils';

export default async function NuevaActividadPage({
  searchParams,
}: {
  searchParams: { folio?: string; continuar?: string };
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

  // ── "Continuar" mode: pre-fill from existing activity ──
  let continuarData: any = undefined;
  let heading = 'Nueva Actividad';

  if (searchParams.continuar) {
    const source = await prisma.activity.findUnique({
      where: { id: searchParams.continuar },
      select: {
        userId: true, type: true, title: true,
        clientId: true, contactId: true,
        workOrderFolio: true, purchaseOrder: true,
        projectArea: true, location: true,
        consortiumCompany: true, companyId: true,
      },
    });

    if (source) {
      continuarData = {
        date: getLocalToday(),
        userId: source.userId,
        type: source.type,
        status: 'PENDIENTE',
        title: source.title,
        clientId: source.clientId || '',
        contactId: source.contactId || '',
        workOrderFolio: source.workOrderFolio || '',
        purchaseOrder: source.purchaseOrder || '',
        projectArea: source.projectArea || '',
        location: source.location || '',
        consortiumCompany: source.consortiumCompany || '',
        companyId: source.companyId || '',
        continuedFromId: searchParams.continuar,
        // These stay blank for the new activity
        result: '',
        nextStep: '',
        commitmentDate: '',
        startTime: '',
        endTime: '',
        durationMinutes: '',
        notes: '',
      };
      heading = 'Continuar Actividad';
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-0 animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">{heading}</h1>
      {continuarData && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm mb-4">
          📋 Datos copiados de la actividad anterior. Completa horario, resultado y seguimiento.
        </div>
      )}
      <ActivityForm
        users={users}
        clients={clients}
        currentUserId={session.user.id}
        userRole={session.user.role}
        prefillFolio={prefillFolio}
        initialData={continuarData}
      />
    </div>
  );
}

