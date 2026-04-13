import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role === 'INGENIERO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { clients } = await req.json();

    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json({ error: 'No clients data provided' }, { status: 400 });
    }

    let createdCount = 0;
    let skippedCount = 0;

    // Procesar uno por uno para validar duplicados
    for (const client of clients) {
      if (!client.name) continue;

      // Buscar si el cliente ya existe por nombre o código para no duplicar basura de Odoo
      const exists = await prisma.client.findFirst({
        where: {
          OR: [
            { name: { equals: client.name, mode: 'insensitive' } },
            ...(client.code ? [{ code: client.code }] : [])
          ]
        }
      });

      if (!exists) {
        await prisma.client.create({
          data: {
            name: client.name,
            code: client.code || null,
            status: client.status || 'ACTIVO',
            notes: client.notes || 'Importado desde Odoo CSV',
          }
        });
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      message: 'Importación terminada',
      created: createdCount,
      skipped: skippedCount
    });

  } catch (error) {
    console.error('Error importing clients:', error);
    return NextResponse.json({ error: 'Error procesando importación' }, { status: 500 });
  }
}
