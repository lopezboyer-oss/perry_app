import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const actividades = await prisma.activity.findMany({
      where: {
        isManPower: true,
        manPowerEquipo: { not: null },
      },
      select: {
        manPowerEquipo: true,
      },
      distinct: ['manPowerEquipo'],
    });

    const equipos = actividades.map(a => a.manPowerEquipo).filter(Boolean) as string[];
    
    return NextResponse.json(equipos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
