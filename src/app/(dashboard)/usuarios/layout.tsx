import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { canManageResources } from '@/lib/permissions';

export default async function UsuariosLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user as any;

  const hasAccess = user?.role && (
    canManageResources(user.role) ||
    user.accessSafetyDedicado ||
    user.accessVehicles ||
    user.accessDrivers ||
    user.accessElevationEquip
  );

  if (!hasAccess) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
