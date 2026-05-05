import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ConsorcioClient } from './ConsorcioClient';
import { getCompanyFilterFromCookies } from '@/lib/company-context';

export const dynamic = 'force-dynamic';

export default async function ConsorcioPage() {
  const session = await auth();
  if (!session) redirect('/login');

  // Only ADMIN can access this page
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const companyFilter = await getCompanyFilterFromCookies(session.user.role, session.user.id);

  const activities = await prisma.activity.findMany({
    where: { type: 'CONSORCIO', ...companyFilter },
    include: {
      user: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  });

  return (
    <ConsorcioClient
      activities={activities.map((a) => ({
        id: a.id,
        title: a.title,
        date: a.date.toISOString(),
        status: a.status,
        durationMinutes: a.durationMinutes,
        consortiumCompany: a.consortiumCompany,
        workOrderFolio: a.workOrderFolio,
        location: a.location,
        notes: a.notes,
        userName: a.user?.name || 'POR ASIGNAR',
        clientName: a.client?.name || null,
      }))}
    />
  );
}
