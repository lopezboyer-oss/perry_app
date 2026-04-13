import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contacts = await prisma.contact.findMany({
      include: {
        client: { select: { name: true } },
        _count: {
          select: { activities: true, opportunities: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Error fetching contacts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role === 'INGENIERO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await req.json();
    const { name, clientId, position, email, phone, notes } = data;

    if (!name || !clientId) {
      return NextResponse.json({ error: 'Name and Client are required' }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        clientId,
        position,
        email,
        phone,
        notes,
      },
      include: {
        client: { select: { name: true } }
      }
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Error creating contact' }, { status: 500 });
  }
}
