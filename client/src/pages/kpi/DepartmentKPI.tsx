import { useEffect, useState } from 'react';
import { Target, TrendingUp, Plus, Search, ShieldCheck, Activity, BarChart3, Globe, X, ArrowUpRight, ChevronRight, Layers, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/common/PageHeader';
import FlowSteps from '../../components/common/FlowSteps';
import EmptyState from '../../components/common/EmptyState';
import GuidedTooltip from '../../components/common/GuidedTooltip';

const DepartmentKPI = () => {
  const [loading, setLoading] = useState(false);
  const [deptKpis, setDeptKpis] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingKpi, setEditingKpi] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [newKpi, setNewKpi] = useState({ 
    departmentId: '', 
    title: '', 
    metricType: 'PERCENT', 
    targetValue: 90, 
    measurementPeriod: 'Q1-2026' 
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiRes, deptRes] = await Promise.all([
        api.get('/enterprise/performance/department-kpis'), 
        api.get('/departments')
      ]);
      setDeptKpis(Array.isArray(kpiRes.data?.data) ? kpiRes.data.data : Array.isArray(kpiRes.data) ? kpiRes.data : []);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to synchronize strategic data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddKpi = async () => {
    if (!newKpi.departmentId || !newKpi.title) {
        toast.info('Missing strategic parameters');
      return;
    }
    setLoading(true);
    try {
      if (editingKpi) {
        await api.patch(`/enterprise/performance/department-kpis/${editingKpi.id}`, {
          ...newKpi,
          targetValue: Number(newKpi.targetValue),
          departmentId: Number(newKpi.departmentId),
        });
        toast.info('Strategic KPI Updated');
      } else {
        await api.post('/enterprise/performance/department-kpis', {
          ...newKpi,
          targetValue: Number(newKpi.targetValue),
          departmentId: Number(newKpi.departmentId),
        });
        toast.info('Strategic KPI Deployed Successfully');
      }
      setIsAdding(false);
      setEditingKpi(null);
      setNewKpi({ departmentId: '', title: '', metricType: 'PERCENT', targetValue: 90, measurementPeriod: 'Q1-2026' });
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Strategic deployment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this strategic mandate? This cannot be undone.')) return;
    setLoading(true);
    try {
      await api.delete(`/enterprise/performance/department-kpis/${id}`);
      toast.info('Strategic Mandate Revoked');
      fetchData();
    } catch (e) {
      toast.error('Failed to revoke mandate');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (kpi: any) => {
    setEditingKpi(kpi);
    setNewKpi({
      departmentId: kpi.departmentId.toString(),
      title: kpi.title,
      metricType: kpi.metricType,
      targetValue: kpi.targetValue,
      measurementPeriod: kpi.measurementPeriod
    });
    setIsAdding(true);
  };

  const filteredKpis = (deptKpis || []).filter(k => 
    k?.title?.toLowerCase().includes(searchTerm?.toLowerCase() || '') || 
    k?.department?.name?.toLowerCase().includes(searchTerm?.toLowerCase() || '')
  );

  return (
    <div className="space-y-10 pb-20 page-enter min-h-screen">
      {/* Header Architecture */}
      <PageHeader 
        title="Departmental Strategic KPIs"
        description="Define high-level strategic goals for your department. These mandates will cascade to managers for operational decomposition."
        icon={Globe}
        variant="indigo"
        action={{
          label: "Define Strategic KPI",
          onClick: () => setIsAdding(true),
          icon: Plus
        }}
      />

      <FlowSteps 
        currentStep={1}
        variant="indigo"
        steps={[
          { id: 1, label: 'Department KPI', description: 'Strategic Mandate' },
          { id: 2, label: 'Team Targets', description: 'Operational Decomp' },
          { id: 3, label: 'Member Execution', description: 'Individual Focus' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-light transition-colors" size={18} />
                <input 
                    placeholder="Filter Strategic Objectives..." 
                    className="nx-input !pl-16 !bg-white/[0.02] border-white/5 focus:!border-primary/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-6">
                {loading && filteredKpis.length === 0 ? (
                    <div className="glass p-20 text-center border-white/[0.05]">
                        <Activity size={32} className="animate-spin mx-auto mb-4 text-primary-light" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Syncing mission data...</p>
                    </div>
                ) : filteredKpis.length === 0 ? (
                    <EmptyState 
                        title="No Strategic KPIs Found"
                        description="Start by defining a Departmental KPI to guide your team's tactical execution."
                        icon={Target}
                        variant="indigo"
                        action={{
                            label: "Define First KPI",
                            onClick: () => setIsAdding(true),
                            icon: Plus
                        }}
                    />
                ) : (
                    filteredKpis.map((kpi, idx) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={kpi.id} 
                            className="glass p-8 group hover:bg-white/[0.02] hover:border-primary/20 transition-all cursor-default border-white/[0.05] relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                               <TrendingUp size={120} className="text-white" />
                            </div>

                            <div className="flex items-center justify-between gap-6 relative z-10">
                                <div className="flex items-center gap-6 flex-1">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shadow-xl shadow-primary/5">
                                        <Target size={28} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-xl font-black text-white font-display tracking-tight uppercase group-hover:text-primary-light transition-colors">{kpi.title}</h4>
                                            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                               <ArrowUpRight size={10} /> {kpi.status || 'ACTIVE'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                                            <span className="text-primary-light bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{kpi.department?.name || 'GLOBAL'}</span>
                                            <span className="opacity-40">•</span>
                                            <span>PERIOD: {kpi.measurementPeriod}</span>
                                        </p>
                                    </div>
                                </div>
                                 <div className="text-right flex items-center gap-8">
                                    <div>
                                        <div className="text-3xl font-black text-white font-display tracking-tighter">
                                            {kpi.targetValue}<span className="text-xs text-slate-600 font-bold ml-1">{kpi.metricType}</span>
                                        </div>
                                        <p className="text-[9px] font-black text-primary-light uppercase tracking-widest mt-1 opacity-60">KPI TARGET</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button 
                                            onClick={() => startEdit(kpi)}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary-light transition-colors text-slate-500"
                                            title="Edit Mandate"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(kpi.id)}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors text-slate-500"
                                            title="Revoke Mandate"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>

        {/* Sidebar Insights */}
        <div className="lg:col-span-4 space-y-8">
            <div className="glass p-8 border-white/[0.05] bg-[#0d0f1a]/40 backdrop-blur-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                   <Layers size={100} className="text-primary-light" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary-light mb-8 flex items-center gap-3">
                   <BarChart3 size={16} /> Portfolio Metrics
                </h3>
                <div className="space-y-6 relative z-10">
                    {[
                        { label: 'Global Achievement', val: '74.2%', icon: TrendingUp, color: 'text-emerald-400' },
                        { label: 'Active Directives', val: deptKpis.length.toString(), icon: Target, color: 'text-primary-light' },
                        { label: 'Operational Coverage', val: '100%', icon: ShieldCheck, color: 'text-blue-400' }
                    ].map((stat, i) => (
                        <div key={i} className="flex justify-between items-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/5 transition-colors group/item">
                            <div className="flex items-center gap-3">
                                <stat.icon size={14} className="text-slate-600 group-hover/item:text-primary-light transition-colors" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
                            </div>
                            <span className={cn("text-sm font-black font-display", stat.color)}>{stat.val}</span>
                        </div>
                    ))}
                </div>
                <button className="w-full mt-10 py-5 rounded-2xl bg-white/[0.03] border border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:bg-white/[0.05] hover:text-white transition-all">
                    Export Strategy Manifest
                </button>
            </div>

            <div className="p-8 rounded-[2rem] bg-amber-500/5 border border-amber-500/10">
                <div className="flex items-center gap-3 text-amber-500 mb-4">
                    <ShieldCheck size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Leadership Protocol</span>
                </div>
                <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase tracking-wider">
                    Directives defined here establish the top-level mission ceiling. These will be automatically propagated for departmental decomposition.
                </p>
            </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsAdding(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
            />
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass w-full max-w-2xl bg-[#0a0f1e] border-white/[0.05] p-12 relative shadow-2xl overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12">
                   <Target size={160} className="text-primary-light" />
                </div>

                <div className="flex justify-between items-start mb-12 relative z-10">
                    <div>
                        <h2 className="text-3xl font-black text-white font-display tracking-tight uppercase underline decoration-primary decoration-4 underline-offset-8">
                            {editingKpi ? 'Adjust KPI' : 'Define KPI'}
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-6 ml-1">
                            {editingKpi ? 'Modifying Strategic benchmark' : 'Establishing Strategic Mandate'}
                        </p>
                    </div>
                    <button onClick={() => { setIsAdding(false); setEditingKpi(null); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-8 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                                <Globe size={12} /> Target Jurisdiction
                                <GuidedTooltip text="The department this strategic goal applies to." />
                            </label>
                            <select 
                                className="nx-input" 
                                value={newKpi.departmentId} 
                                onChange={(e) => setNewKpi(p => ({ ...p, departmentId: e.target.value }))}
                            >
                                <option value="" className="bg-slate-900">Select Department</option>
                                {(departments || []).filter(Boolean).map(d => <option key={d.id} value={d.id} className="bg-slate-900">{d.name || 'Department'}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                                <Activity size={12} /> Unit Analysis
                                <GuidedTooltip text="How the progress of this KPI will be measured (%, Currency, or Count)." />
                            </label>
                            <select 
                                className="nx-input" 
                                value={newKpi.metricType} 
                                onChange={(e) => setNewKpi(p => ({ ...p, metricType: e.target.value }))}
                            >
                                <option value="PERCENT" className="bg-slate-900">Percentage Achievement</option>
                                <option value="CURRENCY" className="bg-slate-900">Financial Benchmark</option>
                                <option value="COUNT" className="bg-slate-900">Numeric Quantifier</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                            <Target size={12} /> Directive Descriptive Manifest
                        </label>
                        <input 
                            className="nx-input" 
                            placeholder="e.g. MISSION: INCREASE MARKET PENETRATION" 
                            value={newKpi.title} 
                            onChange={(e) => setNewKpi(p => ({ ...p, title: e.target.value }))} 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-8 p-8 rounded-3xl bg-primary/5 border border-primary/10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-primary-light ml-1 flex items-center gap-2">
                                <TrendingUp size={12} /> Metric Ceiling
                            </label>
                            <input 
                                type="number"
                                className="nx-input !bg-transparent !border-white/10 focus:!border-primary" 
                                value={newKpi.targetValue} 
                                onChange={(e) => setNewKpi(p => ({ ...p, targetValue: Number(e.target.value) }))} 
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-primary-light ml-1 flex items-center gap-2">
                                <ChevronRight size={12} /> Performance Trend
                            </label>
                            <input 
                                className="nx-input !bg-transparent !border-white/10 focus:!border-primary" 
                                placeholder="FY26-Q1" 
                                value={newKpi.measurementPeriod} 
                                onChange={(e) => setNewKpi(p => ({ ...p, measurementPeriod: e.target.value }))} 
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-6">
                        <button 
                            disabled={loading}
                            onClick={handleAddKpi}
                            className="w-full py-6 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-[0.5em] shadow-3xl shadow-primary/40 hover:scale-[1.02] transition-all"
                        >
                            {loading ? (editingKpi ? 'UPDATING...' : 'DEPLOYING...') : (editingKpi ? 'UPDATE KPI MANDATE' : 'DEPLOY STRATEGIC KPI')}
                        </button>
                    </div>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DepartmentKPI;
