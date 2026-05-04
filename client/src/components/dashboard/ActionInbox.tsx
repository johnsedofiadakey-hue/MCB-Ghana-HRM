import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ArrowRight, Target, Calendar, ClipboardCheck, AlertCircle, Loader2, Users, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { cn } from '../../utils/cn';
import { formatDistanceToNow } from 'date-fns';

import { useTranslation } from 'react-i18next';
import { playNotificationSound, requestNotificationPermission } from '../../services/notification.service';

interface InboxAction {
  id: string;
  type: 'TARGET_ACK' | 'TARGET_REVIEW' | 'APPRAISAL_REVIEW' | 'LEAVE_RELIEF' | 'LEAVE_APPROVE';
  title: string;
  subtitle: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  link: string;
  createdAt: string;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  TARGET_ACK: { icon: Target, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10' },
  TARGET_REVIEW: { icon: Target, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10' },
  APPRAISAL_REVIEW: { icon: ClipboardCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  LEAVE_RELIEF: { icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  LEAVE_APPROVE: { icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

const ActionInbox = () => {
  const { t } = useTranslation();
  const [actions, setActions] = useState<InboxAction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const lastCountRef = useRef(0);
  const fetchInbox = async (shouldSound = false) => {
    try {
      const res = await api.get('/inbox');
      const data = res.data || [];
      
      // If new actions arrived and we are polling, play the ring
      if (shouldSound && data.length > lastCountRef.current) {
        playNotificationSound();
      }
      
      lastCountRef.current = data.length;
      setActions(data);
    } catch (e) {
      console.error('Inbox Fetch Error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestNotificationPermission();
    fetchInbox();
    const interval = setInterval(() => fetchInbox(true), 30000); // Stabilized poll @ 30s for performance
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="nx-card p-8 flex items-center justify-center min-h-[300px]">
      <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
    </div>
  );

  return (
    <div className="nx-card flex flex-col h-full overflow-hidden border-[var(--border-subtle)]">
      <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/20">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="font-display font-black text-[var(--text-primary)] uppercase tracking-tight">{t('inbox.title')}</h3>
            <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest leading-none mt-0.5 animate-pulse">
              {actions.length} {t('inbox.pending')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 max-h-[450px]">
        <AnimatePresence mode="popLayout">
          {actions.length > 0 ? (
            actions.map((action, idx) => {
              const cfg = typeConfig[action.type] || { icon: AlertCircle, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-elevated)]' };
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] hover:border-[var(--primary)]/20 transition-all cursor-pointer"
                  onClick={() => navigate(action.link)}
                >
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", cfg.bg, cfg.color)}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", 
                        action.priority === 'HIGH' ? "text-rose-400 border-rose-500/20 bg-rose-500/5" : "text-[var(--text-muted)] border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                      )}>
                        {action.priority === 'HIGH' ? t('inbox.high_priority') : action.priority === 'MEDIUM' ? t('inbox.medium_priority') : t('inbox.low_priority')}
                      </span>
                      <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">
                        {formatDistanceToNow(new Date(action.createdAt))} {t('inbox.ago')}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-[var(--text-primary)] truncate uppercase tracking-tighter">{action.title}</h4>
                    <p className="text-[10px] font-medium text-[var(--text-secondary)] truncate group-hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest mt-0.5">
                      {action.subtitle}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                    <ArrowRight size={14} className="text-[var(--primary)]" />
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-20 group">
               <CheckCircle size={48} className="mb-4 group-hover:scale-110 transition-transform duration-700 text-[var(--text-primary)]" />
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-primary)]">{t('inbox.all_clear')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
         <button 
           onClick={() => navigate('/notifications')}
           className="w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all"
         >
           {t('inbox.view_all')}
         </button>
      </div>
    </div>
  );
};

export default ActionInbox;
