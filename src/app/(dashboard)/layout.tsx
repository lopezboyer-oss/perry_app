import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SessionProvider } from 'next-auth/react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen bg-slate-50">
        <Sidebar user={session.user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={session.user} />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
