import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

async function isSupOperativo(activityId: string, userId: string, userName: string) {
  // Source 1: WeekendUserSafetyAssignment (userId match)
  const userAss = await prisma.weekendUserSafetyAssignment.findFirst({
    where: { activityId, userId }
  });
  if (userAss) return true;

  // Source 2: WeekendTechAssignment with role SAFETY_DESIGNADO (linkedUserId or name match)
  const techAss = await prisma.weekendTechAssignment.findFirst({
    where: {
      activityId,
      role: 'SAFETY_DESIGNADO',
      technician: {
        OR: [
          { linkedUserId: userId },
          { name: userName }
        ]
      }
    }
  });
  if (techAss) return true;

  // Source 3: WeekendSafetyAssignment with role DESIGNADO (linkedUserId or name match)
  const safetyAss = await prisma.weekendSafetyAssignment.findFirst({
    where: {
      activityId,
      role: 'DESIGNADO',
      safetyDedicado: {
        OR: [
          { linkedUserId: userId },
          { name: userName }
        ]
      }
    }
  });
  if (safetyAss) return true;

  return false;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    select: { userId: true, result: true }
  });

  if (!activity) {
    return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
  }

  const body = await req.json();

  const role = session.user.role;
  const isSupervisorOrAbove = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(role);
  if (!isSupervisorOrAbove && activity.userId !== session.user.id) {
    const isSup = await isSupOperativo(params.id, session.user.id, session.user.name || '');
    if (isSup) {
      // If they are Sup Operativo, they can only edit certain fields
      const updatedFields = Object.keys(body);
      const allowedSupFields = [
        'weekendNotes',
        'actualStartTime',
        'actualEndTime',
        'teraFolio',
        'safetyAuditImage'
      ];
      const isOnlyUpdatingSupFields = updatedFields.every(field => allowedSupFields.includes(field));
      if (!isOnlyUpdatingSupFields) {
        return NextResponse.json({ error: 'No autorizado para modificar campos restringidos' }, { status: 403 });
      }
    } else {
      const isSafetyAuditor = (session.user as any).isSafetyAuditor || false;
      const updatedFields = Object.keys(body);
      const safetyAuditFields = [
        'auditNotes',
        'teraAuditorFolio',
        'teraAuditorUploadedAt',
        'teraAuditorUploadedBy',
        'teraAuditorImage'
      ];
      const isOnlyUpdatingSafetyAudit = updatedFields.every(field => safetyAuditFields.includes(field));

      if (!isSafetyAuditor || !isOnlyUpdatingSafetyAudit) {
        return NextResponse.json({ error: 'No autorizado para modificar esta actividad' }, { status: 403 });
      }
    }
  }

  const allowedFields: Record<string, any> = {};

  if (body.loto !== undefined) allowedFields.loto = Boolean(body.loto);
  if (body.purchaseOrder !== undefined) allowedFields.purchaseOrder = body.purchaseOrder || null;
  if (body.workOrderFolio !== undefined) allowedFields.workOrderFolio = body.workOrderFolio ? String(body.workOrderFolio).slice(0, 6) : null;
  if (body.weekendNotes !== undefined) allowedFields.weekendNotes = body.weekendNotes || null;
  if (body.actualStartTime !== undefined) allowedFields.actualStartTime = body.actualStartTime || null;
  if (body.actualEndTime !== undefined) allowedFields.actualEndTime = body.actualEndTime || null;
  if (body.status !== undefined) {
    if (!['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'].includes(body.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }
    allowedFields.status = body.status;
  }
  
  if (body.result !== undefined) {
    const newNotes = body.result?.trim() || '';
    const oldResult = activity.result?.trim() || '';
    if (newNotes) {
      if (oldResult) {
        allowedFields.result = `${oldResult}\n\n[Cierre Supervisor]: ${newNotes}`;
      } else {
        allowedFields.result = newNotes;
      }
    } else {
      allowedFields.result = oldResult || 'Actividad completada desde Dashboard';
    }
  }

  // Audit notes: only SUPERVISOR_SAFETY_LP or isSafetyAuditor can edit
  if (body.auditNotes !== undefined) {
    const isSafetyAuditor = (session.user as any).isSafetyAuditor || false;
    if (role !== 'SUPERVISOR_SAFETY_LP' && !isSafetyAuditor) {
      return NextResponse.json({ error: 'Sin permisos para notas de auditoría' }, { status: 403 });
    }
    allowedFields.auditNotes = body.auditNotes || null;
  }

  // Alert notes: only SUPERVISOR_SAFETY_LP can edit
  if (body.alertNotes !== undefined) {
    if (role !== 'SUPERVISOR_SAFETY_LP') {
      return NextResponse.json({ error: 'Sin permisos para notas de alerta' }, { status: 403 });
    }
    allowedFields.alertNotes = body.alertNotes || null;
  }

  // Safety audit image
  if (body.safetyAuditImage !== undefined) {
    // Validate size (2MB max for base64 string ~2.7MB)
    if (body.safetyAuditImage && body.safetyAuditImage.length > 2_800_000) {
      return NextResponse.json({ error: 'Imagen demasiado grande (máx. 2MB)' }, { status: 400 });
    }
    allowedFields.safetyAuditImage = body.safetyAuditImage || null;
    // Track who uploaded and when
    if (body.safetyAuditImage) {
      allowedFields.teraUploadedAt = new Date();
      allowedFields.teraUploadedBy = session.user.name || 'Desconocido';
    } else {
      allowedFields.teraUploadedAt = null;
      allowedFields.teraUploadedBy = null;
    }
  }

  // TERA folio
  if (body.teraFolio !== undefined) {
    if (body.teraFolio) {
      const folio = String(body.teraFolio).trim().toUpperCase();
      if (!/^BC-\d{3,5}$/.test(folio)) {
        return NextResponse.json({ error: 'Folio TERA inválido. Formato: BC- seguido de 3 a 5 dígitos (ej: BC-123, BC-1234, BC-12345)' }, { status: 400 });
      }
      allowedFields.teraFolio = folio;
    } else {
      allowedFields.teraFolio = null;
    }
  }

  // TERA Auditor fields
  if (body.teraAuditorFolio !== undefined) {
    if (body.teraAuditorFolio) {
      const folio = String(body.teraAuditorFolio).trim().toUpperCase();
      if (!/^BC-\d{3,5}$/.test(folio)) {
        return NextResponse.json({ error: 'Folio TERA Auditor inválido. Formato: BC- seguido de 3 a 5 dígitos' }, { status: 400 });
      }
      allowedFields.teraAuditorFolio = folio;
    } else {
      allowedFields.teraAuditorFolio = null;
    }
  }
  if (body.teraAuditorUploadedAt !== undefined) allowedFields.teraAuditorUploadedAt = body.teraAuditorUploadedAt ? new Date(body.teraAuditorUploadedAt) : null;
  if (body.teraAuditorUploadedBy !== undefined) allowedFields.teraAuditorUploadedBy = body.teraAuditorUploadedBy || null;
  if (body.teraAuditorImage !== undefined) {
    if (body.teraAuditorImage && body.teraAuditorImage.length > 2_800_000) {
      return NextResponse.json({ error: 'Imagen demasiado grande (máx. 2MB)' }, { status: 400 });
    }
    allowedFields.teraAuditorImage = body.teraAuditorImage || null;
  }

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  const updatedActivity = await prisma.activity.update({
    where: { id: params.id },
    data: allowedFields,
  });

  return NextResponse.json(updatedActivity);
}
