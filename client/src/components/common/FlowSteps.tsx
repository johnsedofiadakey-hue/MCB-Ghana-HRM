import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Step {
  id: number;
  label: string;
  description?: string;
}

interface FlowStepsProps {
  steps: Step[];
  currentStep: number;
  variant?: 'indigo' | 'purple';
  className?: string;
}

const FlowSteps: React.FC<FlowStepsProps> = ({ 
  steps, 
  currentStep, 
  variant = 'indigo',
  className 
}) => {
  return (
    <div className={cn("w-full max-w-4xl mx-auto mb-16 px-4", className)}>
      <div className="relative flex justify-between">
        {/* Connector Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0" />
        
        {/* Active Progress Line */}
        <motion.div 
          className={cn(
            "absolute top-1/2 left-0 h-0.5 z-0 -translate-y-1/2",
            variant === 'indigo' ? "bg-[var(--primary)] shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "bg-[var(--growth)] shadow-[0_0_15px_rgba(168,85,247,0.5)]"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />

        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-500",
                  isCompleted && (variant === 'indigo' ? "bg-[var(--primary)] border-[var(--primary)] text-white" : "bg-[var(--growth)] border-[var(--growth)] text-white"),
                  isActive && (variant === 'indigo' ? "bg-black border-[var(--primary-light)] text-[var(--primary-light)] shadow-2xl shadow-[var(--primary)]/30" : "bg-black border-[var(--growth-light)] text-[var(--growth-light)] shadow-2xl shadow-[var(--growth)]/30"),
                  !isCompleted && !isActive && "bg-black border-white/5 text-slate-700"
                )}
              >
                {isCompleted ? <CheckCircle2 size={18} /> : isActive ? <span className="text-xs font-black">{step.id}</span> : <Circle size={10} />}
              </motion.div>
              
              <div className="absolute top-14 text-center w-32 translate-x-0">
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest mb-1 transition-colors duration-500",
                  isActive ? "text-white" : "text-slate-600 group-hover:text-slate-400"
                )}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-[8px] font-bold text-slate-700 uppercase tracking-tight leading-tight hidden md:block">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FlowSteps;
