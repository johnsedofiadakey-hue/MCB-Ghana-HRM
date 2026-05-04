import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, ChevronRight, X, LayoutDashboard, Clock, Calendar, BarChart3, Users, DollarSign, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getStoredUser, getRoleRankValue } from '../../utils/session';
import { useTheme } from '../../context/ThemeContext';

const STORAGE_KEY = 'app_welcome_seen_v2';

const STEPS = [
  {
    icon: LayoutDashboard,
    color: '#6366f1',
    title: 'Your Dashboard',
    body: 'This is your command centre. Everything you need is summarised here — attendance, leave balance, KPI performance, and quick actions.',
    action: null,
  },
  {
    icon: Clock,
    color: '#06b6d4',
    title: 'Clock In Every Day',
    body: 'Go to Attendance in the sidebar and hit "Clock In" when you start. Don\'t forget to Clock Out — missed records affect your pay.',
    action: '/attendance',
  },
  {
    icon: Calendar,
    color: '#f59e0b',
    title: 'Request Time Off Easily',
    body: 'Need a day off? Use the Leave module. Submit your request, choose your dates and type, and it flows through automatic approval.',
    action: '/leave',
  },
  {
    icon: BarChart3,
    color: '#a855f7',
    title: 'Track Your Performance',
    body: 'Your KPI sheet is updated monthly. Log your actual values against targets, and your score is calculated automatically.',
    action: '/performance',
  },
  {
    icon: Users,
    color: '#10b981',
    title: 'The Guide Button',
    body: 'See the "Guide" button at the bottom right of every page? Click it any time for AI-powered help, step-by-step instructions, and role explanations.',
    action: null,
  },
];

const MANAGER_EXTRAS = [
  {
    icon: Users,
    color: '#6366f1',
    title: 'Manage Your Team',
    body: 'The Team Members section lets you view, add, and manage employees. You can approve leave, assign KPIs, and run appraisals.',
    action: '/employees',
  },
  {
    icon: DollarSign,
    color: '#10b981',
    title: 'Payroll & Finance',
    body: 'Directors and above can run payroll, approve loans, and manage expense claims. Enterprise Suite gives you the full management toolkit.',
    action: '/payroll',
  },
  {
    icon: Zap,
    color: '#f43f5e',
    title: 'Enterprise Suite',
    body: 'Recruitment, benefits, tax rules, shifts, and more — all in one place. This is where you configure the deep operational systems.',
    action: '/enterprise',
  },
];

export default function FirstRunWelcome() {
  const { settings } = useTheme();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();
  const rank = getRoleRankValue(user.role);

  const steps = rank >= 70 ? [...STEPS, ...MANAGER_EXTRAS] : STEPS;
  const total = steps.length;
  const current = steps[step];

  useEffect(() => {
    if (location.pathname !== '/dashboard') return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setTimeout(() => setShow(true), 1200);
    }
  }, [location.pathname]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  };

  const next = () => {
    if (step < total - 1) setStep(s => s + 1);
    else dismiss();
  };

  const goToPage = () => {
    if (current.action) {
      navigate(current.action);
      dismiss();
    } else {
      next();
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 200 }}
            className="fixed inset-0 z-[210] flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl overflow-hidden font-sans">
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${current.color}, ${current.color}88)` }} />

              <div className="px-7 pt-6 pb-2 flex justify-between items-start">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-600">
                  <Sparkles size={12} className="text-[var(--primary)]" />
                  Welcome to {settings?.companyName || 'the platform'}
                </div>
                <button onClick={dismiss} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-600 hover:text-white transition-all">
                  <X size={14} />
                </button>
              </div>

              <div className="px-7 py-6">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${current.color}18`, border: `1px solid ${current.color}30` }}>
                    <current.icon size={26} style={{ color: current.color }} />
                  </div>
                  <h3 className="text-xl font-black text-[var(--text-primary)] mb-3 leading-tight uppercase font-display">{current.title}</h3>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed font-medium">{current.body}</p>
                </motion.div>
              </div>

              <div className="px-7 pb-7">
                <div className="flex items-center gap-1.5 mb-5">
                  {steps.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className={cn(
                        'h-1.5 rounded-full transition-all duration-300',
                        i === step ? 'w-6' : 'w-1.5 bg-[var(--border-subtle)]',
                      )}
                      style={i === step ? { background: current.color, width: 24 } : {}}
                    />
                  ))}
                </div>

                <div className="flex gap-3">
                  {current.action && (
                    <button
                      onClick={goToPage}
                      className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
                    >
                      Take me there
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-inverse)] flex items-center justify-center gap-2 transition-all shadow-lg hover:brightness-110"
                    style={{ background: current.color }}
                  >
                    {step < total - 1 ? (
                      <><span>Next</span><ChevronRight size={14} /></>
                    ) : (
                      <span>Let's start</span>
                    )}
                  </button>
                </div>
                <button onClick={dismiss} className="w-full text-center text-[9px] text-[var(--text-muted)] hover:text-[var(--text-primary)] mt-4 transition-all font-black uppercase tracking-widest">
                  Skip tour
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
