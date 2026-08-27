import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 1. Fetch Technicians
    const technicians = await prisma.technician.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        isCruzVerde: true,
      },
      orderBy: { name: 'asc' },
    });

    // 2. Fetch Supervisors & Staff (User roles: SUPERVISOR, ADMIN, ADMINISTRACION, INGENIERO)
    const supervisors = await prisma.user.findMany({
      where: {
        role: { in: ['SUPERVISOR', 'ADMIN', 'ADMINISTRACION', 'INGENIERO'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    // 3. Fetch Safety Dedicated Staff
    const safetyStaff = await prisma.safetyDedicado.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    // 4. Fetch Clients & Plants
    const contactos = await prisma.contacto.findMany({
      select: {
        id: true,
        empresa: true,
        nombre: true,
      },
      orderBy: { empresa: 'asc' },
    });

    // Extract unique client / plant names
    const clientSet = new Set<string>();
    contactos.forEach((c) => {
      if (c.empresa && c.empresa.trim().length > 0) {
        clientSet.add(c.empresa.trim().toUpperCase());
      }
    });

    // Add common plant defaults if missing
    ['INFINEON', 'TMMBC', 'FACILITIES', 'ANDEN AD13', 'TALLER', 'OFICINA', 'COMPRAS', 'TRAILA / OFICINA'].forEach((p) =>
      clientSet.add(p)
    );

    const clients = Array.from(clientSet).sort().map((name) => ({ id: name, name }));

    return NextResponse.json({
      technicians,
      supervisors,
      safetyStaff,
      clients,
    });
  } catch (error: any) {
    console.error('Error fetching Plan Diario catalogs:', error);
    return NextResponse.json({ error: error.message || 'Error cargando catálogos' }, { status: 500 });
  }
}
