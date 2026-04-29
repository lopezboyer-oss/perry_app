import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserCompanies } from '@/lib/company-context';

// GET /api/company/mine — get current user's companies
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const companies = await getUserCompanies(session.user.id);
  return NextResponse.json({ companies });
}
