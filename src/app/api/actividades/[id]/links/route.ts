import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function generateToken(): string {
  return crypto.randomBytes(12).toString('hex'); // 24-character hex string
}

// GET: Returns current link status for supervisor
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        techToken1: true,
        techToken2: true,
        clientToken: true,
        clientAcknowledged: true,
        clientAcknowledgedAt: true,
        clientAcknowledgedBy: true,
        equipmentStatus: true,
        suggestedAction: true,
      },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch (error: any) {
    console.error('Error fetching activity links:', error);
    return NextResponse.json({ error: 'Error al consultar enlaces' }, { status: 500 });
  }
}

// POST: Generate or Revoke a link for tech1, tech2, or client
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { target, action } = await req.json(); // target: 'tech1' | 'tech2' | 'client', action: 'generate' | 'revoke'

    if (!['tech1', 'tech2', 'client'].includes(target)) {
      return NextResponse.json({ error: 'Target inválido' }, { status: 400 });
    }

    let fieldToUpdate = '';
    if (target === 'tech1') fieldToUpdate = 'techToken1';
    if (target === 'tech2') fieldToUpdate = 'techToken2';
    if (target === 'client') fieldToUpdate = 'clientToken';

    const newToken = action === 'generate' ? generateToken() : null;

    const updated = await prisma.activity.update({
      where: { id: params.id },
      data: {
        [fieldToUpdate]: newToken,
      },
      select: {
        id: true,
        techToken1: true,
        techToken2: true,
        clientToken: true,
        clientAcknowledged: true,
        equipmentStatus: true,
      },
    });

    return NextResponse.json({
      success: true,
      target,
      token: newToken,
      activity: updated,
    });
  } catch (error: any) {
    console.error('Error managing activity link:', error);
    return NextResponse.json({ error: 'Error al gestionar enlace' }, { status: 500 });
  }
}
