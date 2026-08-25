import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessTreasuryDashboard } from '@/lib/permissions';
import { normalizeCompanyName } from '@/lib/whatsapp/financial-parser';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessTreasuryDashboard(email)) {
      return NextResponse.json({ error: 'Acceso restringido al Dashboard de Tesorería Directiva (Solo IVAN LOPEZ)' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const companyFilter = searchParams.get('company');

    const whereClause: any = {};
    if (companyFilter) {
      whereClause.companyName = companyFilter;
    }

    // Fetch all balance logs
    const balanceLogs = await prisma.financialBalanceLog.findMany({
      where: whereClause,
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    // Compute consolidated totals for latest records by company and bank/account
    const latestAccountMap = new Map<string, typeof balanceLogs[0]>();
    balanceLogs.forEach((log) => {
      const normCompany = normalizeCompanyName(log.companyName);
      const key = `${normCompany}_${log.bankName}_${log.accountType}_${log.currency}`;
      if (!latestAccountMap.has(key)) {
        latestAccountMap.set(key, { ...log, companyName: normCompany });
      }
    });

    const activeBalances = Array.from(latestAccountMap.values());

    let totalMXN = 0;
    let totalUSD = 0;
    let totalRevolvingCreditMXN = 0;
    let totalInvestmentsMXN = 0;

    const companyBreakdown: Record<string, {
      mxn: number;
      usd: number;
      revolvingCredit: number;
      investments: number;
      accounts: any[];
    }> = {};

    activeBalances.forEach((acc) => {
      if (!companyBreakdown[acc.companyName]) {
        companyBreakdown[acc.companyName] = {
          mxn: 0,
          usd: 0,
          revolvingCredit: 0,
          investments: 0,
          accounts: [],
        };
      }

      const cb = companyBreakdown[acc.companyName];
      cb.accounts.push(acc);

      if (acc.accountType === 'CREDITO_REVOLVENTE') {
        cb.revolvingCredit += acc.finalBalance;
        if (acc.currency === 'MXN') totalRevolvingCreditMXN += acc.finalBalance;
      } else if (acc.accountType === 'INVERSION') {
        cb.investments += acc.finalBalance;
        if (acc.currency === 'MXN') totalInvestmentsMXN += acc.finalBalance;
      } else {
        if (acc.currency === 'USD') {
          cb.usd += acc.finalBalance;
          totalUSD += acc.finalBalance;
        } else {
          cb.mxn += acc.finalBalance;
          totalMXN += acc.finalBalance;
        }
      }
    });

    return NextResponse.json({
      accessGrantedTo: email,
      summary: {
        totalLiquidityMXN: totalMXN,
        totalLiquidityUSD: totalUSD,
        totalRevolvingCreditMXN,
        totalInvestmentsMXN,
        companiesCount: Object.keys(companyBreakdown).length,
      },
      companyBreakdown,
      logs: balanceLogs,
    });
  } catch (error: any) {
    console.error('[TREASURY API ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}
