import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessTreasuryDashboard } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    const userRole = (session.user as any)?.role || '';
    const isDirector = canAccessTreasuryDashboard(email) || userRole === 'ADMIN';

    let allowedCompanyNames: string[] = [];

    if (!isDirector) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          accessNominas: true,
          baseCompany: { select: { id: true, name: true, shortName: true } },
          companies: { select: { company: { select: { id: true, name: true, shortName: true } } } },
        },
      });

      if (!dbUser?.accessNominas) {
        return NextResponse.json(
          { error: 'Acceso restringido: No cuentas con permisos para consultar nóminas.' },
          { status: 403 }
        );
      }

      // Collect names of all companies assigned to the user
      const companiesSet = new Set<string>();
      if (dbUser.baseCompany?.name) companiesSet.add(dbUser.baseCompany.name);
      dbUser.companies?.forEach((c) => {
        if (c.company?.name) companiesSet.add(c.company.name);
      });

      allowedCompanyNames = Array.from(companiesSet);
      if (allowedCompanyNames.length === 0) {
        return NextResponse.json(
          { error: 'Tu usuario tiene permiso de nóminas pero no tiene una empresa asignada en el sistema.' },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const companyFilter = searchParams.get('company');

    const whereClause: any = {};

    if (isDirector) {
      if (companyFilter && companyFilter !== 'TODAS') {
        whereClause.companyName = companyFilter;
      }
    } else {
      // User is an Assistant: strictly scoped to assigned companies
      if (companyFilter && allowedCompanyNames.includes(companyFilter)) {
        whereClause.companyName = companyFilter;
      } else {
        whereClause.companyName = { in: allowedCompanyNames };
      }
    }

    const payLogs = await prisma.payrollLog.findMany({
      where: whereClause,
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return NextResponse.json({
      logs: payLogs,
      isDirector,
      allowedCompanies: isDirector ? ['TODAS'] : allowedCompanyNames,
      userAssignedCompanies: allowedCompanyNames,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}
