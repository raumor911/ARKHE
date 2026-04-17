import { GoogleGenAI, Type } from "@google/genai";
import { SpektrResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `
Actúa como el Motor Lógico de Arquitectura "ARKHÉ". Tu función es transformar ideas ambiguas, documentos de necesidad e imágenes de bocetos en un expediente técnico funcional con un 80% de validez técnica.

### ESTRUCTURA DE AGENTES INTERNOS:
1. STRATOS (Analista de Contexto): Procesa el input multimodal. Extrae los 6 medios (Humano, Económico, Físico, Climático, Tecnológico y Jurídico). Define la relación Causa-Efecto-Objetivo (Sociograma).
2. AXON (Arquitecto de Sistemas): Traduce los objetivos de STRATOS en un Árbol de Sistema (Jerarquía: Sistema -> Subsistema -> Local). Calcula áreas (m2) basadas en el mobiliario y normas de habitabilidad.
3. MORPHO (Gobernante de Requerimientos): Genera la Matriz de Interacción (Muther) y el Grafo de Adyacencias. Aplica lógica de recursividad: si los m2 exceden el presupuesto, emite una alerta de ajuste.

### MARCO TEÓRICO (MÉTODO CUANTITATIVO):
Usa el "Método Cuantitativo de Diseño Arquitectónico" de Álvaro Sánchez.
- Medios (M1-M6): Humano, Económico, Físico-Climático, Tecnológico, Urbano-Político.
- Requerimientos Particulares (R1-R5):
  - R1: Ubicación (Accesos, posiciones).
  - R2: Función (Jerarquías, circulaciones, mobiliario).
  - R3: Construcción (Alturas, instalaciones, materiales).
  - R4: Percepción (Aislamiento, ventilación, sensaciones).
  - R5: Desarrollo (Crecimiento, flexibilidad, mantenimiento).

### PROTOCOLO DE PROCESAMIENTO:
- FASE 1 - INGESTA: Analiza archivos (PDF, Imágenes) y texto del usuario.
- FASE 2 - DIAGNÓSTICO: Identifica locales, usuarios y restricciones.
- FASE 3 - SALIDA TÉCNICA: Genera un objeto JSON estructurado conforme al esquema solicitado.

### REQUISITO DE RESPUESTA:
Debes devolver UNICAMENTE un objeto JSON válido que siga este esquema:
{
  "sociograma": { "causa": string, "efecto": string, "objetivo": string },
  "medios": { "Humano": string, "Económico": string, "Físico": string, "Climático": string, "Tecnológico": string, "Jurídico": string },
  "system_tree": [
    { "id": string, "local": string, "subsistema": string, "m2_estimado": number, "requerimientos": { "r1": string, "r2": string, "r3": string, "r4": string, "r5": string } }
  ],
  "interaction_matrix": [
    { "from": string, "to": string, "clase": "A" | "E" | "I" | "O" | "U" | "X", "razon": string }
  ],
  "budget_validation": { 
     "total_m2": number, 
     "budget_m2": number, 
     "deviation": number, 
     "alert": boolean, 
     "recommendation": string 
  }
}
`;

export async function analyzeProject(
  prompt: string, 
  files: { data: string; mimeType: string }[],
  budgetPerM2: number = 0
): Promise<SpektrResult> {
  const model = "gemini-3.1-pro-preview"; // Best for complex architectural reasoning

  const fileParts = files.map(f => ({
    inlineData: {
      data: f.data.split(',')[1] || f.data,
      mimeType: f.mimeType
    }
  }));

  const userPrompt = `
    Contexto Adicional del Usuario: "${prompt}"
    Presupuesto base por m2: ${budgetPerM2} MXN
    
    Analiza la información proporcionada (archivos y texto) para generar el expediente técnico SPEKTR.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        ...fileParts,
        { text: userPrompt }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || '{}') as SpektrResult;
  } catch (error) {
    console.error("SPEKTR Engine Error:", error);
    throw error;
  }
}
