import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { activities } = await req.json();

    if (!activities || !Array.isArray(activities) || activities.length === 0) {
      return NextResponse.json({ summary: "No hay suficientes datos registrados en las actividades para generar un resumen ejecutivo." });
    }

    // Build the prompt from activity data
    let promptData = "";
    activities.forEach((act: any, idx: number) => {
      promptData += `--- Actividad ${idx + 1} ---\n`;
      promptData += `Equipo: ${act.equipo || 'General'}\n`;
      if (act.weekendNotes) promptData += `Resultados/Seguimiento: ${act.weekendNotes}\n`;
      if (act.auditNotes) promptData += `Observaciones de Seguridad: ${act.auditNotes}\n`;
      if (act.alertNotes) promptData += `Alertas: ${act.alertNotes}\n`;
      promptData += "\n";
    });

    if (promptData.trim() === "") {
      return NextResponse.json({ summary: "Las actividades seleccionadas no contienen notas, resultados ni observaciones para analizar." });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'Configurado_En_Netlify') {
      return NextResponse.json({ error: 'Falta configurar la API Key de Gemini en el servidor' }, { status: 500 });
    }

    const systemPrompt = `Eres un gerente de proyectos de ingeniería altamente capacitado.
Tu tarea es leer los siguientes reportes de técnicos en campo y redactar un Resumen Ejecutivo Gerencial de máximo 2 párrafos.
Este resumen será leído por la gerencia del cliente.
Debes sonar muy profesional, analítico y conciso.
Omite la jerga técnica innecesaria o detalles de bajo nivel.
Enfócate en:
1. Hitos logrados o avances importantes.
2. Problemas, alertas o riesgos detectados.
3. El estado general de los equipos intervenidos.

Evita usar saludos como "Estimado" o frases de cierre. Ve directo al grano. Formatea el texto con markdown ligero (negritas para destacar equipos o métricas importantes) si lo ves conveniente, pero NO uses listas con viñetas largas, mantenlo en estilo de párrafo narrativo ejecutivo.`;

    const text = `${systemPrompt}\n\nDatos de los técnicos:\n${promptData}`;

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
