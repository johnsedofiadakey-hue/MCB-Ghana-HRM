import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Target, Clock, ChevronRight, CheckCircle2, 
  TrendingUp, ClipboardCheck, AlertCircle, Award, Zap, ArrowRight, Shield, Activity, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import ActionInbox from '../../components/dashboard/ActionInbox';
import { useTranslation } from 'react-i18next';
// Removed User type import to resolve build conflict


const ManagerDashboard = () => {
  const { t } = useTranslation();
  const user = getStoredUser() as any;
  const [stats, setStats] = useState({ teamSize: 0, pendingReviews: 0, teamPerf: 88, openLeaves: 0 });
  const [loading, setLoading] = useState(true);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');

  useEffect(() => {
    api.get('/analytics/executive')
      .then(res => setStats({
        teamSize: Number(res.data?.totalEmployees) || 0,
        pendingReviews: Number(res.data?.pendingTasks) || 0,
        teamPerf: Number(res.data?.teamPerf) || 0,
        openLeaves: Number(res.data?.activeLeaves) || 0,
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cardStats = [
    { label: t('manager_dashboard.team_members'), value: stats.teamSize || '0', icon: Users, color: 'var(--primary)', delay: 0.1 },
    { label: t('manager_dashboard.pending_reviews'), value: stats.pendingReviews || '0', icon: ClipboardCheck, color: 'var(--warning)', delay: 0.2 },
    { label: t('manager_dashboard.team_performance'), value: `${Number(stats.teamPerf || 0).toFixed(1)}%`, icon: CheckCircle2, color: 'var(--success)', delay: 0.3 },
    { label: t('manager_dashboard.open_leave_req'), value: stats.openLeaves || '0', icon: Clock, color: 'var(--info)', delay: 0.4 },
  ];

  return (
    <div className="relative space-y-12 pb-20 max-w-[1700px] mx-auto page-enter">
      {/* Background Decorative Elements */}
      <div className="bg-glow-radial -top-40 -left-40 opacity-40" />
      <div className="bg-glow-radial bottom-0 -right-40" style={{ background: 'radial-gradient(circle, rgba(var(--accent-rgb), 0.1) 0%, transparent 70%)' }} />

      {/* Identity Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-3 mb-4">
             <div className="px-4 py-1.5 rounded-full premium-glass border-glow-premium text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl">
                <Shield size={14} className="animate-pulse text-[var(--primary)]" /> 
                {t('common.management')} {t('dashboard.intelligence')}
             </div>
             <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-2 h-2 rounded-full bg-[var(--success)] shadow-[0_0_12px_var(--success)]" />
             <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">{greeting}</span>
          </div>
          <h1 className="font-black text-fluid-h1 text-[var(--text-primary)] tracking-ultra leading-[0.9]">
            {user.fullName?.split(' ')[0] || 'Manager'} <span className="text-[var(--text-muted)] font-extralight block lg:inline lg:ml-2">/ {t('manager_dashboard.title')}</span>
          </h1>
          <p className="text-lg font-medium mt-6 text-[var(--text-secondary)] max-w-2xl leading-relaxed opacity-80">
             {user.jobTitle || t('employees.roles.MANAGER')} <span className="mx-2 text-[var(--text-muted)]">|</span> {t('manager_dashboard.subtitle')}
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className="hidden lg:flex items-center gap-6 px-8 py-5 rounded-3xl premium-glass border-glow-premium shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center border border-[var(--success)]/20">
               <Activity size={24} />
            </div>
            <div>
               <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('dashboard.efficiency')}</div>
               <div className="text-xl font-black text-[var(--text-primary)]">{stats.teamPerf}%</div>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Team Strategy Phase Layer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="premium-glass border-glow-premium p-10 bg-gradient-to-br from-[var(--primary)]/5 to-transparent">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--primary)] mb-10 flex items-center gap-3">
            <Sparkles size={16} />
            {t('manager_dashboard.team_strategy')}
          </h3>
          <div className="flex items-center justify-between gap-4 max-w-lg">
             {[
               { label: t('manager_dashboard.dept'), icon: Zap },
               { label: t('manager_dashboard.team'), icon: Activity },
               { label: t('manager_dashboard.focus'), icon: Target },
             ].map((step, idx) => (
               <div key={idx} className="flex flex-col items-center gap-4 flex-1 relative">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border-2 transition-all duration-500 ${idx === 1 ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-2xl shadow-[var(--primary)]/40 scale-110' : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-muted)]'}`}>
                    <step.icon size={24} />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest text-center ${idx === 1 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{step.label}</span>
                  {idx < 2 && (
                    <div className="absolute top-8 -right-4 w-8 h-[1px] bg-gradient-to-r from-[var(--border-subtle)] to-transparent" />
                  )}
               </div>
             ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="premium-glass border-glow-premium p-10 bg-gradient-to-br from-[var(--primary)]/5 to-transparent">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--primary)] mb-10 flex items-center gap-3">
            <Award size={16} />
            {t('manager_dashboard.team_growth')}
          </h3>
          <div className="flex items-center justify-between gap-4 max-w-lg">
             {[
               { label: t('md_dashboard.self_review'), icon: Users },
               { label: t('md_dashboard.alignment'), icon: Shield },
               { label: t('md_dashboard.growth'), icon: Award },
             ].map((step, idx) => (
               <div key={idx} className="flex flex-col items-center gap-4 flex-1 relative">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border-2 transition-all duration-500 ${idx === 1 ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-2xl shadow-[var(--primary)]/40 scale-110' : 'bg-[var(--primary)]/20 border-[var(--primary)]/30 text-[var(--primary)]'}`}>
                    <step.icon size={24} />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest text-center ${idx === 1 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{step.label}</span>
                  {idx < 2 && (
                    <div className="absolute top-8 -right-4 w-8 h-[1px] bg-gradient-to-r from-[var(--primary)]/30 to-transparent" />
                  )}
               </div>
             ))}
          </div>
        </motion.div>
      </div>

      {/* Guidance Layer */}
      {stats.pendingReviews > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="premium-glass border-glow-premium p-8 bg-amber-500/5 border-amber-500/20 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 flex-shrink-0">
            <AlertCircle size={28} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] mb-2">{t('manager_dashboard.active_guidance')}</h4>
            <p className="text-lg font-medium text-[var(--text-primary)] opacity-80 leading-snug">
              {t('manager_dashboard.guidance_desc', { pendingReviews: stats.pendingReviews, openLeaves: stats.openLeaves })}
            </p>
          </div>
          <Link to="/reviews/team" className="px-10 py-4 rounded-xl bg-amber-500 text-black font-black text-[11px] uppercase tracking-widest hover:bg-amber-400 transition-colors shadow-xl no-underline">
            {t('manager_dashboard.review_now')}
          </Link>
        </motion.div>
      )}

      {/* Stats Cluster */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {cardStats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: s.delay }}
            className="premium-glass border-glow-premium p-8 hover-float group shadow-xl">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-all group-hover:scale-110 mb-8 shadow-inner">
              <s.icon size={22} style={{ color: s.color }} />
            </div>
            <div className="text-5xl font-black text-[var(--text-primary)] tracking-ultra mb-2">
              {loading ? <span className="text-[var(--text-muted)] animate-pulse">···</span> : s.value}
            </div>
            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] opacity-60 group-hover:opacity-100 transition-opacity">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left: Performance Detail */}
        <div className="xl:col-span-8 flex flex-col gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
            className="premium-glass border-glow-premium p-10 shadow-2xl">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="font-black text-3xl text-[var(--text-primary)] tracking-ultra">{t('manager_dashboard.performance_analytics')}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-2 opacity-60">{t('manager_dashboard.execution_scores')}</p>
              </div>
                <div className="text-2xl font-black text-[var(--success)] flex items-center gap-2 justify-end">
                   {stats.teamPerf}% <TrendingUp size={20} />
                </div>
              </div>
            </div>

            <div className="h-4 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden mb-16 shadow-inner">
               <motion.div 
                 initial={{ width: 0 }} 
                 animate={{ width: `${stats.teamPerf}%` }} 
                 transition={{ duration: 1.5, ease: "easeOut" }}
                 className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] shadow-[0_0_24px_rgba(var(--primary-rgb),0.5)]"
               />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {[
                 { label: t('manager_dashboard.target_alignment'), value: '92%', status: 'HIGH' },
                 { label: t('manager_dashboard.resource_drain'), value: t('manager_dashboard.optimal'), status: 'PERFECT' },
                 { label: t('manager_dashboard.risk_profile'), value: t('manager_dashboard.low'), status: 'STABLE' },
               ].map((metric, i) => (
                 <div key={i} className="p-6 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all shadow-sm">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 opacity-60">{metric.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-black text-[var(--text-primary)] tracking-tight">{metric.value}</p>
                      <span className="text-[8px] font-black text-[var(--primary)] uppercase tracking-tighter bg-[var(--primary)]/10 px-2 py-0.5 rounded-full">{metric.status}</span>
                    </div>
                 </div>
               ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Link to="/kpi/team" className="premium-glass border-glow-premium p-8 group no-underline hover-float shadow-xl">
               <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/20">
                    <Target size={22} />
                  </div>
                  <ArrowRight size={20} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
               </div>
               <h4 className="font-black text-xl text-[var(--text-primary)] uppercase tracking-tight mb-2 group-hover:text-[var(--primary)] transition-colors">{t('common.team_targets')}</h4>
               <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 leading-relaxed">{t('manager_dashboard.strategic_mission')}</p>
            </Link>
            <Link to="/reviews/team" className="premium-glass border-glow-premium p-8 group no-underline hover-float shadow-xl">
               <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/20">
                    <ClipboardCheck size={22} />
                  </div>
                  <ArrowRight size={20} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
               </div>
               <h4 className="font-black text-xl text-[var(--text-primary)] uppercase tracking-tight mb-2 group-hover:text-[var(--primary)] transition-colors">{t('manager_dashboard.pending_reviews')}</h4>
               <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 leading-relaxed">{t('manager_dashboard.growth_calibration')}</p>
            </Link>
          </div>
        </div>

        {/* Right: Inbox & Sidebar */}
        <div className="xl:col-span-4 flex flex-col gap-8">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <ActionInbox />
          </motion.div>
          
          <div className="premium-glass border-glow-premium p-8 shadow-2xl bg-gradient-to-br from-[var(--primary)]/5 to-transparent">
            <h4 className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.3em] mb-8">{t('manager_dashboard.active_headcount')}</h4>
            <div className="space-y-6">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:border-[var(--primary)]/30 transition-all">
                      <Users size={16} />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-[var(--text-primary)] tracking-tight">Department Core</div>
                      <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Active Shift</div>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-[var(--success)] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
              ))}
            </div>
            <Link to="/employees" className="block mt-10 p-4 text-center rounded-xl border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-all no-underline">
              {t('manager_dashboard.view_team')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
