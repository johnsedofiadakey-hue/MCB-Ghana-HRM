import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, DollarSign, Activity, TrendingUp, Shield, FileText, Bell, ArrowUp, Target, Award, Globe, Zap, ArrowRight, BarChart3 } from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ActionInbox from '../../components/dashboard/ActionInbox';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

interface Stats {
  totalEmployees: number;
  activeLeaves: number;
  pendingTasks: number;
  payrollTotal: number;
  attendanceRate: number;
  growth: { name: string; value: number }[];
  strategyPhases: { label: string; status: 'active' | 'pending' | 'done' }[];
  growthPhases: { label: string; status: 'active' | 'pending' | 'done' }[];
}

const MDDashboard = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useTheme();
  const user = getStoredUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');

  useEffect(() => {
    api.get('/analytics/executive')
      .then(res => {
        setStats({
          totalEmployees: res.data?.totalEmployees || 0,
          activeLeaves: res.data?.activeLeaves || 0,
          pendingTasks: res.data?.pendingTasks || 0,
          payrollTotal: res.data?.payrollTotal || 0,
          attendanceRate: res.data?.attendanceRate || 0,
          growth: Array.isArray(res.data?.growth) ? res.data.growth : [],
          strategyPhases: res.data?.strategyPhases || [],
          growthPhases: res.data?.growthPhases || []
        });
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadBoardReport = async () => {
    try {
      const response = await api.get('/analytics/executive/board-report/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `board_report_${new Date().toISOString().slice(0,10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Download failed:', e);
    }
  };
  const statCards = [
    { label: t('md_dashboard.total_employees'), value: stats?.totalEmployees ?? '—', icon: Users, color: 'var(--primary)', change: '' },
    { label: t('md_dashboard.on_leave'), value: stats?.activeLeaves ?? '—', icon: Calendar, color: 'var(--warning)', change: '' },
    { label: t('md_dashboard.monthly_payroll'), value: stats?.payrollTotal ? formatCurrency(stats.payrollTotal) : '—', icon: DollarSign, color: 'var(--success)', change: '' },
    { label: t('md_dashboard.attendance_rate'), value: stats?.attendanceRate ? `${stats.attendanceRate}%` : '—', icon: Activity, color: 'var(--info)', change: '' },
  ];

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto page-enter">
      {/* Identity Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-3">
             <div className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
                <Globe size={12} className="animate-pulse" /> {t('common.admin')} {t('dashboard.console')}
             </div>
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
             <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{greeting}</span>
          </div>
          <h1 className="font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[var(--text-primary)] tracking-tight leading-none">
            {user.name?.split(' ')[0] || 'Executive'} <span className="text-[var(--text-muted)] font-thin block xs:inline lg:ml-2">/ {t('md_dashboard.title')}</span>
          </h1>
          <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed">
            {user.jobTitle || t('employees.roles.MD')} &nbsp;·&nbsp; {t('md_dashboard.subtitle')}
          </p>
        </motion.div>
        
        {/* Executive Actions */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="flex pb-1">
           <button
             onClick={handleDownloadBoardReport}
             className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-black uppercase tracking-widest flex items-center gap-3 hover:bg-[var(--accent)] hover:shadow-[0_0_20px_var(--primary)] hover:shadow-[var(--primary)]/30 transition-all active:scale-95"
           >
             <FileText size={18} /> Download Board Report
           </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 h-full">
          <ActionInbox />
        </div>
        <div className="lg:col-span-8 space-y-8">
          <div className="nx-card p-10 border-[var(--primary)]/20 bg-[var(--primary)]/5">
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--primary)] mb-10 text-center flex items-center justify-center gap-3">
              <Target size={14} />
              {t('md_dashboard.enterprise_strategy')}
            </h3>
            <div className="flex items-center justify-center">
               <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                 {(stats?.strategyPhases?.length ? stats.strategyPhases : [
                   { label: 'corp_strategy', status: 'active' },
                   { label: 'operational', status: 'pending' },
                   { label: 'execution', status: 'pending' },
                 ]).map((step, idx) => {
                   const stepIcons = [Zap, Activity, Target];
                   const Icon = stepIcons[idx] || Target;
                   const isActive = step.status === 'active';
                   const isDone = step.status === 'done';
                   
                   return (
                     <div key={idx} className="flex flex-col items-center gap-3 relative">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${isActive ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : isDone ? 'bg-[var(--primary)]/20 border-[var(--primary)]/30 text-[var(--primary)]' : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-muted)]'}`}>
                          <Icon size={20} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{t(`md_dashboard.${step.label}`)}</span>
                        {idx < 2 && (
                          <div className={`absolute top-7 -right-2 w-4 h-0.5 ${isDone ? 'bg-[var(--primary)]/30' : 'bg-[var(--border-subtle)]'}`} />
                        )}
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>

          <div className="nx-card p-10 border-[var(--primary)]/20 bg-[var(--primary)]/5">
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--primary)] mb-10 text-center flex items-center justify-center gap-3">
              <Award size={14} />
              {t('md_dashboard.institutional_growth')}
            </h3>
            <div className="flex items-center justify-center">
               <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                 {(stats?.growthPhases?.length ? stats.growthPhases : [
                   { label: 'self_review', status: 'done' },
                   { label: 'alignment', status: 'done' },
                   { label: 'final_verdict', status: 'active' },
                 ]).map((step, idx) => {
                    const stepIcons = [Users, Shield, Award];
                    const Icon = stepIcons[idx] || Award;
                    const isActive = step.status === 'active';
                    const isDone = step.status === 'done';

                    return (
                      <div key={idx} className="flex flex-col items-center gap-3 relative">
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${isActive ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : isDone ? 'bg-[var(--primary)]/20 border-[var(--primary)]/30 text-[var(--primary)]' : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-muted)]'}`}>
                           <Icon size={20} />
                         </div>
                         <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{t(`md_dashboard.${step.label}`)}</span>
                         {idx < 2 && (
                           <div className={`absolute top-7 -right-2 w-4 h-0.5 ${isDone ? 'bg-[var(--primary)]/30' : 'bg-[var(--border-subtle)]'}`} />
                         )}
                      </div>
                    );
                 })}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((s, i) => {
          const isAccentStat = s.color === 'var(--accent)' || s.color === 'var(--warning)';
          return (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`nx-card p-10 group transition-all ${isAccentStat ? 'hover:border-[var(--accent)]/30' : 'hover:border-[var(--primary)]/30'}`}>
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors"
                style={{
                  background: isAccentStat ? 'var(--accent-10)' : 'var(--primary-10)',
                  borderColor: isAccentStat ? 'rgba(238,113,0,0.22)' : 'rgba(0,158,227,0.22)',
                }}>
                <s.icon size={22} style={{ color: s.color }} />
              </div>
              {s.change && (
                <div className="px-3 py-1 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20 text-[10px] font-black text-[var(--success)] flex items-center gap-1">
                  <ArrowUp size={10} />{s.change}
                </div>
              )}
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight mb-2 truncate">
              {loading ? <span className="text-[var(--text-muted)] animate-pulse">···</span> : s.value}
            </div>
            <div className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] truncate">{s.label}</div>
          </motion.div>
          );
        })}
      </div>

      {/* Growth Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="nx-card p-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('md_dashboard.workforce_growth')}</h3>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{t('md_dashboard.headcount_trend')}</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[var(--primary)]" style={{ background: 'var(--primary-10)', border: '1px solid rgba(0,158,227,0.22)' }}>
             <TrendingUp size={20} />
          </div>
        </div>
        {loading ? (
          <div className="h-[260px] w-full bg-[var(--bg-elevated)]/50 rounded-xl animate-pulse flex items-center justify-center">
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Aggregating Institutional Data...</span>
          </div>
        ) : stats?.growth && stats.growth.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.growth}>
              <defs>
                <linearGradient id="mdGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.5} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-lg)'
                }}
                itemStyle={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fill="url(#mdGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] w-full border border-dashed border-[var(--border-subtle)] rounded-xl flex items-center justify-center">
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{t('common.no_data_available')}</p>
          </div>
        )}
      </motion.div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { icon: BarChart3, label: "Strategic KPI Pulse", desc: "Institutional Performance Analytics", href: '/kpi/executive', color: 'var(--primary)' },
          { icon: Shield, label: "Governance & Branding", desc: "Corporate Identity Control", href: '/settings', color: 'var(--primary)' },
          { icon: Target, label: "Corporate Strategy", desc: "Define Long-term Objectives", href: '/performance/strategic', color: 'var(--primary)' },
          { icon: DollarSign, label: "Payroll Authorization", desc: "Final Disbursement Approval", href: '/payroll', color: 'var(--success)' },
          { icon: Award, label: "Institutional Growth", desc: "Talent & Culture Pulse", href: '/enterprise', color: 'var(--accent)' },
          { icon: FileText, label: "Executive Board Report", desc: "Generate Monthly Summary", href: '#', onClick: handleDownloadBoardReport, color: 'var(--warning)' },
        ].map((item, i) => {
          const isAccentAction = item.color === 'var(--accent)' || item.color === 'var(--warning)';
          return (
          <Link
            key={i}
            to={item.href}
            onClick={(e) => {
              if (item.onClick) {
                e.preventDefault();
                item.onClick();
              }
            }}
            className={`nx-card p-10 group transition-all no-underline block ${isAccentAction ? 'hover:border-[var(--accent)]/30' : 'hover:border-[var(--primary)]/30'}`}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center border transition-all"
                style={{
                  background: isAccentAction ? 'var(--accent-10)' : 'var(--primary-10)',
                  borderColor: isAccentAction ? 'rgba(238,113,0,0.22)' : 'rgba(0,158,227,0.22)',
                }}>
                <item.icon size={22} style={{ color: item.color }} />
              </div>
              <ArrowRight size={18} className={`text-[var(--text-muted)] group-hover:translate-x-1 transition-all ${isAccentAction ? 'group-hover:text-[var(--accent)]' : 'group-hover:text-[var(--primary)]'}`} />
            </div>
            <p className={`text-lg font-black text-[var(--text-primary)] transition-colors mb-2 uppercase tracking-tight ${isAccentAction ? 'group-hover:text-[var(--accent)]' : 'group-hover:text-[var(--primary)]'}`}>{item.label}</p>
            <p className="text-[11px] font-medium text-[var(--text-secondary)] opacity-60 uppercase tracking-widest leading-relaxed">{item.desc}</p>
          </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MDDashboard;

