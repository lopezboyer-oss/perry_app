import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { activitySchema } from '@/lib/validators';
import { parseLocalDate } from '@/lib/timezone';
import { toSentenceCase, getLocalToday } from '@/lib/utils';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = activitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate that future activities can only be created with PENDIENTE status
    const today = getLocalToday();
    if (data.date > today && data.status !== 'PENDIENTE') {
      return NextResponse.json(
        { error: 'Las actividades programadas para una fecha futura solo pueden crearse con estatus PENDIENTE' },
        { status: 400 }
      );
    }

    // Resolve companyId: explicit > active company cookie > user's default company > baseCompany
    let companyId = data.companyId || null;
    if (!companyId) {
      const cookieVal = cookies().get('perry_active_company')?.value;
      if (cookieVal && cookieVal !== 'ALL') {
        companyId = cookieVal;
      } else {
        // Try user's default company from UserCompany
        const defaultUC = await prisma.userCompany.findFirst({
          where: { userId: data.userId, isDefault: true },
          select: { companyId: true },
        });
        if (defaultUC) {
          companyId = defaultUC.companyId;
        } else {
          // Fallback: any company the user has, or baseCompanyId
          const anyUC = await prisma.userCompany.findFirst({
            where: { userId: data.userId },
            select: { companyId: true },
          });
          if (anyUC) {
            companyId = anyUC.companyId;
          } else {
            const user = await prisma.user.findUnique({ where: { id: data.userId }, select: { baseCompanyId: true } });
            companyId = user?.baseCompanyId || null;
          }
        }
      }
    }

    const activity = await prisma.activity.create({
      data: {
        date: parseLocalDate(data.date),
        userId: data.userId,
        type: data.type as any,
        status: data.status as any,
        title: toSentenceCase(data.title),
        clientId: data.clientId || null,
        contactId: data.contactId || null,
        workOrderFolio: data.workOrderFolio || null,
        purchaseOrder: data.purchaseOrder || null,
        projectArea: data.projectArea || null,
        result: data.result || null,
        nextStep: data.nextStep || null,
        commitmentDate: data.commitmentDate ? new Date(data.commitmentDate) : null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        durationMinutes: data.durationMinutes || null,
        location: data.location || null,
        notes: data.notes || null,
        consortiumCompany: data.consortiumCompany || null,
        continuedFromId: data.continuedFromId || null,
        companyId,
      },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error: any) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Error al crear actividad' },
      { status: 500 }
    );
  }
}
