import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { parseLocalDate, getTijuanaToday, getTijuanaDayOfWeek } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

function matchNames(name1: string, name2: string): boolean {
  const normalize = (s: string) => 
    s.normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .toUpperCase()
     .split(/[\s,.-]+/)
     .filter(word => word.length > 2);
  
  const words1 = normalize(name1);
  const words2 = normalize(name2);
  
  if (words1.length === 0 || words2.length === 0) return false;
  
  const [shorter, longer] = words1.length < words2.length ? [words1, words2] : [words2, words1];
  return shorter.every(word => longer.includes(word));
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { role, email } = session.user as any;
    const hasAccess = ['ADMIN', 'ADMINISTRACION'].includes(role) || email === 'carlos.lopez@gsingenieria.mx';

    if (!hasAccess) {
      return NextResponse.json({ error: 'Prohibido: No tienes permisos para este reporte' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || getTijuanaToday().substring(0, 8) + '01'; // Primer día del mes
    const endDate = searchParams.get('endDate') || getTijuanaToday();

    // Buscar a Carlos López
    const carlosUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'carlos.lopez@gsingenieria.mx' },
          { name: { contains: 'Carlos Lopez', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    if (!carlosUser) {
      return NextResponse.json({ error: 'Usuario Carlos López no encontrado en el sistema' }, { status: 404 });
    }

    // Convertir a fechas de Tijuana al mediodía para evitar desfases
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    
    // Rango completo de día
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    // Consultar días extra para identificar fines de semana
    const extraPlanDays = await prisma.extraPlanDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        }
      },
      select: { date: true }
    });
    const extraDaySet = new Set(extraPlanDays.map(d => d.date));

    const getTijuanaDateString = (date: Date) => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Tijuana',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    };

    const activities = await prisma.activity.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        OR: [
          // Fuente 0: Carlos es responsable directo
          { userId: carlosUser.id },
          // Fuente 1: Carlos es asignado en weekendUserSafetyAssignments
          {
            weekendUserSafetyAssignments: {
              some: {
                userId: carlosUser.id,
              }
            }
          },
          // Fuente 2: Carlos es asignado en weekendTechAssignments (como safety designado)
          {
            weekendTechAssignments: {
              some: {
                role: 'SAFETY_DESIGNADO',
                OR: [
                  { technician: { linkedUserId: carlosUser.id } },
                  { technician: { name: { contains: 'Carlos Lopez', mode: 'insensitive' } } }
                ]
              }
            }
          },
          // Fuente 3: Carlos es asignado en weekendSafetyAssignments (como safety dedicado designado)
          {
            weekendSafetyAssignments: {
              some: {
                role: 'DESIGNADO',
                OR: [
                  { safetyDedicado: { linkedUserId: carlosUser.id } },
                  { safetyDedicado: { name: { contains: 'Carlos Lopez', mode: 'insensitive' } } }
                ]
              }
            }
          }
        ]
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            shortName: true,
            color: true,
          }
        },
        client: {
          select: {
            id: true,
            name: true,
          }
        },
        weekendUserSafetyAssignments: {
          include: {
            user: { select: { id: true, name: true } }
          }
        },
        weekendTechAssignments: {
          include: {
            technician: { select: { id: true, name: true, linkedUserId: true } }
          }
        },
        weekendSafetyAssignments: {
          include: {
            safetyDedicado: { select: { id: true, name: true, linkedUserId: true } }
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    const filteredActivities = activities.filter((a) => {
      // Determinar si es un día de fin de semana / Plan Finde
      const dayOfWeek = getTijuanaDayOfWeek(a.date);
      const dateStr = getTijuanaDateString(a.date);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || extraDaySet.has(dateStr);

      if (isWeekend) {
        // En fin de semana, Carlos debe ser el Sup Operativo.
        // Fuente 1: WeekendUserSafetyAssignment
        const isUserSafety = a.weekendUserSafetyAssignments.some(x => x.userId === carlosUser.id);
        
        // Fuente 2: WeekendTechAssignment (role SAFETY_DESIGNADO, y el técnico es Carlos)
        const isTechSafety = a.weekendTechAssignments.some(x => 
          x.role === 'SAFETY_DESIGNADO' && 
          (x.technician.linkedUserId === carlosUser.id || matchNames(x.technician.name, carlosUser.name))
        );

        // Fuente 3: WeekendSafetyAssignment (role DESIGNADO, y el safety dedicado es Carlos)
        const isSafetyDedicado = a.weekendSafetyAssignments.some(x => 
          x.role === 'DESIGNADO' && 
          (x.safetyDedicado.linkedUserId === carlosUser.id || matchNames(x.safetyDedicado.name, carlosUser.name))
        );

        return isUserSafety || isTechSafety || isSafetyDedicado;
      } else {
        // Entre semana, Carlos debe ser el responsable directo
        return a.userId === carlosUser.id;
      }
    });

    return NextResponse.json({
      carlos: carlosUser,
      activities: filteredActivities.map(a => ({
        id: a.id,
        title: a.title,
        date: a.date.toISOString(),
        status: a.status,
        type: a.type,
        durationMinutes: a.durationMinutes,
        startTime: a.startTime,
        endTime: a.endTime,
        actualStartTime: a.actualStartTime,
        actualEndTime: a.actualEndTime,
        workOrderFolio: a.workOrderFolio,
        company: a.company,
        client: a.client,
      }))
    });
  } catch (error: any) {
    console.error('Error fetching special report for Carlos:', error);
    return NextResponse.json({ error: 'Error al consultar las actividades' }, { status: 500 });
  }
}
