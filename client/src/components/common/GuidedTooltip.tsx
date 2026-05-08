import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface GuidedTooltipProps {
  text: string;
  children?: React.ReactNode;
  className?: string;
  variant?: 'indigo' | 'purple' | 'slate';
}

const GuidedTooltip: React.FC<GuidedTooltipProps> = ({ 
  text, 
  children, 
  className,
  variant = 'slate'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={cn("relative inline-flex items-center gap-1.5 group", className)}>
      {children}
      <div 
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help text-slate-500 hover:text-white transition-colors"
      >
        <HelpCircle size={14} />
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className={cn(
              "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest leading-relaxed z-[100] shadow-2xl border backdrop-blur-xl",
              variant === 'indigo' && "bg-[var(--primary)]/90 border-[var(--primary-light)]/20 text-white",
              variant === 'purple' && "bg-[var(--growth)]/90 border-[var(--growth-light)]/20 text-white",
              variant === 'slate' && "bg-slate-900/90 border-white/10 text-slate-300"
            )}
          >
            {text}
            <div className={cn(
              "absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent",
              variant === 'indigo' && "border-t-[var(--primary)]/90",
              variant === 'purple' && "border-t-[var(--growth)]/90",
              variant === 'slate' && "border-t-slate-900/90"
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GuidedTooltip;
