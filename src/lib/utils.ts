import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SystemNode, InteractionRelation } from "../types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateMermaidCode(nodes: SystemNode[], matrix: InteractionRelation[], showReasons: boolean = true): string {
  let code = 'graph TD\n'; // Gráfico de Arriba hacia Abajo (Jerárquico)

  // 1. Definición de Nodos y Estilos
  const extractLocals = (items: SystemNode[]) => {
    items.forEach(node => {
      if (node.type === 'Local') {
        const zoneClass = node.requirements?.r2_espacial?.toLowerCase().includes('privado') ? 'Privado' :
                          node.requirements?.r2_espacial?.toLowerCase().includes('servicio') ? 'Servicio' : 'Social';
        code += `  ${node.id.replace(/-/g, '_')}["${node.name}"]:::${zoneClass}\n`;
      }
      if (node.children) extractLocals(node.children);
    });
  };
  extractLocals(nodes);

  // 2. Definición de Relaciones (Basado en Clase de Muther)
  matrix.forEach(rel => {
    const from = rel.from.replace(/-/g, '_');
    const to = rel.to.replace(/-/g, '_');
    const label = showReasons ? `|"${rel.razon}"|` : '';

    switch (rel.clase) {
      case 'A': // Absoluta
        code += `  ${from} ===${label} ${to}\n`;
        break;
      case 'E': // Especial
        code += `  ${from} ---${label} ${to}\n`;
        break;
      case 'X': // Indeseable
        code += `  ${from} -.-x${label} ${to}\n`;
        break;
      // Las clases I, O, U se pueden omitir o poner en líneas punteadas finas
    }
  });

  // 3. Clases de Estilo (Sincronizadas con D3)
  code += `\n  classDef Social fill:#00E0FF,stroke:#002F56,stroke-width:2px,color:#002F56\n`;
  code += `  classDef Privado fill:#002F56,stroke:#00E0FF,stroke-width:2px,color:#FFFFFF\n`;
  code += `  classDef Servicio fill:#6B7280,stroke:#D1D5DB,stroke-width:2px,color:#FFFFFF\n`;

  return code;
}
