import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET: List receipt confirmations (filtered by company)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const companyId = req.nextUrl.searchParams.get('companyId');

    const where: any = {};
    if (companyId && companyId !== 'ALL') {
      where.companyId = companyId;
    }

    const receipts = await prisma.invoiceReceipt.findMany({
      where,
      include: { confirmedBy: { select: { name: true } } },
      orderBy: { confirmedAt: 'desc' },
    });

    return NextResponse.json({ receipts });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: Mark an invoice as receipt confirmed
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'ADMINISTRACION') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { invoiceNumber, folio, po, notes, engineerName, companyId } = await req.json();
    if (!invoiceNumber) return NextResponse.json({ error: 'invoiceNumber requerido' }, { status: 400 });

    // Upsert — allows re-confirming
    const receipt = await prisma.invoiceReceipt.upsert({
      where: { invoiceNumber },
      create: {
        invoiceNumber,
        folio: folio || null,
        po: po || null,
        engineerName: engineerName || null,
        companyId: companyId || null,
        confirmedById: session.user.id,
        notes: notes || null,
      },
      update: {
        confirmedById: session.user.id,
        confirmedAt: new Date(),
        engineerName: engineerName || undefined,
        companyId: companyId || undefined,
        notes: notes || null,
      },
      include: { confirmedBy: { select: { name: true } } },
    });

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    console.error('Error creating receipt:', error);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}

// DELETE: Undo a receipt confirmation
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'ADMINISTRACION') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { invoiceNumber } = await req.json();
    if (!invoiceNumber) return NextResponse.json({ error: 'invoiceNumber requerido' }, { status: 400 });

    await prisma.invoiceReceipt.deleteMany({ where: { invoiceNumber } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
