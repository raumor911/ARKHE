export type MediaType = 'Humano' | 'Económico' | 'Físico' | 'Climático' | 'Tecnológico' | 'Jurídico';

export interface Sociogram {
  causa: string;
  efecto: string;
  objetivo: string;
}

export interface SystemNode {
  id: string;
  code: string;       // E.g., "D1.1.2"
  level: 'D0' | 'D1' | 'D2' | 'D3'; 
  type: 'Sistema' | 'Subsistema' | 'Componente' | 'Local';
  name: string;
  calculated_m2?: number;
  requirements?: {
    r1_funcional: string;
    r2_espacial: string;
    r3_tecnico: string;
    r4_psicologico: string;
    r5_flexibilidad: string;
  };
  children?: SystemNode[]; // Support for real tree structure
}

export interface InteractionRelation {
  from: string;
  to: string;
  clase: 'A' | 'E' | 'I' | 'O' | 'U' | 'X'; // Muther proximity
  razon: string;
}

export type MediumImportance = 'Imprescindible' | 'Conveniente' | 'Accesoria';

export interface MediumDetail {
  description: string;
  importance: MediumImportance;
  rg: string; // Requerimiento General (RG) derived from this medium
}

export interface SpatialBlock {
  id: string;
  name: string;
  zone: 'Privado' | 'Social' | 'Servicio';
  x: number; // 0-100 normalization
  y: number; // 0-100 normalization
  w: number; 
  h: number;
}

export interface SpektrResult {
  sociograma: Sociogram;
  medios: Record<MediaType, MediumDetail>;
  system_tree: SystemNode[];
  interaction_matrix: InteractionRelation[];
  spatial_layout?: SpatialBlock[];
  budget_validation: {
    total_m2: number;
    budget_m2: number;          // Can be 0 for estimation mode
    input_budget?: number;       // Presupuesto ingresado por el usuario
    estimated_investment?: {     // Proyección calculada por AXON
      min: number;
      max: number;
      avg_per_m2: number;
      confidence: string;        // E.g., "Alta"
    };
    deviation: number;
    alert: boolean;
    recommendation: string;
  };
  normative_confidence_score: number; // 0.0 - 1.0 precision score
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  budget_per_m2?: number;
  createdAt: string;
  analysis?: SpektrResult;
  history?: ChatMessage[]; // Persist Gemini chat history
  files: {
    name: string;
    type: string;
    data: string; // base64
  }[];
}
