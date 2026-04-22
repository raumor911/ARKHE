import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  forceSimulation, 
  forceManyBody, 
  forceCenter, 
  forceCollide, 
  forceLink,
  Simulation,
  SimulationNodeDatum
} from 'd3-force';
import { SpatialBlock, InteractionRelation } from '../types';

interface BoundingBox {
  width: number;
  height: number;
}

interface D3Block extends SpatialBlock, SimulationNodeDatum {
  fx?: number | null;
  fy?: number | null;
}

export const useZoning = (
  initialLayout: SpatialBlock[],
  interactions: InteractionRelation[],
  projectId: string, // Añadimos ID para estabilidad
  boundingBox: BoundingBox = { width: 100, height: 100 }
) => {
  const [layout, setLayout] = useState<SpatialBlock[]>(initialLayout);
  const simulationRef = useRef<Simulation<D3Block, undefined> | null>(null);
  const blocksRef = useRef<D3Block[]>(JSON.parse(JSON.stringify(initialLayout)));

  // Inicialización única por proyecto para evitar loops de efecto
  useEffect(() => {
    if (!initialLayout || initialLayout.length === 0) return;

    // Reset blocksRef when project changes
    blocksRef.current = initialLayout.map(b => ({
      ...b,
      x: typeof b.x === 'number' ? b.x : 50,
      y: typeof b.y === 'number' ? b.y : 50,
      vx: 0,
      vy: 0
    }));

    const nodeIds = new Set(blocksRef.current.map(n => n.id));
    const d3Links = (interactions || [])
      .filter(r => (r.clase === 'A' || r.clase === 'E') && nodeIds.has(r.from) && nodeIds.has(r.to))
      .map(r => ({
        source: r.from,
        target: r.to
      }));

    // Setup simulation
    const simulation = forceSimulation<D3Block>(blocksRef.current)
      .force("charge", forceManyBody().strength(-20))
      .force("center", forceCenter(50, 50))
      .force("collide", forceCollide<D3Block>().radius(d => (d.w || 10) / 2 + 3).iterations(3))
      .force("link", forceLink<D3Block, any>(d3Links).id(d => d.id).distance(25))
      .alphaDecay(0.05) // Control de enfriamiento (Evita loop infinito)
      .on("tick", () => {
        // Sync simulation state back to React
        setLayout(blocksRef.current.map(n => ({
          ...n,
          x: n.x || 0,
          y: n.y || 0
        } as SpatialBlock)));
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [projectId]); // SOLO se reinicia si cambia el ID del proyecto

  const setBlockPosition = useCallback((id: string, x: number, y: number) => {
    const node = blocksRef.current.find(n => n.id === id);
    if (node && simulationRef.current) {
      node.fx = x;
      node.fy = y;
      node.isLocked = true;
      simulationRef.current.alpha(0.1).restart();
    }
  }, []);

  const unlockBlock = useCallback((id: string) => {
    const node = blocksRef.current.find(n => n.id === id);
    if (node && simulationRef.current) {
      node.fx = null;
      node.fy = null;
      node.isLocked = false;
      simulationRef.current.alpha(0.3).restart();
    }
  }, []);

  return { 
    layout, 
    setBlockPosition, 
    unlockBlock, 
    coherenceAlerts: [] 
  };
};
