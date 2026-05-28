import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ role: '' }, { status: 401 });
  }
  return NextResponse.json({
    role: session.user.role,
    accessSafetyDedicado: (session.user as any).accessSafetyDedicado || false,
    accessVehicles: (session.user as any).accessVehicles || false,
    accessDrivers: (session.user as any).accessDrivers || false,
    accessElevationEquip: (session.user as any).accessElevationEquip || false,
  });
}
