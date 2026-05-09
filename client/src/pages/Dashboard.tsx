import api from '../services/api';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import {
  TrendingUp, Users, AlertCircle, ArrowUpRight, ArrowDownRight,
  Calendar, Download, Target, Clock, CheckCircle, Activity, Globe, Zap, ShieldCheck,
  Briefcase, Wallet, LifeBuoy, UserX, Rocket
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { getStoredUser, getRoleRankValue } from '../utils/session';
import ActionInbox from '../components/dashboard/ActionInbox';

// Pulse Suite Modals
import CreateJobModal from '../components/recruitment/CreateJobModal';
import CreateExpenseModal from '../components/expenses/CreateExpenseModal';
import CreateTicketModal from '../components/support/CreateTicketModal';
import InitiateOffboardingModal from '../components/offboarding/InitiateOffboardingModal';

interface DashboardStats {
  avgPerformance?: number; 
  performanceChange?: string;
  teamMorale?: number; 
  moraleChange?: string;
  criticalIssues?: number; 
  topPerformers?: number;
  openJobs?: number;
  pendingExpenses?: number;
  activeTickets?: number;
  attendanceRate?: number;
  headcount?: number;
  myClaims?: number;
}

const useDashboardData = (departmentId?: string) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const [s, p, d, a] = await Promise.all([
          api.get('/dashboard/stats', { params: { departmentId } }),
          api.get('/dashboard/performance', { params: { departmentId } }),
          api.get('/departments'),
          api.get('/activity/logs?limit=8'),
        ]);
        setStats(s.data || {});
        setPerformance(Array.isArray(p.data) ? p.data : []);
        setDepartments(Array.isArray(d.data) ? d.data : []);
        const activityRows = Array.isArray(a.data?.logs) ? a.data.logs : Array.isArray(a.data) ? a.data : [];
        setActivity(activityRows);
      } catch (e) {
        console.error(e);
      } finally {
        if (showLoading) setLoading(false);
      }
    };
    
    fetch(true);
    
    const interval = setInterval(() => fetch(false), 300000); // Poll every 5 minutes
    return () => clearInterval(interval);
  }, [departmentId]);
  return { stats, performance, departments, activity, loading };
};

