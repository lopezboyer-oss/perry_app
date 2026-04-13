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
    const { name, clientId, position, email, phone, notes } = data;

    const updatedContact = await prisma.contact.update({
      where: { id },
      data: { name, clientId, position, email, phone, notes },
      include: { client: { select: { name: true } } }
    });

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Error updating contact' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role === 'INGENIERO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    const contactDeps = await prisma.contact.findUnique({
      where: { id },
      select: {
        _count: {
          select: { activities: true, opportunities: true }
        }
      }
    });

    if (!contactDeps) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (contactDeps._count.activities > 0 || contactDeps._count.opportunities > 0) {
      return NextResponse.json(
        { 
          error: 'No puedes borrar este contacto porque ya está referenciado en actividades u oportunidades. Bórralo primero de ahí o agrégale un aviso en sus Notas.' 
        }, 
        { status: 400 }
      );
    }

    // Safe to delete if it's completely empty.
    await prisma.contact.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Error deleting contact' }, { status: 500 });
  }
}
