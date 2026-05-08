import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  variant?: 'indigo' | 'purple' | 'emerald';
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

const variants = {
  indigo: 'decoration-[var(--primary)] text-[var(--primary-light)] border-[var(--primary)]/20 shadow-[var(--primary)]/10',
  purple: 'decoration-[var(--growth)] text-[var(--growth-light)] border-[var(--growth)]/20 shadow-[var(--growth)]/10',
  emerald: 'decoration-emerald-500 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10',
};

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  icon: Icon, 
  variant = 'indigo',
  action,
  className
}) => {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 pb-10 border-b border-[var(--border-subtle)] relative overflow-hidden", className)}>
      {/* Background Accent Glow */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--primary)]/5 blur-3xl rounded-full pointer-events-none" />
      
      <div className="space-y-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-5"
        >
          {Icon && (
            <div className={cn(
               "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 glass shadow-xl shadow-[var(--primary)]/5",
               variant === 'indigo' && "text-[var(--primary)]",
               variant === 'purple' && "text-[var(--accent)]",
               variant === 'emerald' && "text-emerald-500"
            )}>
              <Icon size={28} />
            </div>
          )}
          <h1 className="text-4xl font-black text-[var(--text-primary)] font-display tracking-tight">
            {title}
          </h1>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-[13px] font-bold text-[var(--text-secondary)] max-w-2xl leading-relaxed uppercase tracking-[0.2em] opacity-60"
        >
          {description}
        </motion.p>
      </div>

      {action && (
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className={cn(
            "px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-2xl transition-all border",
            variant === 'indigo' && "bg-[var(--primary)] text-[var(--text-inverse)] border-[var(--primary-light)]/20 shadow-[var(--primary)]/30",
            variant === 'purple' && "bg-[var(--growth)] text-[var(--text-inverse)] border-[var(--growth-light)]/20 shadow-[var(--growth)]/30",
            variant === 'emerald' && "bg-emerald-600 text-[var(--text-inverse)] border-emerald-400/20 shadow-emerald-600/30"
          )}
        >
          {action.icon && <action.icon size={16} />}
          {action.label}
        </motion.button>
      )}
    </div>
  );
};

export default PageHeader;
