import React from 'react';
import { Layers } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon' | 'monochrome';
  className?: string;
  size?: number;
  isAnalyzing?: boolean;
}

export const ArkheLogo: React.FC<LogoProps> = ({ 
  variant = 'full', 
  className, 
  size = 40,
  isAnalyzing = false 
}) => {
  return (
    <div className={cn("flex items-center gap-3 select-none transition-all duration-500", className)}>
      {/* SÍMBOLO: Escultura Paramétrica + Red Neuronal */}
      <div 
        className={cn(
          "relative flex items-center justify-center transition-all duration-500",
          isAnalyzing && "ring-2 ring-[#00E0FF] ring-offset-2 ring-offset-bg rounded-xl"
        )}
        style={{ width: size, height: size }}
      >
        <img 
          src="/branding/logo.png" 
          alt="ARKHÉ Icon" 
          className={cn(
            "w-full h-full object-contain transform transition-transform duration-700",
            isAnalyzing ? "scale-110" : "hover:scale-105"
          )}
          onError={(e) => {
            // Fallback to a styled div if image fails
            e.currentTarget.style.display = 'none';
          }}
          referrerPolicy="no-referrer"
        />
        {/* CSS Fallback Symbol (Visible if image fails) */}
        <div className="absolute inset-0 flex items-center justify-center -z-10">
          <Layers size={size * 0.6} className="text-[#00E0FF] opacity-40 animate-pulse" />
        </div>
        
        {/* Scanning Line Effect during analysis */}
        {isAnalyzing && (
          <div className="absolute inset-x-0 h-[2px] bg-[#00E0FF] shadow-[0_0_15px_#00E0FF] animate-scan z-10" />
        )}
      </div>

      {/* TEXTO: Tipografía ARKHÉ */}
      {variant === 'full' && (
        <div className="flex flex-col">
          <span className={cn(
            "text-xl font-black tracking-[-0.05em] text-[#002F56] leading-none transition-colors",
            isAnalyzing && "text-[#00E0FF]"
          )}>
            ARKHÉ
          </span>
          <span className="text-[7px] font-mono font-bold text-[#007080] uppercase tracking-[0.25em] opacity-70 mt-1.5">
            AI ARCHITECTURAL SYSTEMS // INNOVATION LAB
          </span>
        </div>
      )}
    </div>
  );
};
