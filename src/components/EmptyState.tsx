import React from 'react';
import { motion } from 'framer-motion';
import { ArkheLogo } from './branding/Logo';
import { Button } from './ui/button';

export function EmptyState({ onStart, isAnalyzing }: { onStart: () => void; isAnalyzing?: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-line bg-surface/30">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center max-w-sm text-center"
      >
        <div className="mb-10 relative">
           <ArkheLogo variant="icon" size={80} isAnalyzing={isAnalyzing} />
           <div className="absolute -inset-4 bg-accent/5 rounded-full blur-2xl animate-pulse -z-10" />
        </div>
        <h3 className="text-xl font-serif italic text-navy mb-2">Motor Lógico Preparado</h3>
        <p className="text-xs text-muted mb-8 uppercase tracking-widest font-medium">
          EL MOTOR LÓGICO ARKHÉ ESTÁ LISTO. INICIE UN NUEVO PROYECTO PARA COMENZAR EL ANÁLISIS SISTÉMICO.
        </p>
        <Button 
          onClick={onStart}
          className="rounded-none bg-navy font-bold text-[10px] px-8 tracking-[.2em] uppercase h-12"
        >
          NUEVO PROYECTO
        </Button>
      </motion.div>
    </div>
  );
}