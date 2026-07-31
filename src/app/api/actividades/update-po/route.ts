import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { workOrderFolio, purchaseOrder } = await req.json();

    if (!workOrderFolio || typeof workOrderFolio !== 'string') {
      return NextResponse.json({ error: 'workOrderFolio es requerido' }, { status: 400 });
    }

    const folioUpper = workOrderFolio.trim().toUpperCase();
    const poTrimmed = typeof purchaseOrder === 'string' ? purchaseOrder.trim().toUpperCase() : null;

    // Update all activities matching the workOrderFolio (case insensitive search via raw or contains/equals)
    const result = await prisma.activity.updateMany({
      where: {
        workOrderFolio: {
          equals: folioUpper,
          mode: 'insensitive',
        },
      },
      data: {
        purchaseOrder: poTrimmed,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      workOrderFolio: folioUpper,
      purchaseOrder: poTrimmed,
    });
  } catch (error: any) {
    console.error('Error updating PO by workOrderFolio:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la PO del folio Odoo' },
      { status: 500 }
    );
  }
}
