import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function DirectorioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Ingenieros cannot access the Directory Manager
  if (session?.user?.role === 'INGENIERO') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
