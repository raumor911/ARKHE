export type MediaType = 'Humano' | 'Económico' | 'Físico' | 'Climático' | 'Tecnológico' | 'Jurídico';

export interface Sociogram {
  causa: string;
  efecto: string;
  objetivo: string;
}

export interface SystemNode {
  id: string;
  local: string;
  subsistema: string;
  m2_estimado: number;
  requerimientos: {
    r1: string; // Ubicación
    r2: string; // Función
    r3: string; // Construcción
    r4: string; // Percepción
    r5: string; // Desarrollo
  };
}

export interface InteractionRelation {
  from: string;
  to: string;
  clase: 'A' | 'E' | 'I' | 'O' | 'U' | 'X'; // Muther proximity
  razon: string;
}

export interface SpektrResult {
  sociograma: Sociogram;
  medios: Record<MediaType, string>;
  system_tree: SystemNode[];
  interaction_matrix: InteractionRelation[];
  budget_validation: {
    total_m2: number;
    budget_m2: number;
    deviation: number;
    alert: boolean;
    recommendation: string;
  };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  budget_per_m2?: number;
  createdAt: string;
  analysis?: SpektrResult;
  files: {
    name: string;
    type: string;
    data: string; // base64
  }[];
}
