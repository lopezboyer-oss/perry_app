import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const body = await req.json();
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
  if (body.result !== undefined) allowedFields.result = body.result || null;

  // Audit notes: only SUPERVISOR_SAFETY_LP or isSafetyAuditor can edit
  if (body.auditNotes !== undefined) {
    const role = session.user.role;
    const isSafetyAuditor = (session.user as any).isSafetyAuditor || false;
    if (role !== 'SUPERVISOR_SAFETY_LP' && !isSafetyAuditor) {
      return NextResponse.json({ error: 'Sin permisos para notas de auditoría' }, { status: 403 });
    }
    allowedFields.auditNotes = body.auditNotes || null;
  }

  // Alert notes: only SUPERVISOR_SAFETY_LP can edit
  if (body.alertNotes !== undefined) {
    const role = session.user.role;
    if (role !== 'SUPERVISOR_SAFETY_LP') {
      return NextResponse.json({ error: 'Sin permisos para notas de alerta' }, { status: 403 });
    }
    allowedFields.alertNotes = body.alertNotes || null;
  }

  // Safety audit image: ADMIN, SUPERVISOR_SAFETY_LP, or the activity's own engineer
  if (body.safetyAuditImage !== undefined) {
    const role = session.user.role;
    if (role === 'ADMIN' || role === 'ADMINISTRACION' || role === 'SUPERVISOR_SAFETY_LP' || role === 'SUPERVISOR') {
      // Admin/Sup can always edit
    } else {
      // Engineer can only edit their own activity
      const activity = await prisma.activity.findUnique({ where: { id: params.id }, select: { userId: true } });
      if (!activity || activity.userId !== session.user.id) {
        return NextResponse.json({ error: 'Solo puedes subir auditoría a tus propias actividades' }, { status: 403 });
      }
    }
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

  // TERA folio: same permissions as safetyAuditImage
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

  const activity = await prisma.activity.update({
    where: { id: params.id },
    data: allowedFields,
  });

  return NextResponse.json(activity);
}
