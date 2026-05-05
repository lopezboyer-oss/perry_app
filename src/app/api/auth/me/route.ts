import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ role: '' }, { status: 401 });
  }
  return NextResponse.json({ role: session.user.role });
}
