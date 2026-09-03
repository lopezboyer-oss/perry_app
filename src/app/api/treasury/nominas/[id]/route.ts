import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessTreasuryDashboard } from '@/lib/permissions';

// DELETE: Eliminar permanentemente un registro de nómina (falso positivo, error o duplicado)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessTreasuryDashboard(email)) {
      return NextResponse.json({ error: 'Acceso restringido a nóminas' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID de nómina requerido' }, { status: 400 });
    }

    const existing = await prisma.payrollLog.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Registro de nómina no encontrado' }, { status: 404 });
    }

    await prisma.payrollLog.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Registro de nómina eliminado correctamente',
      deletedId: id,
    });
  } catch (error: any) {
    console.error('[PAYROLL DELETE ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error eliminando nómina' }, { status: 500 });
  }
}

// PATCH: Actualizar datos de la nómina (cantidades validadas, desglose, periodo u observaciones)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessTreasuryDashboard(email)) {
      return NextResponse.json({ error: 'Acceso restringido a nóminas' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID de nómina requerido' }, { status: 400 });
    }

    const body = await req.json();
    const {
      companyName,
      periodNumber,
      totalAmount,
      employeeCount,
      bankBreakdown,
      observations,
      status,
    } = body;

    const existing = await prisma.payrollLog.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Registro de nómina no encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (periodNumber !== undefined) updateData.periodNumber = periodNumber;
    if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount) || 0;
    if (employeeCount !== undefined) updateData.employeeCount = parseInt(employeeCount, 10) || 0;
    if (bankBreakdown !== undefined) {
      updateData.bankBreakdown = typeof bankBreakdown === 'string' ? bankBreakdown : JSON.stringify(bankBreakdown);
    }
    if (observations !== undefined) updateData.observations = observations;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.payrollLog.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Ficha de nómina actualizada con éxito',
      log: updated,
    });
  } catch (error: any) {
    console.error('[PAYROLL PATCH ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error actualizando nómina' }, { status: 500 });
  }
}
