import { useState, useCallback, useEffect } from 'react';
import { SpatialBlock, InteractionRelation } from '../types';

interface BoundingBox {
  width: number;
  height: number;
}

export const useZoning = (
  initialLayout: SpatialBlock[],
  interactions: InteractionRelation[],
  boundingBox: BoundingBox = { width: 100, height: 100 }
) => {
  const [layout, setLayout] = useState<SpatialBlock[]>(initialLayout);

  const ATTRACCION_A = 0.15;
  const ATTRACCION_E = 0.08;
  const REPULSION_X = 0.2;
  const FRICTION = 0.85;

  useEffect(() => {
    setLayout(initialLayout);
  }, [initialLayout]);

  const updatePhysics = useCallback(() => {
    setLayout(prev => {
      const next = prev.map(block => ({ 
        ...block, 
        vx: 0, 
        vy: 0 
      })) as (SpatialBlock & { vx: number, vy: number })[];

      // Apply Mutual Forces
      for (let i = 0; i < next.length; i++) {
        for (let j = i + 1; j < next.length; j++) {
          const b1 = next[i];
          const b2 = next[j];
          
          // Check for interaction
          const interaction = interactions.find(rel => 
            (rel.from === b1.name && rel.to === b2.name) ||
            (rel.from === b2.name && rel.to === b1.name)
          );

          if (!interaction) continue;

          const dx = (b2.x + b2.w/2) - (b1.x + b1.w/2);
          const dy = (b2.y + b2.h/2) - (b1.y + b1.h/2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = 0;

          if (interaction.clase === 'A') {
             const targetDist = (b1.w + b2.w) / 4;
             const diff = dist - targetDist;
             const f = diff * ATTRACCION_A;
             b1.vx += (dx / dist) * f;
             b1.vy += (dy / dist) * f;
             b2.vx -= (dx / dist) * f;
             b2.vy -= (dy / dist) * f;
          } else if (interaction.clase === 'X') {
             const minSafeDist = (b1.w + b2.w);
             if (dist < minSafeDist) {
                const diff = minSafeDist - dist;
                const f = diff * REPULSION_X;
                b1.vx -= (dx / dist) * f;
                b1.vy -= (dy / dist) * f;
                b2.vx += (dx / dist) * f;
                b2.vy += (dy / dist) * f;
             }
          }
        }
      }

      // Apply Collision Avoidance (Pseudo-overlap avoidance)
      for (let i = 0; i < next.length; i++) {
        for (let j = 0; j < next.length; j++) {
           if (i === j) continue;
           const b1 = next[i];
           const b2 = next[j];
           
           const overlapX = Math.max(0, Math.min(b1.x + b1.w, b2.x + b2.w) - Math.max(b1.x, b2.x));
           const overlapY = Math.max(0, Math.min(b1.y + b1.h, b2.y + b2.h) - Math.max(b1.y, b2.y));

           if (overlapX > 0 && overlapY > 0) {
              const dx = (b1.x + b1.w/2) - (b2.x + b2.w/2);
              const dy = (b1.y + b1.h/2) - (b2.y + b2.h/2);
              if (overlapX < overlapY) {
                 b1.vx += (dx > 0 ? 1 : -1) * overlapX * 0.1;
              } else {
                 b1.vy += (dy > 0 ? 1 : -1) * overlapY * 0.1;
              }
           }
        }
      }

      // Step and Clamp to Bounding Box
      return next.map(block => {
        if (block.isLocked) return block;

        let nx = block.x + block.vx * FRICTION;
        let ny = block.y + block.vy * FRICTION;

        // Bounding Box Constraints
        if (nx < 2) nx = 2;
        if (ny < 2) ny = 2;
        if (nx + block.w > boundingBox.width - 2) nx = boundingBox.width - block.w - 2;
        if (ny + block.h > boundingBox.height - 2) ny = boundingBox.height - block.h - 2;

        return { ...block, x: nx, y: ny };
      });
    });
  }, [interactions, boundingBox.width, boundingBox.height]);

  useEffect(() => {
    let frameId: number;
    const run = () => {
      updatePhysics();
      frameId = requestAnimationFrame(run);
    };
    frameId = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frameId);
  }, [updatePhysics]);

  const setBlockPosition = (id: string, x: number, y: number) => {
    setLayout(prev => prev.map(b => b.id === id ? { ...b, x, y, isLocked: true } : b));
  };

  const unlockBlock = (id: string) => {
    setLayout(prev => prev.map(b => b.id === id ? { ...b, isLocked: false } : b));
  };

  const getAdherenceAlerts = useCallback(() => {
     const alerts: string[] = [];
     interactions.forEach(rel => {
        if (rel.clase === 'A') {
           const b1 = layout.find(b => b.name === rel.from);
           const b2 = layout.find(b => b.name === rel.to);
           if (b1 && b2) {
              const dx = (b2.x + b2.w/2) - (b1.x + b1.w/2);
              const dy = (b2.y + b2.h/2) - (b1.y + b1.h/2);
              const dist = Math.sqrt(dx * dx + dy * dy);
              const targetDist = (b1.w + b2.w); // Tolerance threshold
              if (dist > targetDist * 1.5) {
                 alerts.push(`Desviación Crítica: ${rel.from} y ${rel.to} deben ser adyacentes.`);
              }
           }
        }
     });
     return alerts;
  }, [layout, interactions]);

  return { layout, setBlockPosition, unlockBlock, coherenceAlerts: getAdherenceAlerts() };
};
