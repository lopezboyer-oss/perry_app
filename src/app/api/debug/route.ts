import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const techName = searchParams.get('techName') || 'ARMANDO ARREOLA';

    const tech = await prisma.technician.findFirst({
      where: { name: { contains: techName, mode: 'insensitive' } }
    });

    if (!tech) return NextResponse.json({ error: 'Tech not found' });

    const assignments = await prisma.weekendTechAssignment.findMany({
      where: { technicianId: tech.id },
      include: { activity: true }
    });

    return NextResponse.json({ tech, assignments });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
