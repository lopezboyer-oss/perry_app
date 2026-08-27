import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PlanDiarioClient } from './PlanDiarioClient';

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

  return <PlanDiarioClient user={session.user} />;
}
