import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessWhatsappCoPilot } from '@/lib/permissions';
import { seedOrAnalyzeInitialPatterns, buildAntigravityCopypastaPrompt } from '@/lib/whatsapp/pattern-detector';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessWhatsappCoPilot(email)) {
      return NextResponse.json({ error: 'Acceso restringido a dirección' }, { status: 403 });
    }

    // Auto seed patterns if empty
    await seedOrAnalyzeInitialPatterns();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || '';
    const company = searchParams.get('company') || '';
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const where: any = {};

    if (category) where.category = category;
    if (status) where.status = status;
    if (company) {
      where.companyName = { contains: company, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { incidentSummary: { contains: search, mode: 'insensitive' } },
        { proposedImprovement: { contains: search, mode: 'insensitive' } },
        { aiAnalysis: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.perryIncidentPattern.findMany({
      where,
      orderBy: [{ recurrenceCount: 'desc' }, { updatedAt: 'desc' }],
    });

    const stats = {
      total: items.length,
      highRecurrence: items.filter((i) => i.recurrenceCount >= 2).length,
      inProgress: items.filter((i) => i.status === 'EN_PROGRESO').length,
      resolved: items.filter((i) => i.status === 'RESUELTO').length,
    };

    return NextResponse.json({ items, stats });
  } catch (error: any) {
    console.error('Error in improvements API:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessWhatsappCoPilot(email)) {
      return NextResponse.json({ error: 'Acceso restringido a dirección' }, { status: 403 });
    }

    const body = await req.json();
    const { title, category, companyName, incidentSummary, rawContextText, aiAnalysis, proposedImprovement } = body;

    if (!title || !incidentSummary || !proposedImprovement) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const now = new Date();
    const prompt = buildAntigravityCopypastaPrompt({
      title,
      category: category || 'LOGISTICA',
      companyName,
      recurrenceCount: 1,
      firstSeenAt: now,
      lastSeenAt: now,
      incidentSummary,
      rawContextText: rawContextText || incidentSummary,
      aiAnalysis,
      proposedImprovement,
    });

    const item = await prisma.perryIncidentPattern.create({
      data: {
        title,
        category: category || 'LOGISTICA',
        companyName: companyName || 'MULTIEMPRESA',
        incidentSummary,
        rawContextText: rawContextText || incidentSummary,
        aiAnalysis: aiAnalysis || null,
        proposedImprovement,
        copypastaPrompt: prompt,
        status: 'DETECTADO',
      },
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Error creating improvement pattern:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const email = (session.user as any)?.email || '';
    if (!canAccessWhatsappCoPilot(email)) {
      return NextResponse.json({ error: 'Acceso restringido a dirección' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, recurrenceCount, proposedImprovement } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const existing = await prisma.perryIncidentPattern.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    const updatedData: any = {};
    if (status) updatedData.status = status;
    if (recurrenceCount !== undefined) {
      updatedData.recurrenceCount = recurrenceCount;
      updatedData.lastSeenAt = new Date();
    }
    if (proposedImprovement) updatedData.proposedImprovement = proposedImprovement;

    // Regenerate copypasta prompt if content changed
    const newPrompt = buildAntigravityCopypastaPrompt({
      title: existing.title,
      category: existing.category,
      companyName: existing.companyName || undefined,
      recurrenceCount: updatedData.recurrenceCount ?? existing.recurrenceCount,
      firstSeenAt: existing.firstSeenAt,
      lastSeenAt: updatedData.lastSeenAt ?? existing.lastSeenAt,
      incidentSummary: existing.incidentSummary,
      rawContextText: existing.rawContextText,
      aiAnalysis: existing.aiAnalysis || undefined,
      proposedImprovement: updatedData.proposedImprovement ?? existing.proposedImprovement,
    });
    updatedData.copypastaPrompt = newPrompt;

    const item = await prisma.perryIncidentPattern.update({
      where: { id },
      data: updatedData,
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Error updating improvement pattern:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
