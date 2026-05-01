import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { GuiaClient } from './GuiaClient';

export default async function GuiaPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <GuiaClient
      userName={session.user.name || 'Ingeniero'}
      userRole={(session.user as any).role || 'INGENIERO'}
    />
  );
}
