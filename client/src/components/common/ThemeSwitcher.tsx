/**
 * ThemeSwitcher — Phase F/E Enterprise Theme System
 *
 * A premium floating theme picker that lets users switch between all 5 design themes.
 * Opens as a popover from the Sidebar footer.
 * Persists selection to localStorage and optionally to the backend.
 */
import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, THEMES, type ThemeName } from '../../context/ThemeContext';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { cn } from '../../utils/cn';

// Visual preview swatches for each theme
const THEME_SWATCHES: Record<ThemeName, { bg: string; accent: string; text: string }> = {
  'premium-monolith': { bg: '#020617', accent: '#6366f1', text: '#f8fafc' },
  'premium-canvas': { bg: '#ffffff', accent: '#6366f1', text: '#0f172a' },
  'premium-aero': { bg: '#f8fafc', accent: '#10b981', text: '#0f172a' },
};

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:text-white transition-all"
        title="Change Theme"
      >
        <Palette size={16} className="text-[var(--primary-light)]" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute bottom-full left-0 mb-3 z-[90] w-56 rounded-[1.5rem] overflow-hidden"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--card-shadow)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="px-4 pt-4 pb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  UI Theme
                </p>
              </div>

              <div className="px-3 pb-3 space-y-1">
                {THEMES.map((t) => {
                  const swatch = THEME_SWATCHES[t.id];
                  const isActive = theme === t.id;

                  return (
                    <motion.button
                      key={t.id}
                      whileHover={{ x: 4 }}
                      onClick={async () => { 
                        setTheme(t.id); 
                        setOpen(false); 
                        try {
                          await api.put('/settings', { themePreset: t.id });
                        } catch (err) {
                          console.error('Failed to persist theme choice');
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left',
                        isActive ? 'bg-[var(--primary)]/10' : 'hover:bg-white/[0.04]'
                      )}
                    >
                      {/* Color swatch preview */}
                      <div
                        className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden border border-white/10"
                        style={{ background: swatch.bg }}
                      >
                        <div
                          className="absolute inset-0 opacity-60"
                          style={{ background: `linear-gradient(135deg, ${swatch.accent}40, transparent)` }}
                        />
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: swatch.accent }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-xs font-bold leading-none',
                          isActive ? 'text-[var(--primary-light)]' : 'text-[var(--text-secondary)]'
                        )}>
                          {t.emoji} {t.label}
                        </p>
                      </div>

                      {isActive && (
                        <Check size={13} className="text-[var(--primary-light)] flex-shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSwitcher;
