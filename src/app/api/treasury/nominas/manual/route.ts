import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessTreasuryDashboard, canAuthorizePayroll, resolveDirectorSignerName } from '@/lib/permissions';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
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
          baseCompany: { select: { id: true, name: true } },
          companies: { select: { company: { select: { id: true, name: true } } } },
        },
      });

      if (!dbUser?.accessNominas) {
        return NextResponse.json(
          { error: 'No cuentas con permisos para registrar nóminas.' },
          { status: 403 }
        );
      }

      const companiesSet = new Set<string>();
      if (dbUser.baseCompany?.name) companiesSet.add(dbUser.baseCompany.name);
      dbUser.companies?.forEach((c) => {
        if (c.company?.name) companiesSet.add(c.company.name);
      });
      allowedCompanyNames = Array.from(companiesSet);
    }

    const body = await req.json();
    const {
      companyName,
      periodNumber,
      totalAmount,
      employeeCount,
      bankBreakdown,
      observations,
      fileData,
      signImmediately,
    } = body;

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ error: 'La empresa es requerida' }, { status: 400 });
    }

    const trimmedCompany = companyName.trim();

    // Verify company scope for non-directors
    if (!isDirector && allowedCompanyNames.length > 0) {
      const isAllowed = allowedCompanyNames.some(
        (c) => c.toLowerCase().trim() === trimmedCompany.toLowerCase()
      );
      if (!isAllowed) {
        return NextResponse.json(
          { error: `No tienes permiso para cargar nóminas de la empresa ${trimmedCompany}.` },
          { status: 403 }
        );
      }
    }

    const parsedTotal = parseFloat(String(totalAmount).replace(/,/g, ''));
    if (isNaN(parsedTotal) || parsedTotal < 0) {
      return NextResponse.json({ error: 'El monto total debe ser un número válido' }, { status: 400 });
    }

    const tokenHash = `pay_token_${crypto.randomBytes(16).toString('hex')}`;

    // Determinar si se autoriza y firma inmediatamente con la sesión directiva activa
    const canSignNow = isDirector || canAuthorizePayroll(email, userRole);
    const shouldAuthorizeNow = Boolean(signImmediately && canSignNow);
    const signerName = shouldAuthorizeNow ? resolveDirectorSignerName(email, session.user.name || '') : null;
    const signedAt = shouldAuthorizeNow ? new Date() : null;
    const status = shouldAuthorizeNow ? 'APROBADA_TOKENIZADA' : 'PENDIENTE_FIRMA';
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'IP_DIRECTA';

    // Create payroll record
    const newPayroll = await prisma.payrollLog.create({
      data: {
        companyName: trimmedCompany,
        periodNumber: (periodNumber || 'Raya Semanal').trim(),
        totalAmount: parsedTotal,
        employeeCount: Number(employeeCount) || 0,
        bankBreakdown: bankBreakdown
          ? typeof bankBreakdown === 'string'
            ? bankBreakdown
            : JSON.stringify(bankBreakdown)
          : null,
        observations: (observations || '').trim() || `Cargada manualmente por ${session.user.name || session.user.email}`,
        status,
        signedBy: signerName,
        signedAt,
        ipAddress: shouldAuthorizeNow ? clientIp : null,
        imageUrl: fileData || null,
        tokenHash,
        reportDate: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      payroll: newPayroll,
      signedImmediately: shouldAuthorizeNow,
      message: shouldAuthorizeNow
        ? `Nómina registrada, autorizada y firmada digitalmente por ${signerName}.`
        : 'Nómina registrada con éxito y token de firma generado.',
    });
  } catch (error: any) {
    console.error('[MANUAL PAYROLL ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error registrando nómina' }, { status: 500 });
  }
}
