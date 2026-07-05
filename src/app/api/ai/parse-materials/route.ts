import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Texto no proporcionado' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key no configurada' }, { status: 500 });
    }

    const prompt = `Eres un asistente experto en ingeniería y mantenimiento. Tu tarea es extraer listas de materiales, repuestos o herramientas a partir de un mensaje no estructurado. 
Analiza el siguiente texto y extrae cada elemento mencionado, junto con su cantidad numérica.
Reglas ESTRICTAS:
1. Responde ÚNICAMENTE con un JSON válido.
2. No uses formato markdown, ni bloques de código (\`\`\`), ni texto introductorio.
3. El JSON debe ser un Array de Objetos.
4. Cada objeto debe tener exactamente dos propiedades: "name" (string, nombre del material lo más limpio posible) y "quantity" (number, la cantidad extraída, si no se especifica asume 1).
5. No inventes materiales que no estén en el texto.

Texto a analizar:
"""
${text}
"""`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://perry.netlify.app/',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return NextResponse.json({ error: `Error de la IA: ${errorText}` }, { status: 502 });
    }

    const data = await response.json();
    let resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return NextResponse.json({ error: 'La IA devolvió un resultado vacío' }, { status: 500 });
    }

    // Clean up potential markdown formatting if the model ignored the instructions
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsedMaterials = JSON.parse(resultText);
      return NextResponse.json({ items: parsedMaterials }, { status: 200 });
    } catch (parseError) {
      console.error('Error parsing Gemini JSON:', resultText);
      return NextResponse.json({ error: 'La respuesta de la IA no fue un JSON válido' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in parse-materials:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
