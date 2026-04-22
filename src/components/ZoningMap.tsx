import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, MousePointer2, Info, Compass, Lock, Unlock, RefreshCw, AlertTriangle } from 'lucide-react';
import { SpatialBlock, InteractionRelation } from '../types';
import { useZoning } from '../hooks/useZoning';
import { cn } from '../lib/utils';

interface ZoningMapProps {
  projectId: string; // Añadimos ID para estabilidad
  layout: SpatialBlock[];
  interactions: InteractionRelation[];
  onSelectBlock: (id: string) => void;
  selectedId?: string;
  isEstimationMode?: boolean;
  boundingBox?: { width: number; height: number };
}

export const ZoningMap: React.FC<ZoningMapProps> = ({ 
  projectId,
  layout: initialLayout, 
  interactions, 
  onSelectBlock, 
  selectedId,
  isEstimationMode = false,
  boundingBox = { width: 100, height: 100 }
}) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { layout, setBlockPosition, unlockBlock, coherenceAlerts } = useZoning(initialLayout, interactions, projectId, boundingBox);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(true);
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const colors = {
    Privado: '#002F56', // Azul RAUVIA
    Social: '#00E0FF',  // Cian Eléctrico
    Servicio: '#6B7280', // Gris Técnico
    'Conexión': '#F59E0B' // Ámbar de Enlace
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.altKey || isSpacePressed))) {
      setIsPanning(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    } else if (draggedId && canvasRef.current) {
       const rect = canvasRef.current.getBoundingClientRect();
       
       // FÓRMULA RAUVIA STABLE:
       // (PosiciónMouse - InicioContenedor - DesplazamientoCámara) / EscalaZoom / AnchoReal * 100
       const x = ((e.clientX - rect.left - offset.x) / zoom / rect.width) * 100;
       const y = ((e.clientY - rect.top - offset.y) / zoom / rect.height) * 100;
   
       const block = layout.find(b => b.id === draggedId);
       if (block) {
         // Centrar el bloque en la punta del cursor
         setBlockPosition(draggedId, x - (block.w / 2), y - (block.h / 2));
       }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedId(null);
  };

  const hasAlerts = coherenceAlerts.length > 0;

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5));
      }
    };
    const canvas = canvasRef.current;
    canvas?.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas?.removeEventListener('wheel', handleWheel);
  }, []);

  // Filter primary interactions (A, E) for visual edge rendering
  const primaryInteractions = interactions.filter(rel => rel.clase === 'A' || rel.clase === 'E');

  return (
    <div 
      ref={canvasRef}
      className={cn(
        "relative w-full h-full bg-[#F8F9FA] overflow-hidden cursor-crosshair border border-line select-none",
        isPanning && "cursor-grabbing"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(#002F56 1px, transparent 1px)',
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          transform: `translate(${offset.x}px, ${offset.y}px)`
        }}
      />

      {/* Scale/Compass UI */}
      <div className="absolute top-6 left-6 z-10 space-y-2">
         <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-line p-2 text-[10px] font-black uppercase tracking-widest text-navy">
            <Compass size={14} className="text-accent animate-pulse" />
            Norte Técnico
         </div>
      </div>

      {/* Controls */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
        <button 
          onClick={() => setZoom(prev => Math.min(prev * 1.2, 5))}
          className="w-10 h-10 bg-white border border-line flex items-center justify-center text-navy hover:bg-accent hover:text-white transition-all shadow-lg"
        >
          <ZoomIn size={18} />
        </button>
        <button 
          onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.5))}
          className="w-10 h-10 bg-white border border-line flex items-center justify-center text-navy hover:bg-accent hover:text-white transition-all shadow-lg"
        >
          <ZoomOut size={18} />
        </button>
        <button 
          onClick={() => { 
             setZoom(1); 
             setOffset({ x: 0, y: 0 }); 
             layout.forEach(b => unlockBlock(b.id)); 
          }}
          className="w-10 h-10 bg-white border border-line flex items-center justify-center text-navy hover:bg-accent hover:text-white transition-all shadow-lg"
          title="Reset Physics & Unlock All"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Coherence Alerts Overlay */}
      <AnimatePresence>
        {hasAlerts && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 20 }}
             className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 pointer-events-none"
           >
              {coherenceAlerts.map((alert, i) => (
                <div key={i} className="bg-destructive text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 shadow-2xl flex items-center gap-3 border border-white/20">
                   <AlertTriangle size={14} />
                   {alert}
                </div>
              ))}
           </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas Viewport */}
      <motion.svg 
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: 'center'
        }}
      >
        <defs> 
          <filter id="glow"> 
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" /> 
            <feMerge> 
              <feMergeNode in="coloredBlur" /> 
              <feMergeNode in="SourceGraphic" /> 
            </feMerge> 
          </filter> 
        </defs>

        {/* Adjacency Lines (Edges) */}
        {primaryInteractions.map((rel, i) => {
          const from = layout.find(b => b.id === rel.from);
          const to = layout.find(b => b.id === rel.to);
          if (!from || !to) return null;
          
          return (
            <line 
              key={i}
              x1={from.x + from.w/2} y1={from.y + from.h/2}
              x2={to.x + to.w/2} y2={to.y + to.h/2}
              stroke={rel.clase === 'A' ? "#00E0FF" : "#002F56"}
              strokeWidth="0.5"
              strokeDasharray={rel.clase === 'E' ? "1,1" : "0"}
              opacity="0.3"
            />
          );
        })}

        {/* Spatial Blocks (Nodes) */}
        {layout.map((block) => (
          <g 
            key={block.id}
            onMouseDown={(e) => {
              e.stopPropagation();
              onSelectBlock(block.id);
              if (e.button === 0 && !e.altKey) {
                 setDraggedId(block.id);
              }
            }}
            className="cursor-grab active:cursor-grabbing group"
          >
            <rect 
              x={block.x} y={block.y}
              width={block.w} height={block.h}
              fill={colors[block.zone as keyof typeof colors] || '#6B7280'}
              fillOpacity={selectedId === block.id ? 1 : 0.7}
              stroke={block.isSnapping ? "#00E0FF" : (selectedId === block.id ? "#00E0FF" : "white")}
              strokeWidth={block.isSnapping ? "1.5" : (selectedId === block.id ? "1.5" : "0.5")}
              filter={block.isSnapping ? "url(#glow)" : "none"}
              className="transition-all duration-200"
            />
            
            {/* Capa de Legibilidad: Texto con fondo protector */} 
            <g className="pointer-events-none select-none">
              {/* Placa de datos de alto contraste */} 
              <rect 
                x={block.x + 1} 
                y={block.y + block.h/2 - 2.8} 
                width={block.w - 2} 
                height="5.6" 
                fill="white" 
                fillOpacity="0.9" 
                rx="0.5" 
              />
              <text 
                x={block.x + block.w/2} 
                y={block.y + block.h/2} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                fill="#002F56" 
                fontSize="1.8" 
                fontWeight="900" 
                className="uppercase" 
              > 
                {block.name} 
              </text> 
              <text 
                x={block.x + block.w/2} 
                y={block.y + block.h/2 + 4} 
                textAnchor="middle" 
                fill="#002F56" 
                fillOpacity="0.6" 
                fontSize="1.0" 
                fontWeight="bold" 
              > 
                {Math.round((block.w * block.h) / 100)} m² 
              </text> 
            </g>

            {block.isLocked && (
               <foreignObject x={block.x + block.w - 4} y={block.y + 1} width="4" height="4">
                  <Lock className="text-white opacity-50" size={3} />
               </foreignObject>
            )}
          </g>
        ))}

        {/* Estimation Mode Boundary */}
        {isEstimationMode && (
          <rect 
            x="5" y="5" width="90" height="90"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="0.5"
            strokeDasharray="2,2"
            opacity="0.4"
          />
        )}
      </motion.svg>

      {/* Floating Insight UI */}
      <div className="absolute bottom-6 right-6 flex items-center gap-4">
         <div className="flex gap-4 bg-white/90 backdrop-blur-md border border-line p-3 shadow-xl">
            {Object.entries(colors).map(([zone, color]) => (
              <div key={zone} className="flex items-center gap-2">
                <div className="w-2 h-2" style={{ backgroundColor: color }} />
                <span className="text-[9px] font-black uppercase tracking-tighter text-navy">{zone}</span>
              </div>
            ))}
         </div>
      </div>

      {/* Instructional Overlay */}
      <div className="absolute bottom-6 left-6 text-[8px] font-mono text-muted uppercase tracking-widest bg-white/50 px-2 py-1">
        Wheel + Ctrl: Zoom // Space + Click: Pan // Click + Drag: Mover Local
      </div>
    </div>
  );
};
