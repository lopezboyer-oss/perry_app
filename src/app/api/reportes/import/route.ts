import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { parseLocalDate } from '@/lib/timezone';

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
        reportDate: parseLocalDate(reportDate),
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
            date: parseLocalDate(reportDate),
            type: act.type,
            status: act.status || 'COMPLETADA',
            title: act.title,
            clientId: act.clientId || null,
            contactId: act.contactId || null,
            workOrderFolio: act.workOrderFolio || null,
            projectArea: act.projectArea || null,
            result: act.result || null,
            nextStep: act.nextStep || null,
            commitmentDate: act.commitmentDate ? parseLocalDate(act.commitmentDate) : null,
            startTime: act.startTime || null,
            endTime: act.endTime || null,
            durationMinutes: act.durationMinutes ? parseInt(act.durationMinutes) : null,
            location: act.location || null,
            notes: act.notes || null,
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
