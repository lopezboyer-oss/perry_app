import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { activities, reportEquipo } = await req.json();

    if (!activities || !Array.isArray(activities) || activities.length === 0) {
      return NextResponse.json({ summary: "No hay suficientes datos registrados en las actividades para generar un resumen ejecutivo." });
    }

    const isSingleEquipment = reportEquipo && reportEquipo !== 'ALL';

    // Build the prompt from activity data
    let promptData = "";
    activities.forEach((act: any, idx: number) => {
      promptData += `--- Actividad ${idx + 1} ---\n`;
      promptData += `Fecha: ${act.date ? new Date(act.date).toLocaleDateString('es-MX') : 'N/A'}\n`;
      promptData += `Título: ${act.title || 'Actividad sin título'}\n`;
      promptData += `Equipo: ${act.equipo || act.manPowerEquipo || 'General'}\n`;
      promptData += `Responsable: ${act.user?.name || 'N/A'}\n`;
      promptData += `Cliente/Contacto: ${act.client?.name || act.contact?.name || 'N/A'}\n`;
      promptData += `Estado (Status de la actividad): ${act.status || 'N/A'}\n`;
      if (act.weekendNotes) promptData += `Resultados/Seguimiento (Notas): ${act.weekendNotes}\n`;
      if (act.auditNotes) promptData += `Observaciones de Seguridad: ${act.auditNotes}\n`;
      if (act.alertNotes) promptData += `Alertas: ${act.alertNotes}\n`;
      
      if (act.parts && act.parts.length > 0) {
        promptData += `Materiales vinculados:\n`;
        act.parts.forEach((p: any) => {
          promptData += ` - ${p.quantity}x ${p.name} (Notas: ${p.notes || 'Ninguna'})\n`;
        });
      }
      promptData += "\n";
    });

    if (promptData.trim() === "") {
      return NextResponse.json({ summary: "Las actividades seleccionadas no contienen datos suficientes." });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'Configurado_En_Netlify') {
      return NextResponse.json({ error: 'Falta configurar la API Key de Gemini en el servidor' }, { status: 500 });
    }

    let systemPrompt = "";

    if (isSingleEquipment) {
      systemPrompt = `Eres un gerente de proyectos de ingeniería altamente capacitado.
Tu tarea es leer los reportes de técnicos de un equipo específico (${reportEquipo}) y redactar un Resumen Ejecutivo estructurado.

ESTRUCTURA OBLIGATORIA DEL REPORTE (debes usar estrictamente este formato con números y títulos):

1. Resumen Ejecutivo
Escribe un párrafo narrativo (máximo 4 líneas) reportando el avance en los trabajos de ${reportEquipo}. Menciona fechas de jornadas trabajadas, un resumen del progreso global, y quién es el Responsable principal y Cliente/Contacto. IMPORTANTE: NO emitas conclusiones genéricas ni inventes porcentajes de avance total (ej. "estado COMPLETADO con un avance del 100%").

2. Actividades Reportadas
Enumera con viñetas las actividades ejecutadas y su fecha. Ejemplo: • 1. Título de actividad (Fecha).

3. Pendientes
Extrae una lista de pendientes en viñetas basándote en las notas de resultados, seguimiento y observaciones. Si un técnico reporta algo como faltante o incompleto, ponlo aquí. Si no hay nada, omite esta sección o pon "Sin pendientes registrados".

4. Materiales Requeridos
Extrae una lista de refacciones/materiales en viñetas usando ÚNICAMENTE y EXCLUSIVAMENTE los "Materiales vinculados" proporcionados explícitamente en el listado de abajo. NO inventes ni deduzcas materiales de las notas. Si no se listan "Materiales vinculados", omite la sección o pon "Sin requerimientos".

5. Anexos - Evidencias Fotográficas
Solamente imprime este texto literalmente como título (la aplicación inyectará las fotos aquí abajo, tú no debes intentar insertar fotos).`;
    } else {
      systemPrompt = `Eres un gerente de proyectos de ingeniería altamente capacitado.
Tu tarea es leer los siguientes reportes de técnicos en campo de múltiples equipos y redactar un Resumen Ejecutivo Multidisciplinario de máximo 3 párrafos.
Este resumen será leído por la gerencia del cliente.
Debes sonar muy profesional, analítico y conciso. Omite la jerga técnica innecesaria.
Enfócate en:
1. Hitos logrados o avances importantes agrupados por áreas o equipos principales.
2. Problemas globales, alertas o riesgos detectados que afecten múltiples actividades.
3. El estado general de los proyectos. IMPORTANTE: NO emitas conclusiones genéricas ni inventes porcentajes de avance total (ej. "estado COMPLETADO con un avance del 100%").

Evita usar saludos. Ve directo al grano. Usa negritas para destacar equipos o métricas, mantenlo en estilo de párrafo narrativo ejecutivo. NO satures con detalles individuales si no son de alto impacto.`;
    }

    const text = `${systemPrompt}\n\nDatos Extraídos de la Base de Datos:\n${promptData}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://perry.netlify.app/',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return NextResponse.json({ error: `Error de la IA: ${errorText}` }, { status: 502 });
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ summary: summary.trim() });
  } catch (error: any) {
    console.error('Error generating executive summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
