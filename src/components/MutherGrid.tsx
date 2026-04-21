import React from 'react';
import { InteractionRelation, SystemNode } from '../types';
import { cn } from '../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface MutherGridProps {
  nodes: SystemNode[];
  interactions: InteractionRelation[];
}

export const MutherGrid: React.FC<MutherGridProps> = ({ nodes, interactions }) => {
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
                  if (i === j) return <td key={colNode.id} className="border border-line bg-slate-200" />;
                  if (j < i) return <td key={colNode.id} className="border border-line bg-slate-50/50" />;
                  
                  const clase = getClase(rowNode.id, colNode.id);
                  const razon = getRazon(rowNode.id, colNode.id);

                  return (
                    <Tooltip key={colNode.id}>
                      <TooltipTrigger asChild>
                        <td className={cn(
                          "border border-line text-center font-black cursor-help transition-colors hover:brightness-90",
                          colorMap[clase]
                        )}>
                          {clase}
                        </td>
                      </TooltipTrigger>
                      <TooltipContent className="bg-navy text-white text-[10px] p-2 rounded-none border-accent border">
                        <div className="font-black uppercase mb-1">{rowNode.name} ↔ {colNode.name}</div>
                        <div className="text-accent uppercase font-black tracking-widest text-[8px] mb-2">Clase {clase}</div>
                        <div className="italic opacity-80">"{razon}"</div>
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
