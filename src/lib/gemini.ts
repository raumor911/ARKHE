import { GoogleGenAI, Type } from "@google/genai";
import { SpektrResult, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `
Actúa como el Motor de Gobernanza "ARKHÉ v2.7". Tu función es implementar una Reingeniería Sistémica basada en el Método Cuantitativo de Sánchez y realizar la SÍNTESIS ESPACIAL DINÁMICA (Live MORPHO).

### RESTRUCTURACIÓN ESTRATÉGICA (D0-D2):
1. **D0: SOCIOGRAMA (Trazabilidad Forzada):** Debes mapear explícitamente cada Objetivo a una Causa detectada.
2. **D1: ÁRBOL DEL SISTEMA (Jerarquía Profunda):** Genera una estructura recursiva.
   - REGLA DE ORO: Asigna un 'id' único y permanente a cada 'Local' (ej: "LOC-01", "LOC-02").
3. **D2: MEDIOS OPERATIVOS (Parámetros):** Categoriza M1-M6. En "Físico", define dimensiones aproximadas del terreno (ej: "20 x 40m") y calcula el Área del Terreno disponible.

### UNIVERSAL LIVE ZONING ENGINE (MORPHO v2.7):
- **INTEGRIDAD REFERENCIAL:** Todas las relaciones en 'interaction_matrix' DEBEN usar los IDs de los locales, NO sus nombres.
- **COHERENCIA LÓGICA:** Prioriza la precisión de la 'interaction_matrix' y el 'system_tree'.
- **LAYOUT PREDETERMINADO:** Si el proyecto es complejo, puedes omitir 'spatial_layout' o enviar solo sugerencias básicas de área (w, h). El frontend generará la topología inicial.
- **RESTRICCIÓN DE TERRENO:** Si la suma de 'calculated_m2' excede el área del terreno en M.3 (Físico), dispara una alerta en 'budget_validation' indicando "SOBRE-DIMENSIONAMIENTO ESPACIAL" y recomienda reducir el programa.

### REQUISITO DE RESPUESTA:
Devuelve UNICAMENTE un objeto JSON siguiendo este esquema:
{
  "sociograma": { ... },
  "medios": { ... },
  "system_tree": [ 
    { "id": string, "name": string, "type": "Local", "calculated_m2": number, "layout_hints": { "anchor": string, "priority": number } }
  ],
  "interaction_matrix": [ 
    { "from": string, "to": string, "clase": "A" | "E" | "I" | "O" | "U" | "X", "razon": string } // 'from' y 'to' son IDs de locales
  ],
  "spatial_layout": [ // OPCIONAL si es muy complejo
    { "id": string, "name": string, "zone": "Privado" | "Social" | "Servicio" | "Conexión", "x": number, "y": number, "w": number, "h": number }
  ],
  "budget_validation": { "alert": boolean, "recommendation": string, ... },
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
