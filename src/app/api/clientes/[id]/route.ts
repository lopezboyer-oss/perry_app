import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role === 'INGENIERO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const data = await req.json();
    const { name, code, status, notes } = data;

    const updatedClient = await prisma.client.update({
      where: { id },
      data: { name, code, status, notes },
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Error updating client' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role === 'INGENIERO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Check Option B Rule: If has activities or opportunities -> Block deletion.
    const clientDeps = await prisma.client.findUnique({
      where: { id },
      select: {
        _count: {
          select: { activities: true, opportunities: true }
        }
      }
    });

    if (!clientDeps) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (clientDeps._count.activities > 0 || clientDeps._count.opportunities > 0) {
      return NextResponse.json(
        { 
          error: 'No puedes borrar este cliente porque ya tiene historial de actividades u oportunidades. Deberás "Desactivarlo" en su lugar para mantener la integridad de la base de datos.' 
        }, 
        { status: 400 }
      );
    }

    // Safe to delete if it's completely empty.
    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Error deleting client' }, { status: 500 });
  }
}
