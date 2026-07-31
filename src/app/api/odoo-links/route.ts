import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function generateToken(): string {
  return crypto.randomBytes(12).toString('hex');
}

// GET: Fetch link status by workOrderFolio
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workOrderFolio = searchParams.get('workOrderFolio');

    if (!workOrderFolio) {
      return NextResponse.json({ error: 'Folio Odoo requerido' }, { status: 400 });
    }

    const link = await prisma.odooOrderAccessLink.findUnique({
      where: { workOrderFolio },
    });

    return NextResponse.json({
      link: link || {
        workOrderFolio,
        techToken1: null,
        techToken2: null,
        clientToken: null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching Odoo order link:', error);
    return NextResponse.json({ error: 'Error al consultar enlaces de la Orden Odoo' }, { status: 500 });
  }
}

// POST: Generate or Revoke token for workOrderFolio
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { workOrderFolio, target, action } = await req.json();

    if (!workOrderFolio || !['tech1', 'tech2', 'client'].includes(target)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    let fieldToUpdate = '';
    if (target === 'tech1') fieldToUpdate = 'techToken1';
    if (target === 'tech2') fieldToUpdate = 'techToken2';
    if (target === 'client') fieldToUpdate = 'clientToken';

    const newToken = action === 'generate' ? generateToken() : null;

    const linkRecord = await prisma.odooOrderAccessLink.upsert({
      where: { workOrderFolio },
      create: {
        workOrderFolio,
        [fieldToUpdate]: newToken,
      },
      update: {
        [fieldToUpdate]: newToken,
      },
    });

    return NextResponse.json({
      success: true,
      target,
      token: newToken,
      link: linkRecord,
    });
  } catch (error: any) {
    console.error('Error updating Odoo order link:', error);
    return NextResponse.json({ error: 'Error al gestionar enlace de Orden Odoo' }, { status: 500 });
  }
}
