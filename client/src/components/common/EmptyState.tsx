import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Rocket } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  variant?: 'indigo' | 'purple' | 'slate';
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  icon: Icon = Rocket, 
  action, 
  variant = 'indigo',
  className 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "glass p-16 md:p-24 text-center border-white/[0.05] rounded-[3rem] relative overflow-hidden bg-[#0d1225]/40 backdrop-blur-3xl",
        className
      )}
    >
      <div className="absolute top-0 right-0 p-16 opacity-[0.03] rotate-12">
        <Icon size={240} className={cn(
          variant === 'indigo' && "text-[var(--primary)]",
          variant === 'purple' && "text-[var(--growth)]",
          variant === 'slate' && "text-slate-400"
        )} />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto">
        <div className={cn(
          "w-20 h-20 rounded-3xl mb-8 flex items-center justify-center border-2 transition-all shadow-2xl",
          variant === 'indigo' && "bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary-light)] shadow-[var(--primary)]/20",
          variant === 'purple' && "bg-[var(--growth)]/10 border-[var(--growth)]/20 text-[var(--growth-light)] shadow-[var(--growth)]/20",
          variant === 'slate' && "bg-white/5 border-white/10 text-slate-400 shadow-black/50"
        )}>
          <Icon size={32} strokeWidth={2.5} />
        </div>

        <h2 className="text-2xl font-black text-white mb-4 font-display uppercase tracking-tight tracking-widest">
          {title}
        </h2>
        
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 leading-relaxed mb-12">
          {description}
        </p>

        {action && (
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={action.onClick}
            className={cn(
              "px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-4 shadow-2xl transition-all border group",
              variant === 'indigo' && "bg-[var(--primary)] text-white border-[var(--primary-light)]/20 shadow-[var(--primary)]/40",
              variant === 'purple' && "bg-[var(--growth)] text-white border-[var(--growth-light)]/20 shadow-[var(--growth)]/40",
              variant === 'slate' && "bg-white text-black border-white shadow-white/10"
            )}
          >
            {action.icon && <action.icon size={18} className="group-hover:rotate-12 transition-transform" />}
            {action.label}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default EmptyState;
