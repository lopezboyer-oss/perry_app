import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { rawText, reportDate, userId, activities } = await req.json();

    if (!rawText || !reportDate || !userId || !activities?.length) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Create daily report
    const report = await prisma.dailyReport.create({
      data: {
        userId,
        reportDate: new Date(reportDate),
        rawText,
        source: 'WHATSAPP_IMPORT',
      },
    });

    // Create all activities
    const created = await Promise.all(
      activities.map((act: any) =>
        prisma.activity.create({
          data: {
            dailyReportId: report.id,
            userId,
            date: new Date(reportDate),
            type: act.type,
            status: 'COMPLETADA',
            title: act.title,
            clientId: act.clientId || null,
            contactId: act.contactId || null,
          },
        })
      )
    );

    return NextResponse.json({ count: created.length, reportId: report.id }, { status: 201 });
  } catch (error) {
    console.error('Error importing report:', error);
    return NextResponse.json({ error: 'Error al importar' }, { status: 500 });
  }
}
