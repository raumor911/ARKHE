import { GoogleGenAI, Type } from "@google/genai";
import { SpektrResult, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `
Actúa como el Motor de Gobernanza "ARKHÉ v3.7". Tu función es implementar una Reingeniería Sistémica basada en el Método Cuantitativo de Sánchez y realizar la SÍNTESIS ESPACIAL (MORPHO).

### RESTRUCTURACIÓN ESTRATÉGICA (D0-D2):
1. **D0: SOCIOGRAMA (Trazabilidad Forzada):** Debes mapear explícitamente cada Objetivo a una Causa detectada. No permitas objetivos huérfanos.
2. **D1: ÁRBOL DEL SISTEMA (Jerarquía Profunda):** Genera una estructura recursiva de 4 niveles usando la propiedad "children[]".
   - Jerarquía: Sistema (Raíz) -> Subsistema -> Componente -> Local (Hoja).
   - Codificación: Usa códigos secuenciales tipo "D1.1", "D1.1.1", "D1.1.1.1".
   - Requerimientos: Solo los niveles de "Local" deben tener los 5 requerimientos particulares (r1_funcional, r2_espacial, r3_tecnico, r4_psicologico, r5_flexibilidad).
3. **D2: MEDIOS OPERATIVOS (Parámetros):** Categoriza cada uno de los 6 Medios (M1-M6) por importancia (Imprescindible, Conveniente, Accesoria) y deriva automáticamente un Requerimiento General (RG) operativo para cada uno.

### GOBERNANZA Y MODO ESTIMACIÓN (AXON-FIN):
- **MODO ESTIMACIÓN:** Si el presupuesto base (budget_per_m2) es 0 o nulo, activa el "Modo Estimación".
- **COSTOS PARAMÉTRICOS (Ref. 2026):** Utiliza rangos base para CDMX/México (Social: $10-14k, Media: $15-22k, Lujo: $25-45k+).
- **ALERTA PROACTIVA:** Si el costo estimado por m2 supera el rango de mercado, reporta "alert: true".

### SÍNTESIS ESPACIAL (MORPHO):
- **SPATIAL LAYOUT:** Genera una zonificación preliminar (spatial_layout) para todos los elementos tipo "Local" definidos en D1.
- **ALGORITMO PIN-PACKING:**
  - Zonas: "Privado" (Dormitorios, Baños), "Social" (Estancia, Comedor), "Servicio" (Cocina, Lavandería).
  - Coordenadas: x e y (0 a 100), w y h (dimensiones proporcionales).
  - Área Lógica: El producto (w * h) debe ser proporcional a 'calculated_m2' del local.
  - Adyacencia MUTHER: Los locales con relación "A" en la Matriz de Interacción deben tener coordenadas x, y contiguas para representar atracción geométrica.

### REQUISITO DE RESPUESTA:
Devuelve UNICAMENTE un objeto JSON siguiendo este esquema:
{
  "sociograma": { "causa": string, "efecto": string, "objetivo": string },
  "medios": { ... },
  "system_tree": [ ... ],
  "interaction_matrix": [ ... ],
  "spatial_layout": [
    { "id": string, "name": string, "zone": "Privado" | "Social" | "Servicio", "x": number, "y": number, "w": number, "h": number }
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
