import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const role = session.user.role;
    const userId = session.user.id;
    const userName = session.user.name;

    // 1. Validar accesos de rol
    const allowedRoles = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'INGENIERO'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'No tienes permisos para realizar esta acción' }, { status: 403 });
    }

    // 2. Procesar el cuerpo de la petición
    const body = await req.json();
    const { folio, content } = body;

    if (!folio || typeof folio !== 'string' || !folio.trim()) {
      return NextResponse.json({ error: 'Folio Odoo es requerido' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'El contenido del comentario no puede estar vacío' }, { status: 400 });
    }

    // 3. Crear el comentario en la base de datos
    const comment = await prisma.odooFolioComment.create({
      data: {
        folio: folio.trim().toUpperCase(),
        content: content.trim(),
        userId,
        userName
      }
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        userName: comment.userName,
        createdAt: comment.createdAt.toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error al guardar comentario:', error);
    return NextResponse.json({ error: 'Error al guardar el comentario', detail: error.message }, { status: 500 });
  }
}
