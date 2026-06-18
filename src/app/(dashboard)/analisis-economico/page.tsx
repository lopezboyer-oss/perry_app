import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AnalisisEconomicoClient } from './AnalisisEconomicoClient';
import { canViewEconomicAnalysis } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function AnalisisEconomicoPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const { role, email } = session.user as any;

  if (!canViewEconomicAnalysis(email, role)) {
    redirect('/dashboard');
  }

  const companies = await prisma.company.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  return (
    <div className="max-w-7xl mx-auto pb-20 md:pb-0 animate-fade-in">
      <AnalisisEconomicoClient
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
