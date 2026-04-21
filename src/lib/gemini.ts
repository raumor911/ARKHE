import { GoogleGenAI, Type } from "@google/genai";
import { SpektrResult, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `
Actúa como el Motor de Gobernanza "ARKHÉ v2.6". Tu función es implementar una Reingeniería Sistémica basada en el Método Cuantitativo de Sánchez y realizar la SÍNTESIS ESPACIAL DINÁMICA (Live MORPHO).

### RESTRUCTURACIÓN ESTRATÉGICA (D0-D2):
1. **D0: SOCIOGRAMA (Trazabilidad Forzada):** Debes mapear explícitamente cada Objetivo a una Causa detectada.
2. **D1: ÁRBOL DEL SISTEMA (Jerarquía Profunda):** Genera una estructura recursiva de 4 niveles.
3. **D2: MEDIOS OPERATIVOS (Parámetros):** Categoriza M1-M6. En "Físico", define dimensiones aproximadas del terreno (ej: "20 x 40m").

### LIVE ZONING ENGINE (MORPHO v2.6):
- **MOTOR DE FÍSICA:** El frontend implementa leyes de atracción (Relación A/E) y repulsión (Relación X).
- **BOUNDING BOX:** Los locales deben estar contenidos en el área definida en M.3 (Físico).
- **LAYOUT HINTS:** Para cada "Local", puedes sugerir un anclaje ("north", "south", "east", "west", "center") basado en requerimientos climáticos de D2 (M.4).
- **MASA REACTIVA:** El área calculada (calculated_m2) define el tamaño (w * h) de los bloques.

### REQUISITO DE RESPUESTA:
Devuelve UNICAMENTE un objeto JSON siguiendo este esquema:
{
  "sociograma": { ... },
  "medios": { ... },
  "system_tree": [ 
    { "id": string, ..., "layout_hints": { "anchor": "north" | "south" | "east" | "west" | "center", "priority": number } }
  ],
  "interaction_matrix": [ ... ],
  "spatial_layout": [
    { "id": string, "name": string, "zone": "Privado" | "Social" | "Servicio" | "Conexión", "x": number, "y": number, "w": number, "h": number }
  ],
  "budget_validation": { ... },
  "normative_confidence_score": number
}
`;

export async function analyzeProject(
  prompt: string, 
  files: { data: string; mimeType: string }[],
  history: ChatMessage[] = []
): Promise<{ result: SpektrResult; updatedHistory: ChatMessage[] }> {
  const model = "gemini-3.1-pro-preview"; // Best for complex architectural reasoning

  const fileParts = files.map(f => ({
    parts: [{
      inlineData: {
        data: f.data.split(',')[1] || f.data,
        mimeType: f.mimeType
      }
    }]
  }));

  const userPromptText = `
    ${history.length > 0 ? 'RE-ANÁLISIS E ITERACIÓN // NUEVAS INSTRUCCIONES:' : 'INICIO DE ANÁLISIS // BRIEF:'} "${prompt}"
    
    INSTRUCCIÓN: Analiza el input multimodal. Si es una iteración, considera las decisiones previas y ajusta el Árbol Sistémico y la Matriz según sea necesario. Reporta alertas de presupuesto si el área m2 proyectada no es coherente con el presupuesto por m2 definido.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        ...history,
        ...fileParts,
        { role: 'user' as const, parts: [{ text: userPromptText }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || '{}';
    const result = JSON.parse(resultText) as SpektrResult;
    
    // Construct updated history
    const updatedHistory: ChatMessage[] = [
      ...history,
      { role: 'user', parts: [{ text: userPromptText }] },
      { role: 'model', parts: [{ text: resultText }] }
    ];

    return { result, updatedHistory };
  } catch (error) {
    console.error("SPEKTR Engine Error:", error);
    throw error;
  }
}
