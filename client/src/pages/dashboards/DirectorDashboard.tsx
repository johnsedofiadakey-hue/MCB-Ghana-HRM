import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BarChart3, Target, Calendar, Building2, TrendingUp, Zap, ArrowRight, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import ActionInbox from '../../components/dashboard/ActionInbox';
import { useTranslation } from 'react-i18next';
// Removed User type import to resolve build conflict


const COLORS = ['var(--primary)', 'var(--accent)', 'var(--warning)', 'var(--info)', 'var(--error)', 'var(--success)'];

const DirectorDashboard = () => {
  const { t } = useTranslation();
  const user = getStoredUser() as any;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');
  const [data, setData] = useState({ distribution: [] as any[], performance: [] as any[] });

  const fallbackDist = [
    { name: 'Operations', value: 38 }, { name: 'Sales', value: 28 },
    { name: 'Admin', value: 18 }, { name: 'IT', value: 16 }
  ];
  const fallbackPerf = [
    { name: 'Operations', value: 88 }, { name: 'Sales', value: 74 },
    { name: 'Admin', value: 91 }, { name: 'IT', value: 82 }
  ];

  useEffect(() => {
    api.get('/analytics/dept-growth')
      .then(res => setData({
        distribution: fallbackDist,
        performance: Array.isArray(res.data) && res.data.length ? res.data : fallbackPerf
      }))
      .catch(() => setData({ distribution: fallbackDist, performance: fallbackPerf }));
  }, []);

  const statsArr = [
    { label: t('common.departments'), value: data.performance.length || '—', icon: Building2, color: 'var(--primary)', delay: 0.1 },
    { label: t('dashboard.active_reviews'), value: '—', icon: BarChart3, color: 'var(--accent)', delay: 0.2 },
    { label: t('dashboard.open_targets'), value: '—', icon: Target, color: 'var(--primary)', delay: 0.3 },
    { label: t('dashboard.pending_leave'), value: '—', icon: Calendar, color: 'var(--success)', delay: 0.4 },
  ];

  return (
    <div className="relative space-y-12 pb-20 max-w-[1700px] mx-auto page-enter">
      {/* Background Decorative Elements */}
      <div className="bg-glow-radial -top-40 -left-40" />
      <div className="bg-glow-radial top-1/2 -right-40" style={{ background: 'radial-gradient(circle, rgba(var(--accent-rgb), 0.1) 0%, transparent 70%)' }} />

      {/* Identity Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-3 mb-4">
             <div className="px-4 py-1.5 rounded-full premium-glass border-glow-premium text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl">
                <Sparkles size={14} className="animate-pulse text-[var(--primary)]" /> 
                {t('common.admin')} {t('dashboard.intelligence')}
             </div>
             <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-2 h-2 rounded-full bg-[var(--success)] shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
             <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">{greeting}</span>
          </div>
          <h1 className="font-black text-fluid-h1 text-[var(--text-primary)] tracking-ultra leading-[0.9]">
            {user.fullName?.split(' ')[0] || 'Director'} <span className="text-[var(--text-muted)] font-extralight block lg:inline lg:ml-2">/ {t('dashboard.overview')}</span>
          </h1>
          <p className="text-lg font-medium mt-6 text-[var(--text-secondary)] max-w-2xl leading-relaxed opacity-80">
            {user.jobTitle || t('employees.roles.DIRECTOR')} <span className="mx-2 text-[var(--text-muted)]">|</span> {t('dashboard.org_health')}
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className="hidden lg:flex items-center gap-4 p-2 rounded-2xl premium-glass border-glow-premium shadow-2xl">
          <div className="px-6 py-4 text-center border-r border-[var(--border-subtle)]">
            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('dashboard.headcount')}</div>
            <div className="text-2xl font-black text-[var(--text-primary)]">142</div>
          </div>
          <div className="px-6 py-4 text-center">
            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('dashboard.efficiency')}</div>
            <div className="text-2xl font-black text-[var(--success)]">94.8%</div>
          </div>
        </motion.div>
      </header>

      {/* Main Grid Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Insights & Stats */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsArr.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: s.delay }}
                className="premium-glass border-glow-premium p-6 hover-float group shadow-xl">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-all group-hover:scale-110 mb-6 shadow-inner">
                  <s.icon size={20} style={{ color: s.color }} />
                </div>
                <div className="text-3xl font-black text-[var(--text-primary)] tracking-ultra mb-1">{s.value}</div>
                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] opacity-60 group-hover:opacity-100 transition-opacity">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} 
              className="premium-glass border-glow-premium p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-black text-xl text-[var(--text-primary)] tracking-tight">{t('dashboard.headcount_dist')}</h3>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1 opacity-50">{t('dashboard.by_dept')}</p>
                </div>
                <Users size={20} className="text-[var(--primary)] opacity-40" />
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.distribution} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={6} dataKey="value" stroke="none">
                    {data.distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} cornerRadius={4} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'rgba(0,0,0,0.85)', border: 'none', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                    itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-8">
                {data.distribution.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[9px] font-black text-[var(--text-primary)] uppercase tracking-tight">{d.name}</span>
                    <span className="text-[10px] font-bold text-[var(--primary)]">{d.value}%</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} 
              className="premium-glass border-glow-premium p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-black text-xl text-[var(--text-primary)] tracking-tight">{t('dashboard.dept_perf')}</h3>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1 opacity-50">{t('dashboard.efficiency_metrics')}</p>
                </div>
                <TrendingUp size={20} className="text-[var(--accent)] opacity-40" />
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.performance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 9, fontWeight: 800 }} dy={10} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
                    contentStyle={{ background: 'rgba(0,0,0,0.85)', border: 'none', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {data.performance.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? 'var(--primary)' : 'var(--accent)'} fillOpacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        </div>

        {/* Right Col: Action Center */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <ActionInbox />
          </motion.div>

          <div className="flex flex-col gap-4">
            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] px-2">{t('dashboard.strategic_shortcuts')}</h4>
            {[
              { label: t('dashboard.institutional_verdict'), href: '/reviews/final', icon: Zap, color: 'var(--primary)' },
              { label: t('dashboard.team_targets'), href: '/kpi/team', icon: Target, color: 'var(--accent)' },
              { label: t('dashboard.dept_config'), href: '/departments', icon: Building2, color: '#f59e0b' },
            ].map((item, i) => (
              <Link key={i} to={item.href} className="premium-glass border-glow-premium p-6 flex items-center justify-between group hover:border-[var(--primary)]/30 transition-all no-underline shadow-lg hover-float">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] group-hover:bg-[var(--primary)]/10 transition-colors">
                    <item.icon size={18} style={{ color: item.color }} />
                  </div>
                  <span className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-wider group-hover:text-[var(--primary)] transition-colors">{item.label}</span>
                </div>
                <ArrowRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectorDashboard;

