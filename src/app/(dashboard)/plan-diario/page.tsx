import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PlanDiarioClient } from './PlanDiarioClient';
import { getCompanyFilterFromCookies } from '@/lib/company-context';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Plan Diario (Lunes a Viernes) | Perry App',
  description: 'Gestión regular de actividades de lunes a viernes, trazabilidad de soportes cruzados inter-empresa y descansos.',
};

export default async function PlanDiarioPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect('/login');
  }

  const role = session.user.role;
  const userId = session.user.id;

  // Resolve active company from Perry's global header CompanySwitcher cookie
  const companyFilter = await getCompanyFilterFromCookies(role, userId);
  const activeCompanyId = (companyFilter as any).companyId || null;

  let activeCompanyName = 'TODAS';
  if (activeCompanyId) {
    const co = await prisma.company.findUnique({
      where: { id: activeCompanyId },
      select: { name: true, shortName: true },
    });
    if (co) {
      activeCompanyName = co.name;
    }
  }

  return (
    <PlanDiarioClient
      user={session.user}
      initialActiveCompany={activeCompanyName}
    />
  );
}
