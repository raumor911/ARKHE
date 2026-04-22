import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { motion } from 'motion/react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from "@/lib/utils";

interface MermaidDiagramProps {
  code: string;
}

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  securityLevel: 'loose',
  themeVariables: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
  },
  flowchart: {
    useMaxWidth: false, // Desactivamos para que nuestro motor de zoom gestione la escala
    htmlLabels: true,
    padding: 40
  }
});

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvgContent(svg);
        // Reset transform on code change
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } catch (error) {
        console.error('Mermaid render error:', error);
        setSvgContent(`<div class="p-4 text-destructive border border-destructive bg-destructive/10 text-xs font-mono">Error al renderizar diagrama</div>`);
      }
    };

    renderDiagram();
  }, [code]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prev => Math.min(Math.max(prev * delta, 0.2), 3));
    }
  };

  // Touch Handlers for Pinch-to-Zoom (iOS/iPad)
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
      setScale(prev => Math.min(Math.max(prev * delta, 0.2), 3));
      setTouchStartDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartDist(null);
  };

  return (
    <div 
      className={cn(
        "relative w-full h-[600px] bg-white border border-line overflow-hidden cursor-move touch-none transition-all duration-500",
        isFullscreen ? "fixed inset-0 z-[1000] h-screen w-screen" : "w-full h-[600px]"
      )}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Fullscreen Toggle Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-[100]">
        <div className="bg-navy/80 backdrop-blur-md text-white px-3 py-1.5 text-[10px] font-mono border border-white/10">
          ZOOM: {Math.round(scale * 100)}%
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

      <motion.div
        drag
        dragMomentum={false}
        animate={{ scale, x: position.x, y: position.y }}
        onDragEnd={(_, info) => setPosition(prev => ({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }))}
        className="w-full h-full flex items-center justify-center origin-center"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      
      {/* Zoom Indicator Overlay */}
      <div className="absolute bottom-4 left-4 bg-navy/80 backdrop-blur-md text-white px-3 py-1.5 text-[10px] font-mono rounded-none border border-white/10 z-10 pointer-events-none">
        SPEKTR_MERMAID_ENGINE // {isFullscreen ? 'FULL_IMMERSION' : 'CTRL + SCROLL TO ZOOM'}
      </div>
    </div>
  );
};
