import { NextRequest, NextResponse } from 'next/server';
import { parseWhatsAppReport } from '@/lib/parser';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { rawText } = await req.json();

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'Texto requerido' }, { status: 400 });
    }

    const parsed = parseWhatsAppReport(rawText);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error parsing report:', error);
    return NextResponse.json({ error: 'Error al parsear' }, { status: 500 });
  }
}
