import React from 'react';
import { InteractionRelation, SystemNode } from '../types';
import { cn } from '../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Info, Target } from 'lucide-react';

interface MutherGridProps {
  nodes: SystemNode[];
  interactions: InteractionRelation[];
  onUpdateInteraction?: (fromId: string, toId: string, newClase: string) => void;
}

export const MutherGrid: React.FC<MutherGridProps> = ({ nodes, interactions, onUpdateInteraction }) => {
  const flatLocals: SystemNode[] = [];
  const extract = (list: SystemNode[]) => {
    list.forEach(n => {
      if (n.type === 'Local') flatLocals.push(n);
      if (n.children) extract(n.children);
    });
  };
  extract(nodes);

  const getClase = (fromId: string, toId: string) => {
    const rel = interactions.find(r => 
      (r.from === fromId && r.to === toId) || 
      (r.from === toId && r.to === fromId)
    );
    return rel?.clase || 'U';
  };

  const getRazon = (fromId: string, toId: string) => {
    const rel = interactions.find(r => 
      (r.from === fromId && r.to === toId) || 
      (r.from === toId && r.to === fromId)
    );
    return rel?.razon || 'Sin relación específica';
  };

  const colorMap: Record<string, string> = {
    A: 'bg-emerald-500 text-white', // Absoluta
    E: 'bg-emerald-200 text-emerald-900', // Especial
    I: 'bg-blue-100 text-blue-800', // Importante
    O: 'bg-slate-100 text-slate-500', // Ordinaria
    U: 'bg-white text-slate-300', // No importante
    X: 'bg-destructive text-white', // No deseable
  };

  if (flatLocals.length === 0) return null;

  const handleCellClick = (fromId: string, toId: string, currentClase: string) => {
    if (!onUpdateInteraction) return;
    const classes = ['A', 'E', 'I', 'O', 'U', 'X'];
    const currentIndex = classes.indexOf(currentClase);
    const nextIndex = (currentIndex + 1) % classes.length;
    onUpdateInteraction(fromId, toId, classes[nextIndex]);
  };

  return (
    <div className="w-full overflow-auto border border-line bg-surface">
      <TooltipProvider>
        <table className="w-full border-collapse text-[9px] font-mono">
          <thead>
            <tr>
              <th className="p-2 border border-line bg-bg sticky left-0 z-10 w-[120px]">Local / Local</th>
              {flatLocals.map(node => (
                <th key={node.id} className="p-2 border border-line bg-bg min-w-[40px] text-center vertical-text h-[100px]">
                  <div className="rotate-180 [writing-mode:vertical-lr] mx-auto uppercase">
                    {node.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flatLocals.map((rowNode, i) => (
              <tr key={rowNode.id}>
                <td className="p-2 border border-line bg-bg sticky left-0 z-10 font-bold uppercase tracking-tighter truncate max-w-[120px]">
                   {rowNode.name}
                </td>
                {flatLocals.map((colNode, j) => {
                  if (i === j) return (
                    <td key={colNode.id} className="border border-line bg-slate-100 flex items-center justify-center h-full min-h-[40px]">
                      <Target size={12} className="text-navy/20" />
                    </td>
                  );
                  
                  const clase = getClase(rowNode.id, colNode.id);
                  const razon = getRazon(rowNode.id, colNode.id);

                  if (j < i) return (
                    <Tooltip key={colNode.id}>
                      <TooltipTrigger asChild>
                        <td 
                          onClick={() => handleCellClick(rowNode.id, colNode.id, clase)}
                          className={cn(
                            "border border-line bg-slate-50/30 text-center opacity-40 transition-colors hover:bg-slate-100",
                            onUpdateInteraction ? "cursor-pointer" : "cursor-help"
                          )}
                        >
                          <div className="flex items-center justify-center">
                            <span className="text-[7px] font-black">{clase}</span>
                          </div>
                        </td>
                      </TooltipTrigger>
                      <TooltipContent className="bg-navy text-white text-[10px] p-2 rounded-none border-accent border">
                        <div className="font-black uppercase mb-1">Relación Simétrica</div>
                        <div className="text-accent uppercase font-black tracking-widest text-[8px] mb-2">{colNode.name} ↔ {rowNode.name}</div>
                        <div className="italic opacity-80 italic">"Definida en el nodo superior ({clase}). {onUpdateInteraction ? 'Clic para editar ambos.' : ''}"</div>
                      </TooltipContent>
                    </Tooltip>
                  );

                  return (
                    <Tooltip key={colNode.id}>
                      <TooltipTrigger asChild>
                        <td 
                          onClick={() => handleCellClick(rowNode.id, colNode.id, clase)}
                          className={cn(
                            "border border-line text-center font-black transition-colors hover:brightness-90",
                            colorMap[clase],
                            onUpdateInteraction ? "cursor-pointer" : "cursor-help"
                          )}
                        >
                          {clase}
                        </td>
                      </TooltipTrigger>
                      <TooltipContent className="bg-navy text-white text-[10px] p-2 rounded-none border-accent border">
                        <div className="font-black uppercase mb-1">{rowNode.name} ↔ {colNode.name}</div>
                        <div className="text-accent uppercase font-black tracking-widest text-[8px] mb-2">Clase {clase}</div>
                        <div className="italic opacity-80">"{razon}"</div>
                        {onUpdateInteraction && <div className="mt-2 text-accent/50 text-[7px] font-black uppercase tracking-tighter">Clic para iterar clase</div>}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </TooltipProvider>
    </div>
  );
};
