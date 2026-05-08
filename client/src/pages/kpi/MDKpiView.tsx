/**
 * MD KPI Overview — Hierarchical Performance View
 *
 * MD and Directors see:
 * 1. DEPARTMENTAL view — aggregated KPI health per department/function
 * 2. INDIVIDUAL view — drill into specific people (filtered by direct reports only)
 *
 * Toggle between views; defaults to Departmental (appropriate for exec level).
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, TrendingUp, TrendingDown,
  Minus, ChevronRight, BarChart3,
  Loader2, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { cn } from '../../utils/cn';
import PageHeader from '../../components/common/PageHeader';

type ViewMode = 'departmental' | 'individual';

interface DeptSummary {
  departmentId: string;
  departmentName: string;
  managerName: string;
  totalKpis: number;
  avgScore: number;
  onTrack: number;
  atRisk: number;
  overdue: number;
}

interface IndividualKpi {
  employeeId: string;
  employeeName: string;
  role: string;
  departmentName: string;
  totalKpis: number;
  avgScore: number;
  sheetStatus: string;
}

const ScorePill = ({ score }: { score: number }) => {
  const color =
    score >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
    score >= 60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
    'text-rose-400 bg-rose-500/10 border-rose-500/20';
  const Icon = score >= 80 ? TrendingUp : score >= 60 ? Minus : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border', color)}>
      <Icon size={12} />
      {Number(score).toFixed(1)}%
    </span>
  );
};

const MDKpiView = () => {
  const [view, setView] = useState<ViewMode>('departmental');
  const [deptData, setDeptData] = useState<DeptSummary[]>([]);
  const [individualData, setIndividualData] = useState<IndividualKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [view]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (view === 'departmental') {
        const res = await api.get('/kpis/summary/departmental');
        setDeptData(Array.isArray(res.data) ? res.data : []);
      } else {
        const res = await api.get('/kpis/summary/individual');
        setIndividualData(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 page-transition">
      <PageHeader
        title="Executive KPI Dashboard"
        description="Monitor performance targets at departmental and individual levels. Use this view to identify risks and guide strategic alignment."
        icon={BarChart3}
        variant="indigo"
      />

      {/* View Toggle */}
      <div className="flex items-center gap-2 p-1.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl w-fit">
        {([
          { id: 'departmental', label: 'Departmental View', icon: Building2, desc: 'Team & Department' },
          { id: 'individual',   label: 'Individual View',   icon: Users,     desc: 'Direct Reporters' },
        ] as const).map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setView(tab.id)}
            className={cn(
              'flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-bold transition-all',
              view === tab.id
                ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            <tab.icon size={14} />
            <div className="text-left">
              <p className="font-black">{tab.label}</p>
              <p className="text-[9px] opacity-70">{tab.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-32 gap-4"
          >
            <Loader2 size={32} className="animate-spin text-[var(--primary-light)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Loading {view === 'departmental' ? 'department' : 'individual'} KPI data...
            </p>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex items-center gap-4"
          >
            <AlertCircle size={20} className="text-rose-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">Failed to load KPI data</p>
              <p className="text-xs text-rose-400 mt-1">{error}</p>
            </div>
          </motion.div>
        ) : view === 'departmental' ? (
          /* DEPARTMENTAL VIEW */
          <motion.div
            key="dept"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {deptData.length === 0 ? (
              <div className="text-center py-20 glass rounded-3xl">
                <Building2 size={40} className="mx-auto text-slate-700 mb-4" />
                <p className="text-sm font-bold text-slate-500">No departmental KPI data yet</p>
                <p className="text-xs text-slate-600 mt-1">Departments will appear here once KPI sheets are created</p>
              </div>
            ) : deptData.map((dept, i) => (
              <motion.div
                key={dept.departmentId}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="glass p-6 rounded-2xl hover:border-[var(--primary)]/20 transition-all group"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                      <Building2 size={18} className="text-[var(--primary-light)]" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{dept.departmentName}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Manager: {dept.managerName || 'Unassigned'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="text-center">
                      <p className="text-xs font-black text-white">{dept.totalKpis}</p>
                      <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">Total KPIs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-emerald-400">{dept.onTrack}</p>
                      <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">On Track</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-amber-400">{dept.atRisk}</p>
                      <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">At Risk</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-rose-400">{dept.overdue}</p>
                      <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">Overdue</p>
                    </div>
                    <ScorePill score={dept.avgScore} />
                    <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--primary-light)] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                {/* Score bar */}
                <div className="mt-4">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(dept.avgScore, 100)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.06 }}
                      className={cn(
                        'h-full rounded-full',
                        dept.avgScore >= 80 ? 'bg-emerald-500' :
                        dept.avgScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          /* INDIVIDUAL VIEW */
          <motion.div
            key="individual"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                Individual view shows direct reports and department heads only — for deeper drilldown, use department view above.
              </p>
            </div>

            {individualData.length === 0 ? (
              <div className="text-center py-20 glass rounded-3xl">
                <Users size={40} className="mx-auto text-slate-700 mb-4" />
                <p className="text-sm font-bold text-slate-500">No individual KPI data yet</p>
                <p className="text-xs text-slate-600 mt-1">Individual sheets will appear once KPIs are assigned</p>
              </div>
            ) : individualData.map((emp, i) => (
              <motion.div
                key={emp.employeeId}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass p-5 rounded-2xl hover:border-[var(--primary)]/20 transition-all group flex items-center justify-between flex-wrap gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-xs font-black text-white border border-white/5">
                    {emp.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{emp.employeeName}</p>
                    <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">{emp.role} · {emp.departmentName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs font-black text-white">{emp.totalKpis}</p>
                    <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">KPIs</p>
                  </div>
                  <ScorePill score={emp.avgScore} />
                  <span className={cn(
                    'px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border',
                    emp.sheetStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    emp.sheetStatus === 'SUBMITTED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    'bg-white/5 text-slate-400 border-white/10'
                  )}>
                    {emp.sheetStatus || 'In Progress'}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MDKpiView;
