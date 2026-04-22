import { GoogleGenAI, Type } from "@google/genai";
import { SpektrResult, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `
Actúa como el Motor de Gobernanza "ARKHÉ v2.7". Tu función es implementar una Reingeniería Sistémica basada en el Método Cuantitativo de Sánchez y realizar la SÍNTESIS ESPACIAL DINÁMICA (Live MORPHO).

### RESTRUCTURACIÓN ESTRATÉGICA (D0-D2):
1. **D0: SOCIOGRAMA (Trazabilidad Forzada):** Debes mapear explícitamente cada Objetivo a una Causa detectada.
2. **D1: ÁRBOL DEL SISTEMA (Jerarquía Profunda):** Genera una estructura recursiva.
   - REGLA DE ORO: Asigna un 'id' único y permanente a cada 'Local' (ej: "LOC-01", "LOC-02").
3. **D2: MEDIOS OPERATIVOS (Parámetros):** Categoriza M1-M6. En "Físico", define dimensiones aproximadas del terreno (ej: "20 x 40m") y calcula el Área del Terreno disponible.

### REGLA DE INTEGRIDAD:
1. **PROHIBICIÓN TOTAL:** Nunca uses el término "PENDIENTE" en ningún campo del JSON.
2. **RESOLUCIÓN DE INCERTIDUMBRE:** Si falta información o un dato es incierto, genera una "Hipótesis Técnica" lógica basada en el contexto arquitectónico o usa "DEFINIR POR DISEÑO".
3. **ESTRICTO ESQUEMA:** Los nombres de los campos en el JSON deben ser estrictamente: "causa", "efecto", "objetivo", "name", "id".

### REQUISITO DE RESPUESTA:
Devuelve UNICAMENTE un objeto JSON siguiendo este esquema estricto:
{
  "sociograma": { 
    "causa": string, 
    "efecto": string, 
    "objetivo": string 
  },
  "medios": {
    "Humano": { "description": string, "importance": "Imprescindible" | "Conveniente" | "Accesoria", "rg": string },
    "Económico": { "description": string, "importance": "Imprescindible" | "Conveniente" | "Accesoria", "rg": string },
    "Físico": { "description": string, "importance": "Imprescindible" | "Conveniente" | "Accesoria", "rg": string },
    "Climático": { "description": string, "importance": "Imprescindible" | "Conveniente" | "Accesoria", "rg": string },
    "Tecnológico": { "description": string, "importance": "Imprescindible" | "Conveniente" | "Accesoria", "rg": string },
    "Jurídico": { "description": string, "importance": "Imprescindible" | "Conveniente" | "Accesoria", "rg": string }
  },
  "system_tree": [ 
    { "id": string, "name": string, "type": "Local", "calculated_m2": number, "layout_hints": { "anchor": string, "priority": number } }
  ],
  "interaction_matrix": [ 
    { "from": string, "to": string, "clase": "A" | "E" | "I" | "O" | "U" | "X", "razon": string } // 'from' y 'to' son IDs de locales
  ],
  "spatial_layout": [ // OPCIONAL si es muy complejo. Usa w=h=Math.sqrt(m2)*1.5 para escalado proporcional.
    { "id": string, "name": string, "zone": "Privado" | "Social" | "Servicio" | "Conexión", "x": number, "y": number, "w": number, "h": number }
  ],
  "budget_validation": { "alert": boolean, "deviation": number, "recommendation": string, "total_m2": number, "estimated_investment": { ... } },
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
