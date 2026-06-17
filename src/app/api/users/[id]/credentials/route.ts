import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getDeterministicPassword } from '@/lib/utils';

/**
 * GET /api/users/[id]/credentials
 * 
 * Retorna las credenciales de acceso de un usuario (email + contraseña en texto plano).
 * Solo accesible por ADMIN y ADMINISTRACION.
 * 
 * Si el usuario no tiene `passwordPlaintext` almacenado (usuario legacy),
 * se intenta con la contraseña determinista como fallback.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'ADMINISTRACION'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;

    // Scope check for ADMINISTRACION users
    if (session.user.role === 'ADMINISTRACION') {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { companies: true },
      });
      const allowedCompanyIds = currentUser?.companies.map(c => c.companyId) || [];

      const targetUser = await prisma.user.findUnique({
        where: { id },
        include: { companies: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const hasCommonCompany = targetUser.companies.some(tc =>
        allowedCompanyIds.includes(tc.companyId)
      );
      if (!hasCommonCompany) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        name: true,
        email: true,
        passwordPlaintext: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use stored plaintext if available, otherwise fallback to deterministic
    const password = user.passwordPlaintext || getDeterministicPassword(user.name, user.email);

    return NextResponse.json({
      name: user.name,
      email: user.email,
      password,
      isLegacyFallback: !user.passwordPlaintext,
    });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json({ error: 'Error fetching credentials' }, { status: 500 });
  }
}