const StatCard = ({ title, value, change, icon: Icon, color, sub, index, link }: any) => {
  const navigate = useNavigate();
  const isPositive = change?.startsWith('+') || (!change?.startsWith('-') && change !== '0%');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
      onClick={() => link && navigate(link)}
      className={cn(
        "nx-card p-6 group min-w-0 transition-all",
        link ? "cursor-pointer hover:border-[var(--primary)]/50 hover:shadow-lg hover:shadow-[var(--primary)]/5" : "cursor-default"
      )}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-colors group-hover:border-[var(--primary)]/30 shrink-0">
          <Icon size={20} style={{ color }} className="opacity-70" />
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0",
            isPositive ? "text-[var(--success)] bg-[var(--success)]/5" : "text-[var(--error)] bg-[var(--error)]/5"
          )}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {change}
          </div>
        )}
      </div>
      
      <div className="font-bold text-2xl sm:text-3xl text-[var(--text-primary)] tracking-tight mb-1 truncate overflow-hidden">
        {value ?? '--'}
      </div>
      <div className="text-[12px] font-medium text-[var(--text-muted)] truncate uppercase tracking-wider">{title}</div>
      {sub && <div className="text-[11px] mt-2 font-medium text-[var(--text-secondary)] opacity-70 line-clamp-1">{sub}</div>}
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !Array.isArray(payload) || !payload.length) return null;
  return (
    <div className="nx-card p-4 border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-lg">
      <p className="font-bold text-[var(--text-primary)] mb-2 text-sm">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={p?.name || i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p?.color }} />
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            {p?.name || 'Metric'}: <span className="text-[var(--text-primary)] font-bold">{p?.value}%</span>
          </p>
        </div>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useTheme();
  const user = getStoredUser();
  const [selectedDept, setSelectedDept] = useState<string>('');
  const { stats, performance, departments, activity, loading } = useDashboardData(selectedDept);
  const [modalType, setModalType] = useState<string | null>(null);

  const now = new Date();
  const hours = now.getHours();
  const timeGreeting = hours < 12 ? t('dashboard.greeting_morning') : hours < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-[var(--bg-main)] !bg-[var(--bg-main)]">
      <div className="w-12 h-12 rounded-full border-2 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
      <p className="text-[12px] font-medium text-[var(--text-muted)]">{t('dashboard.loading')}</p>
    </div>
  );

  const userRank = getRoleRankValue(user?.role);
  const quickActions = [
    { label: t('dashboard.actions.post_job'), icon: Briefcase, color: 'bg-[var(--primary)]', onClick: () => setModalType('job'), rank: 70 },
    { label: t('dashboard.actions.file_expense'), icon: Wallet, color: 'bg-[var(--primary)]', onClick: () => setModalType('expense'), rank: 0 },
    { label: t('dashboard.actions.get_support'), icon: LifeBuoy, color: 'bg-[var(--error)]', onClick: () => setModalType('support'), rank: 0 },
    { label: t('dashboard.actions.employee_exit'), icon: UserX, color: 'bg-[var(--text-muted)]', onClick: () => setModalType('offboarding'), rank: 80 },
    { label: t('dashboard.actions.system_boost'), icon: Rocket, color: 'bg-[var(--primary)]', onClick: () => {}, rank: 90 },
  ].filter(a => userRank >= a.rank);

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto bg-[var(--bg-main)] !bg-[var(--bg-main)]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-2">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
             <div className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
                <Zap size={12} className="animate-pulse" /> {t('common.admin')} {t('dashboard.console')}
             </div>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{timeGreeting}</span>
          </div>
          <h1 className="font-black text-2xl xs:text-3xl sm:text-4xl md:text-5xl text-[var(--text-primary)] tracking-tight leading-tight mt-2 lg:mt-0">
            {user.name?.split(' ')[0]} <span className="text-[var(--text-muted)] font-thin block xs:inline">/ {t('dashboard.overview')}</span>
          </h1>
          <p className="text-[12px] sm:text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed">
            {t('dashboard.welcome')} <span className="text-[var(--text-primary)] font-bold">{now.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>. {t('common.status')}: <span className="text-[var(--success)] font-bold">{t('dashboard.stable')}</span>.
          </p>
        </div>
        {getRoleRankValue(user.role) >= 60 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex flex-wrap items-center gap-3"
          >
            {/* Department Switcher (MD/Manager) */}
            {getRoleRankValue(user.role) >= 70 && (
              <div className="relative group min-w-[200px]">
                <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--primary)] opacity-50 group-focus-within:opacity-100 transition-opacity" />
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] font-black uppercase tracking-widest hover:border-[var(--primary)]/50 focus:border-[var(--primary)] transition-all appearance-none cursor-pointer outline-none"
                >
                  <option value="">{t('common.all_departments')}</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                   <ArrowDownRight size={14} />
                </div>
              </div>
            )}

            <button className="px-6 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] font-black uppercase tracking-widest hover:border-[var(--primary)]/50 transition-all flex items-center gap-2">
              <Download size={14} />
              <span>{t('dashboard.export_report')}</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {getRoleRankValue(user.role) >= 60 ? (
          <>
            <StatCard
              index={0}
              title={t('dashboard.company_performance')} value={stats?.avgPerformance ? `${stats.avgPerformance}%` : '--'}
              change={stats?.performanceChange} icon={TrendingUp} color="var(--primary)"
              sub={t('dashboard.overall_efficiency')}
              link="/performance/analytics"
            />
            <StatCard
              index={1}
              title={t('dashboard.team_morale')} value={stats?.teamMorale != null ? Number(stats.teamMorale).toFixed(1) : '--'}
              change={stats?.moraleChange} icon={Users} color="var(--accent)"
              sub={t('dashboard.current_score')}
              link="/analytics/predictive"
            />
            <StatCard
              index={2}
              title={t('dashboard.open_positions')} value={stats?.openJobs ?? '--'}
              icon={Briefcase} color="var(--primary)"
              sub={t('dashboard.hiring_pipeline')}
              link="/recruitment"
            />
            <StatCard
              index={3}
              title={t('dashboard.pending_expenses')} value={formatCurrency(stats?.pendingExpenses || 0)}
              icon={Wallet} color="var(--accent)"
               sub={t('dashboard.awaiting_approval')}
              link="/expenses"
            />
          </>
        ) : (
          <>
            <StatCard index={0} title={t('common.performance')} value={stats?.avgPerformance ? `${stats.avgPerformance}%` : '--'} icon={Target} color="var(--primary)" sub={t('dashboard.ytd')} link="/kpi/my-targets" />
            <StatCard index={1} title={t('common.attendance')} value={stats?.attendanceRate ? `${stats.attendanceRate}%` : '--'} icon={Clock} color="var(--accent)" sub={t('dashboard.last_30_days')} link="/attendance" />
            <StatCard index={2} title={t('dashboard.my_tickets')} value={stats?.activeTickets ?? '--'} icon={LifeBuoy} color="var(--primary)" sub={t('dashboard.open_support')} link="/support" />
            <StatCard index={3} title={t('dashboard.my_claims')} value={formatCurrency(stats?.myClaims || 0)} icon={Wallet} color="var(--accent)" sub={t('dashboard.this_month')} link="/expenses" />
          </>
        )}
      </div>

      {/* Pulse Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="nx-card p-4 bg-gradient-to-r from-[var(--primary)]/5 via-transparent to-[var(--primary)]/5 border-dashed"
      >
        <div className="flex flex-wrap items-center justify-center gap-4">
           {quickActions.map((action, i) => (
              <motion.button
                key={i}
                onClick={action.onClick}
                whileHover={{ y: -4, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-3 px-4 sm:px-6 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/50 transition-all shadow-lg group flex-1 min-w-[140px] sm:flex-none"
              >
                <div className={cn("p-2 rounded-xl text-white group-hover:rotate-12 transition-transform", action.color)}>
                  <action.icon size={16} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)] whitespace-nowrap">{action.label}</span>
              </motion.button>
           ))}
        </div>
      </motion.div>

      {/* Main Command Center Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Action Hub */}
        <div className="xl:col-span-4 space-y-8">
          <ActionInbox />
          
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="nx-card p-8 bg-gradient-to-br from-[var(--primary)]/10 to-transparent border-[var(--primary)]/10"
          >
             <h4 className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em] mb-4">{t('dashboard.pulse_advisor')}</h4>
             <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                   <Target size={24} className="text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{t('dashboard.strategic_gap')}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {t('dashboard.gap_description')}
                  </p>
                </div>
             </div>
             <button className="w-full mt-6 py-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--primary)]/10 transition-all">
                {t('dashboard.generate_report')}
             </button>
          </motion.div>
        </div>

        {/* Right Column: Analytics & Stats */}
        <div className="xl:col-span-8 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="nx-card p-6 sm:p-10"
          >
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('dashboard.performance_trends')}</h3>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">{t('dashboard.over_time')}</p>
              </div>
              <div className="flex gap-1 p-1.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                {['30d', '90d', 'ytd'].map((r) => (
                  <button key={r} className={cn(
                    "px-4 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest",
                    r === '90d' ? "bg-[var(--primary)] text-[var(--text-inverse)] shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}>
                    {t(`dashboard.time_ranges.${r}`)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-[240px] sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performance}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--primary)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Metric"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#scoreGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="nx-card p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-black text-lg text-[var(--text-primary)] tracking-tight">{t('dashboard.org_health')}</h3>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{t('dashboard.by_dept')}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)]">
                   <Activity size={18} />
                </div>
              </div>
              <div className="space-y-6">
                {departments.slice(0, 4).map((d: any) => {
                  const score = Math.round(d.score || 0);
                  const color = score >= 75 ? 'var(--primary)' : score >= 50 ? 'var(--warning)' : 'var(--error)';
                  return (
                    <div key={d.id} className="group cursor-default">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{d.name}</span>
                        <span className="text-[11px] font-black" style={{ color }}>{score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 1.2, delay: 0.6, ease: [0.23, 1, 0.32, 1] }}
                          className="h-full rounded-full"
                          style={{ background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="nx-card p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-black text-lg text-[var(--text-primary)] tracking-tight">{t('dashboard.access_control')}</h3>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{t('dashboard.identity_status')}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                   <ShieldCheck size={18} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                   { label: t('dashboard.network'), value: t('dashboard.secure'), icon: Globe, color: 'var(--primary)' },
                   { label: t('dashboard.protocols'), value: t('common.high'), icon: Zap, color: 'var(--warning)' },
                   { label: t('dashboard.headcount'), value: stats?.headcount ?? '--', icon: Users, color: 'var(--success)' },
                   { label: t('dashboard.threats'), value: t('dashboard.none'), icon: AlertCircle, color: 'var(--primary)' },
                ].map((item: any) => (
                  <div key={item.label} className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all group">
                    <item.icon size={16} className="mb-3 transition-transform group-hover:scale-110" style={{ color: item.color }} />
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{item.label}</div>
                    <div className="text-xs font-black text-[var(--text-primary)]">{item.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="nx-card p-6 sm:p-10"
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)] shadow-inner">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('dashboard.interaction_stream')}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                <p className="text-[10px] font-black text-[var(--success)] uppercase tracking-[0.2em]">{t('dashboard.real_time_telemetry')}</p>
              </div>
            </div>
          </div>
          <button className="text-[11px] font-black text-[var(--primary)] uppercase tracking-widest border-b-2 border-transparent hover:border-[var(--primary)] transition-all">
            {t('inbox.view_all')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(activity || []).length > 0 ? (activity || []).slice(0, 8).map((item: any, idx: number) => {
            if (!item) return null;
            return (
            <motion.div
              key={item.id || idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + (idx * 0.05) }}
              className="group p-5 rounded-[2rem] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] hover:border-[var(--primary)]/30 transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-[var(--text-inverse)] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-lg shadow-[var(--primary)]/20">
                  {(item.user?.[0] || '?').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black text-[var(--text-primary)] truncate">{item.user || 'User'}</p>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">{item.time}</p>
                </div>
              </div>
              <div className="space-y-2">
                 <p className="text-[11px] font-bold text-[var(--text-secondary)] leading-snug group-hover:text-[var(--text-primary)] transition-colors">
                   {item.action} <span className="text-[var(--primary)]">@{item.target || 'System'}</span>
                 </p>
              </div>
            </motion.div>
          );
        }) : (
            <div className="col-span-full py-20 text-center bg-[var(--bg-elevated)] rounded-[3rem] border border-dashed border-[var(--border-subtle)]">
              <CheckCircle size={40} className="mx-auto mb-4 text-[var(--text-muted)] opacity-20" />
              <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em]">{t('inbox.all_clear')}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Pulse Suite Modals */}
      <CreateJobModal 
        isOpen={modalType === 'job'} 
        onClose={() => setModalType(null)} 
        onSuccess={() => { setModalType(null); }} 
      />
      <CreateExpenseModal 
        isOpen={modalType === 'expense'} 
        onClose={() => setModalType(null)} 
        onSuccess={() => { setModalType(null); }} 
      />
      <CreateTicketModal 
        isOpen={modalType === 'support'} 
        onClose={() => setModalType(null)} 
        onSuccess={() => { setModalType(null); }} 
      />
      <InitiateOffboardingModal 
        isOpen={modalType === 'offboarding'} 
        onClose={() => setModalType(null)} 
        onSuccess={() => { setModalType(null); }} 
      />
    </div>
  );
};

export default Dashboard;
