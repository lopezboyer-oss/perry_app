import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role === 'INGENIERO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { contacts } = await req.json();

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts data provided' }, { status: 400 });
    }

    let createdCount = 0;
    let skippedCount = 0;
    let newClientsGeneratedCount = 0;

    for (const contact of contacts) {
      if (!contact.name || !contact.companyName) continue;

      const trimmedCompany = contact.companyName.trim();
      
      // 1. Resolver el cliente al que pertenece
      let dbClient = await prisma.client.findFirst({
        where: { name: { equals: trimmedCompany, mode: 'insensitive' } }
      });

      // Opción B: Crear la empresa dinámicamente si no existe
      if (!dbClient) {
        dbClient = await prisma.client.create({
          data: {
            name: trimmedCompany,
            status: 'ACTIVO',
            notes: 'Añadido automáticamente en importación de contactos de Odoo',
          }
        });
        newClientsGeneratedCount++;
      }

      // 2. Comprobar si este contacto exacto ya existe en ese cliente
      const existingContact = await prisma.contact.findFirst({
        where: {
          name: { equals: contact.name, mode: 'insensitive' },
          clientId: dbClient.id
        }
      });

      if (!existingContact) {
        // 3. Crear contacto
        await prisma.contact.create({
          data: {
            name: contact.name,
            clientId: dbClient.id,
            position: contact.position || null,
            email: contact.email || null,
            phone: contact.phone || null,
            notes: contact.notes || 'Importado de CSV Odoo'
          }
        });
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      message: 'Importación de contactos completada',
      created: createdCount,
      skipped: skippedCount,
      newClients: newClientsGeneratedCount
    });

  } catch (error) {
    console.error('Error importing contacts:', error);
    return NextResponse.json({ error: 'Error procesando importación de contactos' }, { status: 500 });
  }
}
