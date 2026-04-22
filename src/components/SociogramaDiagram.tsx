import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  ChevronDown, 
  CheckCircle2, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SociogramaDiagramProps {
  data: {
    causa: string;
    objetivo: string;
    efecto: string;
  };
}

export const SociogramaDiagram: React.FC<SociogramaDiagramProps> = ({ data }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(Math.max(prev * delta, 0.2), 3));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setTouchStartDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist !== null) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const delta = dist / touchStartDist;
      setZoom(prev => Math.min(Math.max(prev * delta, 0.2), 3));
      setTouchStartDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartDist(null);
  };

  return (
    <div className={cn(
      "relative border-2 border-line rounded-2xl bg-slate-50 transition-all duration-500 shadow-inner group/socio overflow-hidden",
      isFullscreen ? "fixed inset-0 z-[1000] rounded-none h-screen w-screen bg-bg" : "w-full h-[600px]"
    )}
    onWheel={handleWheel}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
    >
      {/* Fullscreen Toggle Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-[100]">
        <div className="bg-navy/80 backdrop-blur-md text-white px-3 py-1.5 text-[10px] font-mono border border-white/10">
          ZOOM: {Math.round(zoom * 100)}%
        </div>
        <button 
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-3 bg-white/90 backdrop-blur-md border border-line shadow-2xl hover:bg-navy hover:text-white transition-all group/expand active:scale-95"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 size={20} className="group-hover/expand:rotate-180 transition-transform duration-500" />
          ) : (
            <Maximize2 size={20} className="group-hover/expand:scale-110 transition-transform" />
          )}
        </button>
      </div>

      <div className="absolute top-4 left-4 text-[8px] font-mono text-muted uppercase z-10 transition-opacity group-hover/socio:opacity-100 opacity-50">
        SPEKTR_TRACE_ENGINE // {isFullscreen ? 'FULL_IMMERSION_MODE' : 'Canvas Mode v2.0'}
      </div>
      
      <div className="h-full w-full cursor-grab active:cursor-grabbing overflow-hidden relative touch-none flex items-center justify-center">
        <motion.div 
          drag
          dragMomentum={false}
          animate={{ scale: zoom, x: position.x, y: position.y }}
          onDragEnd={(_, info) => setPosition(prev => ({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }))}
          className="p-12 flex flex-col items-center relative w-full min-w-[1000px] origin-center"
          style={{ 
            backgroundImage: 'radial-gradient(var(--navy) 0.5px, transparent 0.5px)',
            backgroundSize: '32px 32px',
            backgroundColor: 'rgba(248, 250, 252, 0.8)'
          }}
        >
          {/* Logic Map Header */}
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-4 border-navy text-navy bg-white uppercase tracking-[0.4em] text-[10px] px-4 py-1.5 font-black shrink-0">
              System Intelligence // SPEKTR_TRACE
            </Badge>
            <h2 className="text-2xl font-black text-navy uppercase tracking-tighter">
              LOGIC TRACE MAP <span className="text-navy/20">v3.0</span>
            </h2>
            <div className="mt-4 h-1 w-12 bg-accent mx-auto" />
          </div>

          <div className="relative flex flex-col items-center gap-4 w-full">
            {/* 01. Entrada Sistémica (Causa) - Reduced size by ~20% (380px -> 300px) */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5, borderColor: 'var(--accent)' }}
              className="max-w-[300px] w-full p-6 border-2 border-line bg-white flex flex-col gap-4 group transition-all hover:shadow-[0_20px_40px_rgba(0,112,112,0.08)] cursor-help relative"
            >
              <div className="absolute -left-1.5 top-6 w-1 h-12 bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Input // Raíz Sistémica</span>
                  <span className="text-[8px] font-mono text-muted uppercase">Origen: Stratos Engine</span>
                </div>
                <Activity size={16} className="text-accent/30 group-hover:text-accent transition-colors" />
              </div>
              <p className="text-xs text-navy font-bold leading-relaxed italic text-center">
                "{data.causa}"
              </p>
            </motion.div>

            {/* Vector de Trazabilidad Connector */}
            <div className="h-10 w-[2px] bg-navy/10 relative flex flex-col items-center">
              <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-accent animate-ping" />
                <span className="whitespace-nowrap text-[7px] font-black uppercase tracking-[0.2em] text-accent bg-bg px-2">Vector de Trazabilidad</span>
              </div>
              <ChevronDown className="absolute -bottom-3 text-navy/20" size={20} />
            </div>

            {/* 02. Objetivo Central - Reduced size by ~20% (320px -> 250px) */}
            <div className="relative group/core w-full flex justify-center">
              <div className="absolute -inset-4 bg-accent/10 rounded-none blur-2xl opacity-0 group-hover/core:opacity-100 transition-opacity duration-700"></div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="relative max-w-[250px] w-full p-6 bg-white border-4 border-navy shadow-[8px_8px_0px_0px_rgba(0,47,86,0.1)] text-center cursor-pointer mx-auto"
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-navy text-[8px] px-3 py-1 text-white font-black tracking-[0.3em] uppercase shadow-xl whitespace-nowrap">
                  OBJETIVO_ESTRATÉGICO
                </span>
                <p className="text-sm font-black leading-tight text-navy uppercase">
                  {data.objetivo}
                </p>
              </motion.div>
            </div>

            {/* Resultado Esperado Connector */}
            <div className="h-10 w-[2px] bg-navy/10 relative flex flex-col items-center">
              <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-navy/30 animate-pulse" />
                <span className="whitespace-nowrap text-[7px] font-black uppercase tracking-[0.2em] text-muted bg-bg px-2">Resultado Esperado</span>
              </div>
              <ChevronDown className="absolute -bottom-3 text-navy/20" size={20} />
            </div>

            {/* 03. Impacto Final (Efecto) - Reduced size by ~20% (380px -> 300px) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: 5, borderColor: 'var(--navy)' }}
              className="max-w-[300px] w-full p-6 border-2 border-line bg-white flex flex-col gap-4 group transition-all hover:shadow-[0_20px_40px_rgba(0,65,106,0.08)] cursor-help relative"
            >
              <div className="absolute -right-1.5 top-6 w-1 h-12 bg-navy opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-navy/40 uppercase tracking-widest mb-1 group-hover:text-navy transition-colors">Output // Impacto Final</span>
                  <span className="text-[8px] font-mono text-muted uppercase">Destino: Axon Logic</span>
                </div>
                <CheckCircle2 size={16} className="text-navy/10 group-hover:text-navy transition-colors" />
              </div>
              <p className="text-xs text-navy font-bold leading-relaxed italic text-center">
                "{data.efecto}"
              </p>
            </motion.div>

            {/* Tertiary Co-Stakeholder Tier */}
            <div className="w-full space-y-8 mt-8">
              <div className="flex items-center gap-6">
                <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-line to-transparent" />
                <span className="text-[8px] font-black text-muted/50 uppercase tracking-[0.3em] shrink-0">Peripheral System Stakeholders</span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-line to-transparent" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { l: 'GOBIERNO', s: 'REGULACIÓN JURÍDICA', d: 'Normativa ISO/Local Architectural' },
                  { l: 'USUARIO', s: 'EXPERIENCIA HUMANA', d: 'Factor Antropométrico & Percepción' },
                  { l: 'SITIO', s: 'CONDICIONES CLIMÁTICAS', d: 'Impacto Ambiental & Regenerativo' }
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ y: -5, borderColor: 'var(--accent)', backgroundColor: 'rgba(255,255,255,0.8)' }}
                    className="p-6 border-2 border-dashed border-line bg-white text-center transition-all cursor-crosshair shadow-sm hover:shadow-lg flex flex-col items-center gap-1"
                  >
                    <div className="text-[8px] font-black text-accent/60 mb-1 tracking-[0.2em] uppercase">{item.l}</div>
                    <div className="text-[12px] font-black text-navy tracking-tight">{item.s}</div>
                    <div className="mt-1 text-[8px] font-mono text-muted uppercase tracking-tighter opacity-70 italic leading-snug">{item.d}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* UI OVERLAY */}
      <div className="absolute bottom-6 right-6 pointer-events-none flex flex-col items-end gap-3 z-20">
        <div className="bg-white/90 backdrop-blur-xl border-2 border-navy/10 p-3 rounded-xl shadow-2xl flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-navy uppercase tracking-widest">MODE: INTERACTIVE_CANVAS</span>
            <span className="text-[7px] font-mono text-accent uppercase">ENGINE_DPI: ADAPTIVE // SCALE: {Math.round(zoom * 100)}%</span>
          </div>
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(0,112,112,0.5)]" />
        </div>
      </div>
    </div>
  );
}; 
