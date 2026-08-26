import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canManageApiKeys } from '@/lib/permissions';
import crypto from 'crypto';

// GET all API Keys (Restricted STRICTLY to IVAN LOPEZ)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canManageApiKeys(email)) {
      return NextResponse.json({ error: 'Acceso restringido a gestión de API Keys (Solo IVAN LOPEZ)' }, { status: 403 });
    }

    const keys = await prisma.perryApiKey.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ keys });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error de servidor' }, { status: 500 });
  }
}

// POST generate new API Key (Restricted to IVAN LOPEZ)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canManageApiKeys(email)) {
      return NextResponse.json({ error: 'Acceso restringido (Solo IVAN LOPEZ)' }, { status: 403 });
    }

    const body = await req.json();
    const name = body.name ? body.name.trim() : 'Software Antigravity - Integración Interna';

    const randomBytes = crypto.randomBytes(24).toString('hex');
    const apiKeyStr = `perry_sec_${randomBytes}`;

    const newKey = await prisma.perryApiKey.create({
      data: {
        name,
        key: apiKeyStr,
        createdBy: email,
        isActive: true,
      },
    });

    return NextResponse.json(newKey);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error generando API Key' }, { status: 500 });
  }
}

// PATCH toggle isActive status (Revoke / Re-activate)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessTreasuryDashboard(email)) {
      return NextResponse.json({ error: 'Acceso restringido (Solo IVAN LOPEZ)' }, { status: 403 });
    }

    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de API Key requerido' }, { status: 400 });
    }

    const updated = await prisma.perryApiKey.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error actualizando API Key' }, { status: 500 });
  }
}

// DELETE an API Key
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessTreasuryDashboard(email)) {
      return NextResponse.json({ error: 'Acceso restringido (Solo IVAN LOPEZ)' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.perryApiKey.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error eliminando API Key' }, { status: 500 });
  }
}
