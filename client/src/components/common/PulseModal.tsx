import React, { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PulseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

const PulseModal = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  icon: Icon, 
  children, 
  footer,
  maxWidth = "max-w-3xl"
}: PulseModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add('modal-lock');
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handleEsc);
    requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])');
      (first || dialogRef.current)?.focus();
    });
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.documentElement.classList.remove('modal-lock');
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-wrapper custom-scrollbar">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[var(--bg-main)]/60 backdrop-blur-md"
          />
          
          <div className="modal-content-container">
            <motion.div 
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "glass w-full bg-[var(--bg-card)]/80 border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl rounded-[2.5rem] relative z-10",
                maxWidth
              )}
            >
              {/* Header */}
              <div className="p-8 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-elevated)]/30">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20 shadow-inner">
                    <Icon className="text-[var(--primary)]" size={28} />
                  </div>
                  <div>
                    <h2 id={titleId} className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase tracking-widest">{title}</h2>
                    {subtitle && <p className="text-[13px] font-bold text-[var(--text-muted)] mt-0.5 opacity-60 uppercase tracking-tighter">{subtitle}</p>}
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  aria-label={`Close ${title}`}
                  className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content Area */}
              <div className="p-8">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PulseModal;
