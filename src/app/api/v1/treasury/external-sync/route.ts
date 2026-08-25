import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCompanyName } from '@/lib/whatsapp/financial-parser';

// CORS support for external Antigravity tools
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Perry-Api-Key, Authorization',
    },
  });
}

// GET /api/v1/treasury/external-sync
// External API Endpoint for consuming Perry Intelligence Financial Data in external software
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract API Key from Header or Query string
    const authHeader = req.headers.get('authorization');
    const xApiKey = req.headers.get('x-perry-api-key');
    const queryKey = searchParams.get('apiKey');

    let providedKey = xApiKey || queryKey || '';
    if (!providedKey && authHeader && authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7).trim();
    }

    if (!providedKey) {
      return NextResponse.json(
        {
          error: 'Acceso denegado. Se requiere una API Key válida en la cabecera X-Perry-Api-Key o parámetro ?apiKey=',
          documentation: 'Contactar a Ivan López para solicitar credenciales de integración.',
        },
        {
          status: 401,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Validate API Key in Supabase database
    const apiKeyRecord = await prisma.perryApiKey.findUnique({
      where: { key: providedKey.trim() },
    });

    if (!apiKeyRecord || !apiKeyRecord.isActive) {
      return NextResponse.json(
        { error: 'API Key inválida, inactiva o revocada.' },
        {
          status: 401,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Async update usage count & last used timestamp
    prisma.perryApiKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    }).catch(err => console.error('[PERRY API KEY METRICS ERROR]', err));

    const companyFilter = searchParams.get('company');
    const limitParam = parseInt(searchParams.get('limit') || '200');

    const whereClause: any = {};
    if (companyFilter) {
      whereClause.companyName = { contains: companyFilter, mode: 'insensitive' };
    }

    const balanceLogs = await prisma.financialBalanceLog.findMany({
      where: whereClause,
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(limitParam, 500),
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
      cb.accounts.push({
        bankName: acc.bankName,
        accountType: acc.accountType,
        currency: acc.currency,
        initialBalance: acc.initialBalance,
        income: acc.income,
        expenses: acc.expenses,
        finalBalance: acc.finalBalance,
        isCalculatedMatch: acc.isCalculatedMatch,
        calculatedDiff: acc.calculatedDiff,
        reportDate: acc.reportDate,
        updatedAt: acc.updatedAt,
      });

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

    return NextResponse.json(
      {
        success: true,
        provider: 'Perry Intelligence C-Suite API v1',
        keyName: apiKeyRecord.name,
        timestamp: new Date().toISOString(),
        summary: {
          totalLiquidityMXN: totalMXN,
          totalLiquidityUSD: totalUSD,
          totalRevolvingCreditMXN,
          totalInvestmentsMXN,
          companiesCount: Object.keys(companyBreakdown).length,
        },
        companies: companyBreakdown,
        records: activeBalances,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('[EXTERNAL TREASURY API ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Error de servidor' },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
