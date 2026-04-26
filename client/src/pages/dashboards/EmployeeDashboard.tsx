import React from 'react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Clock, FileText, Award, ChevronRight, Calendar, Send, Zap, ArrowRight, Shield } from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import ActionInbox from '../../components/dashboard/ActionInbox';
import { useTranslation } from 'react-i18next';

const EmployeeDashboard: React.FC = () => {
  const { t } = useTranslation();
  const user = getStoredUser();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');

  useEffect(() => {
    api.get('/analytics/personal')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto page-enter">
      {/* Identity Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-3">
             <div className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
                <Zap size={12} className="animate-pulse" /> {t('common.employee')} {t('dashboard.console')}
             </div>
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
             <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{greeting}</span>
          </div>
          <h1 className="font-black text-5xl text-[var(--text-primary)] tracking-tight leading-none">
            {user.name?.split(' ')[0] || 'Team'} <span className="text-[var(--text-muted)] font-thin">/ {t('employee_dashboard.title')}</span>
          </h1>
          <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed">
            {user.jobTitle || t('employees.roles.EMPLOYEE')} &nbsp;·&nbsp; {t('employee_dashboard.subtitle')}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="nx-card p-10 border-[var(--primary)]/20 bg-[var(--primary)]/5">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--primary)] mb-10 text-center flex items-center justify-center gap-3">
            <Target size={14} />
            {t('employee_dashboard.strategic_journey')}
          </h3>
          <div className="flex items-center justify-center">
             <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
               {[
                 { label: t('employee_dashboard.md_goals'), icon: Shield },
                 { label: t('employee_dashboard.team_kpi'), icon: Zap },
                 { label: t('employee_dashboard.my_focus'), icon: Target },
               ].map((step, idx) => (
                 <div key={idx} className="flex flex-col items-center gap-3 relative">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${idx === 2 ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-muted)]'}`}>
                      <step.icon size={20} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${idx === 2 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{step.label}</span>
                    {idx < 2 && (
                      <div className="absolute top-7 -right-2 w-4 h-0.5 bg-[var(--border-subtle)]" />
                    )}
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="nx-card p-10 border-[var(--primary)]/20 bg-[var(--primary)]/5">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--primary)] mb-10 text-center flex items-center justify-center gap-3">
            <Award size={14} />
            {t('employee_dashboard.growth_journey')}
          </h3>
          <div className="flex items-center justify-center">
             <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
               {[
                 { label: t('employee_dashboard.self_review'), icon: Send },
                 { label: t('employee_dashboard.manager_alignment'), icon: Shield },
                 { label: t('employee_dashboard.complete'), icon: Award },
               ].map((step, idx) => (
                 <div key={idx} className="flex flex-col items-center gap-3 relative">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${idx === (stats?.pendingAppraisals > 0 ? 0 : 0) ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--text-inverse)] shadow-lg shadow-[var(--primary)]/20' : 'bg-[var(--primary)]/20 border-[var(--primary)]/30 text-[var(--primary)]'}`}>
                      <step.icon size={20} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${idx === 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{step.label}</span>
                    {idx < 2 && (
                      <div className="absolute top-7 -right-2 w-4 h-0.5 bg-[var(--primary)]/30" />
                    )}
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 h-full">
          <ActionInbox />
        </div>
        <div className="lg:col-span-8">
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-8 h-full rounded-2xl bg-[var(--success)]/5 border border-[var(--success)]/10 flex items-center gap-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center border border-[var(--success)]/20">
              <Send size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-white uppercase tracking-[0.2em] mb-1">{t('employee_dashboard.personnel_status')}</p>
              <p className="text-xs font-medium text-[var(--success)]/80 uppercase tracking-widest leading-relaxed">
                {t('employee_dashboard.status_desc', { activeGoals: stats?.activeGoals?.length || 0, pendingAppraisals: stats?.pendingAppraisals || 0 })}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: t('employee_dashboard.my_performance'), value: loading ? '…' : `${stats?.overallPerformance ?? 0}%`, icon: Target, color: 'var(--primary)' },
          { title: t('employee_dashboard.attendance_rate'), value: loading ? '…' : `${stats?.attendanceRate ?? 0}%`, icon: Clock, color: 'var(--success)' },
          { title: t('employee_dashboard.leave_balance'), value: loading ? '…' : `${stats?.leaveBalance ?? 0} ${t('employee_dashboard.days')}`, icon: Calendar, color: 'var(--warning)' },
          { title: t('employee_dashboard.training_status'), value: t('employee_dashboard.on_track'), icon: Award, color: 'var(--accent)' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="nx-card p-10 group hover:border-[var(--primary)]/30 transition-all">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] group-hover:border-[var(--primary)]/30 transition-colors mb-8">
              <stat.icon size={22} style={{ color: stat.color }} className="opacity-80" />
            </div>
            <div className="text-4xl font-black text-[var(--text-primary)] tracking-tight mb-2">{stat.value}</div>
            <div className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">{stat.title}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="nx-card p-10">
          <div className="flex items-center gap-4 mb-10">
             <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)]">
                <Target size={20} />
             </div>
             <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('employee_dashboard.my_goals')}</h3>
          </div>
          <div className="space-y-8">
            {loading ? (
              <div className="text-center py-10 text-[var(--text-muted)] animate-pulse text-sm font-bold uppercase tracking-widest">{t('employee_dashboard.loading_goals')}</div>
            ) : (!stats?.activeGoals || stats.activeGoals.length === 0) ? (
              <div className="text-center py-10 text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest">{t('employee_dashboard.no_goals')}</div>
            ) : (
              stats.activeGoals.map((item: any, i: number) => (
                <div key={i} className="group">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.1em] group-hover:text-[var(--text-primary)] transition-colors">{item.name}</span>
                    <span className="text-sm font-black" style={{ color: item.color || 'var(--primary)' }}>{item.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-hidden">
                    <motion.div className="h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]" style={{ background: item.color || 'var(--primary)' }}
                      initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} transition={{ delay: 0.5 + i * 0.1, duration: 1 }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="nx-card p-10">
          <div className="flex items-center gap-4 mb-10">
             <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)]">
                <Zap size={20} />
             </div>
             <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('employee_dashboard.quick_actions')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: t('employee_dashboard.request_leave'), href: '/leave', icon: Calendar },
              { label: t('employee_dashboard.view_payslips'), href: '/finance', icon: FileText },
              { label: t('employee_dashboard.my_appraisal'), href: '/performance-reviews', icon: Target },
              { label: t('employee_dashboard.training_portal'), href: '/training', icon: Award },
            ].map((item, i) => (
              <Link key={i} to={item.href}
                className="flex flex-col gap-4 p-8 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all group no-underline text-inherit">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] group-hover:scale-110 transition-transform`}>
                    <item.icon size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                  </div>
                  <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
                </div>
                <span className="text-[11px] font-black text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest">{item.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default EmployeeDashboard;
