import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ImportClient } from './ImportClient';

export default async function ImportarReportePage() {
  const session = await auth();
  if (!session) redirect('/login');

  const [users, clients] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.client.findMany({
      select: { id: true, name: true, contacts: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto pb-20 md:pb-0 animate-fade-in">
      <ImportClient
        users={users}
        clients={clients}
        currentUserId={session.user.id}
      />
    </div>
  );
}
