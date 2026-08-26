import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessTreasuryDashboard } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessTreasuryDashboard(email)) {
      return NextResponse.json({ error: 'Acceso restringido a nóminas' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const companyFilter = searchParams.get('company');

    const whereClause: any = {};
    if (companyFilter && companyFilter !== 'TODAS') {
      whereClause.companyName = companyFilter;
    }

    const payLogs = await prisma.payrollLog.findMany({
      where: whereClause,
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return NextResponse.json({ logs: payLogs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}
