import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

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
    useMaxWidth: true,
    padding: 20
  }
});

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (containerRef.current) {
        try {
          containerRef.current.innerHTML = '';
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, code);
          containerRef.current.innerHTML = svg;
        } catch (error) {
          console.error('Mermaid render error:', error);
          containerRef.current.innerHTML = `<div class="p-4 text-destructive border border-destructive bg-destructive/10 text-xs font-mono">Error al renderizar diagrama: ${error}</div>`;
        }
      }
    };

    renderDiagram();
  }, [code]);

  return (
    <div 
      ref={containerRef} 
      className="w-full flex justify-center overflow-auto bg-white p-6 border border-line rounded-none"
    />
  );
};
