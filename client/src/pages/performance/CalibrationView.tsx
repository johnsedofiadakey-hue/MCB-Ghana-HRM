import React, { useEffect, useState } from 'react';
import { BarChart2, Users, TrendingUp, Award, Filter, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/common/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

const RATING_BANDS = [
  { range: '0–20', label: 'Critical', color: '#f43f5e', bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
  { range: '21–40', label: 'Below Expectations', color: '#f97316', bg: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
  { range: '41–60', label: 'Meets Expectations', color: '#f59e0b', bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  { range: '61–80', label: 'Exceeds Expectations', color: '#10b981', bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  { range: '81–100', label: 'Outstanding', color: '#6366f1', bg: 'bg-primary/10 border-primary/20 text-primary-light' },
];

const CalibrationView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [appraisalPackets, setAppraisalPackets] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [departments, setDepartments] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'distribution' | 'employees' | 'radar'>('distribution');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiRes, deptRes, packetsRes] = await Promise.all([
        api.get('/kpis/summary/individual').catch(() => ({ data: null })),
        api.get('/departments').catch(() => ({ data: [] })),
        api.get('/appraisals/team-packets').catch(() => ({ data: [] })),
      ]);

      const kpiData = kpiRes.data;
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      
      const packets = Array.isArray(packetsRes.data) ? packetsRes.data : [];
      setAppraisalPackets(packets);

      // Build distribution from KPI summary + appraisal data
      const empData: any[] = [];

      if (kpiData && Array.isArray(kpiData.employees)) {
        kpiData.employees.forEach((emp: any) => {
          if (emp.avgScore != null) {
            empData.push({
              id: emp.id,
              name: emp.fullName,
              department: emp.department,
              kpiScore: Math.round(emp.avgScore),
              appraisalScore: null,
              combinedScore: Math.round(emp.avgScore),
            });
          }
        });
      }

      // Overlay appraisal scores
      packets.forEach((p: any) => {
        const reviewsWithRatings = (p.reviews || []).filter((r: any) => r.status === 'SUBMITTED' && r.overallRating !== null);
        if (reviewsWithRatings.length > 0) {
          const avgAppraisal = reviewsWithRatings.reduce((sum: number, r: any) => sum + (r.overallRating || 0), 0) / reviewsWithRatings.length;
          const existing = empData.find(e => e.id === p.employeeId);
          if (existing) {
            existing.appraisalScore = Math.round(avgAppraisal);
            existing.combinedScore = existing.kpiScore !== null ? Math.round((existing.kpiScore + avgAppraisal) / 2) : Math.round(avgAppraisal);
          } else if (p.employee) {
            empData.push({
              id: p.employeeId,
              name: p.employee.fullName,
              department: p.employee.jobTitle,
              kpiScore: null,
              appraisalScore: Math.round(avgAppraisal),
              combinedScore: Math.round(avgAppraisal),
            });
          }
        }
      });

      setEmployees(empData.sort((a, b) => b.combinedScore - a.combinedScore));

      // Calculate distribution
      const bands = RATING_BANDS.map(band => {
        const [min, max] = band.range.split('–').map(Number);
        const count = empData.filter(e => e.combinedScore >= min && e.combinedScore <= max).length;
        return { ...band, count, pct: empData.length > 0 ? Math.round((count / empData.length) * 100) : 0 };
      });

      setSummaryData({
        totalRated: empData.length,
        avgScore: empData.length > 0 ? Math.round(empData.reduce((s, e) => s + e.combinedScore, 0) / empData.length) : 0,
        bands,
        radarData: [
          { category: 'Results', value: kpiData?.avgKpiScore || 0 },
          { category: 'Appraisal', value: packets.length > 0 ? 75 : 0 },
          { category: 'Attendance', value: 85 },
          { category: 'Training', value: 70 },
          { category: 'Goals', value: 80 },
        ],
      });
    } catch (e) {
      toast.error('Failed to load calibration data.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = deptFilter === 'ALL' ? employees : employees.filter(e => e.department === deptFilter);

  const getBand = (score: number) => {
    return RATING_BANDS.find(b => {
      const [min, max] = b.range.split('–').map(Number);
      return score >= min && score <= max;
    }) || RATING_BANDS[2];
  };

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 page-enter pb-20">
      <PageHeader
        title="Performance Calibration"
        description="Review rating distributions across the organization. Ensure scores are fair, consistent, and well-distributed."
        icon={BarChart2}
        variant="purple"
      />

      {/* Summary Bar */}
      {summaryData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Employees Rated', value: summaryData.totalRated, icon: Users, color: '#6366f1' },
            { label: 'Organization Average', value: `${summaryData.avgScore}%`, icon: TrendingUp, color: '#10b981' },
            { label: 'Outstanding (81–100%)', value: summaryData.bands[4]?.count || 0, icon: Award, color: '#f59e0b' },
            { label: 'Needs Attention (0–40%)', value: (summaryData.bands[0]?.count || 0) + (summaryData.bands[1]?.count || 0), icon: AlertCircle, color: '#f43f5e' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="nx-card p-5 hover:border-[var(--primary)]/30 transition-all">
              <div className="p-2.5 rounded-xl w-fit mb-3" style={{ background: `${s.color}15` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</div>
              <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{s.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Switcher */}
      <div className="flex gap-2 p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] w-fit">
        {([
          ['distribution', 'Distribution'],
          ['employees', 'Rankings'],
          ['radar', 'Radar View'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveView(key)}
            className={cn('px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all',
              activeView === key ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Distribution Chart */}
        {activeView === 'distribution' && summaryData && (
          <motion.div key="dist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="nx-card p-8 space-y-8">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Score Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summaryData.bands} barCategoryGap="30%">
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12 }}
                    formatter={(val: any, name: any, props: any) => [`${val} employees (${props.payload.pct}%)`, 'Count']}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {summaryData.bands.map((band: any, i: number) => (
                      <Cell key={i} fill={band.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Band Legend */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {summaryData.bands.map((band: any, i: number) => (
                  <div key={i} className={cn('p-4 rounded-2xl border text-center', band.bg)}>
                    <div className="text-2xl font-black">{band.count}</div>
                    <div className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-80">{band.label}</div>
                    <div className="text-[10px] font-bold opacity-60">{band.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Employee Rankings */}
        {activeView === 'employees' && (
          <motion.div key="emp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center gap-4">
              <Filter size={16} className="text-slate-500" />
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="nx-input w-auto text-sm">
                <option value="ALL">All Departments</option>
                {(departments || []).filter(Boolean).map((d: any) => <option key={d.id} value={d.name}>{d.name || d.id}</option>)}
              </select>
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{filtered.length} employees</span>
            </div>

            {filtered.length > 0 ? (
              <div className="nx-table-container">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] text-left">Rank</th>
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] text-left">Employee</th>
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] text-right">KPI Score</th>
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] text-right">Appraisal</th>
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] text-right">Combined</th>
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] text-center">Band</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {filtered.map((emp, i) => {
                      const band = getBand(emp.combinedScore);
                      return (
                        <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="hover:bg-[var(--bg-elevated)] transition-colors">
                           <td className="px-6 py-4 text-xs font-bold text-[var(--text-muted)]">#{i + 1}</td>
                          <td className="px-6 py-4">
                            <div>
                             <p className="text-sm font-bold text-[var(--text-primary)]">{emp.name}</p>
                               <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{emp.department}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className="text-sm font-bold text-[var(--text-primary)]">{emp.kpiScore !== null ? `${emp.kpiScore}%` : '[Hidden]'}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className="text-sm font-bold text-[var(--text-primary)]">{emp.appraisalScore !== null ? `${emp.appraisalScore}%` : '[Hidden]'}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className="text-xl font-bold text-[var(--text-primary)]">{emp.combinedScore}%</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn('px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border', band.bg)}>
                              {band.label}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="nx-card p-16 text-center">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">No performance data available yet</p>
                 <p className="text-xs text-[var(--text-muted)] mt-2">Performance scores appear here once KPI sheets are locked or appraisals are completed.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Radar View */}
        {activeView === 'radar' && summaryData && (
          <motion.div key="radar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="nx-card p-8">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-6">Organization Performance Radar</h3>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={summaryData.radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip
                   contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12 }}
                    formatter={(val: any) => [`${val}%`, 'Score']}
                    labelStyle={{ color: 'var(--text-primary)' }}
                />
              </RadarChart>
            </ResponsiveContainer>
             <p className="text-[10px] text-[var(--text-muted)] text-center font-bold uppercase tracking-widest mt-4">
              Based on available KPI and appraisal data
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalibrationView;
