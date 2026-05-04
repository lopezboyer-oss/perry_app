import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { canManageResources } from '@/lib/permissions';

export default async function UsuariosLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.role || !canManageResources(session.user.role)) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
