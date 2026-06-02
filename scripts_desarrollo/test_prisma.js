const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contacts = [
    {
      name: 'ALEXIS CAMPOS',
      companyName: 'TMMBC',
      position: '',
      email: 'angel.campos@toyota.com',
      phone: '+52 664 491 6444',
      notes: 'Importado de CSV Odoo'
    }
  ];

  for (const contact of contacts) {
    if (!contact.name || !contact.companyName) continue;

    const trimmedCompany = contact.companyName.trim();
    console.log("Looking for:", trimmedCompany);
    
    // 1. Resolver el cliente al que pertenece
    let dbClient = await prisma.client.findFirst({
    where: { name: { equals: trimmedCompany, mode: 'insensitive' } }
    });

    // Opción B: Crear la empresa dinámicamente si no existe
    if (!dbClient) {
    console.log("No client found, creating...");
    dbClient = await prisma.client.create({
        data: {
        name: trimmedCompany,
        status: 'ACTIVO',
        notes: 'Añadido automáticamente en importación de contactos de Odoo',
        }
    });
    }

    console.log("Client is:", dbClient);

    // 2. Comprobar si este contacto exacto ya existe en ese cliente
    const existingContact = await prisma.contact.findFirst({
    where: {
        name: { equals: contact.name, mode: 'insensitive' },
        clientId: dbClient.id
    }
    });

    if (!existingContact) {
    // 3. Crear contacto
    console.log("Creating contact...");
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
    console.log("Contact created!");
    } else {
        console.log("Contact exists");
    }
  }
}

main().catch(e => console.error("FATAL ERROR:", e));
