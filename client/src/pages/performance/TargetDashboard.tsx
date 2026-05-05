import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, Clock, CheckCircle, X, Flag,
  Percent, DollarSign, Hash,
  List, Target, Plus, Building2, Users, Download, Sparkles, AlertTriangle, ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/common/PageHeader';
import TargetCard from '../../components/performance/TargetCard';
import { AnimatePresence, motion } from 'framer-motion';
import { getStoredUser, getRoleRankValue } from '../../utils/session';
import EmptyState from '../../components/common/EmptyState';
import TargetCascadeModal from '../../components/performance/TargetCascadeModal';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useAI } from '../../context/AIContext';

const getMetricTypes = (t: any) => [
  { value: 'NUMERICAL', label: t('targets.numerical'), icon: Hash, desc: t('targets.numerical_desc') },
  { value: 'PERCENTAGE', label: t('targets.percentage'), icon: Percent, desc: t('targets.percentage_desc') },
  { value: 'FINANCIAL', label: t('targets.financial'), icon: DollarSign, desc: t('targets.financial_desc') },
  { value: 'QUALITATIVE', label: t('targets.qualitative'), icon: List, desc: t('targets.qualitative_desc') },
];

const getStatusConfig = (t: any): Record<string, { label: string; badge: string }> => ({
  DRAFT: { label: t('targets.status.DRAFT'), badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
  ASSIGNED: { label: t('targets.status.ASSIGNED'), badge: 'bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20' },
  ACKNOWLEDGED: { label: t('targets.status.ACKNOWLEDGED'), badge: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' },
  IN_PROGRESS: { label: t('targets.status.IN_PROGRESS'), badge: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20' },
  UNDER_REVIEW: { label: t('targets.status.UNDER_REVIEW'), badge: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' },
  COMPLETED: { label: t('targets.status.COMPLETED'), badge: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20' },
  OVERDUE: { label: t('targets.status.OVERDUE'), badge: 'bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/20' },
  CANCELLED: { label: t('targets.status.CANCELLED'), badge: 'bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20' },
});

// Empty metric template
const newMetric = () => ({
  _id: Math.random().toString(36).slice(2),
  title: '',
  metricType: 'NUMERICAL',
  targetValue: '',
  unit: '',
  weight: 1.0,
  qualitativePrompt: '',
});

// ── CREATE/EDIT TARGET MODAL ───────────────────────────────────────────────────────
const CreateTargetModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}> = ({ onClose, onSuccess, initialData }) => {
  const { t } = useTranslation();
  const { isEnabled: aiEnabled } = useAI();
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    level: (initialData?.level || 'INDIVIDUAL') as 'INDIVIDUAL' | 'DEPARTMENT',
    dueDate: initialData?.dueDate ? format(new Date(initialData.dueDate), 'yyyy-MM-dd') : '',
    assigneeId: initialData?.assigneeId || '',
    departmentId: initialData?.departmentId?.toString() || '',
    weight: initialData?.weight?.toString() || '1.0',
    status: initialData?.status || 'ASSIGNED',
    confidenceLevel: initialData?.confidenceLevel || 'ON_TRACK',
    blockers: initialData?.blockers || '',
  });
  
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handleAiDraft = async () => {
     if (!form.title.trim()) {
        toast.error('Enter a goal title first for the AI to analyze.');
        return;
     }
     setIsAiGenerating(true);
     try {
        const res = await api.post('/targets/generate-smart-draft', { 
           title: form.title, 
           level: form.level 
        });
        setForm(prev => ({ ...prev, description: res.data.draft }));
        toast.success('AI Goal Drafted successfully!');
     } catch {
        toast.error('AI drafting failed. Please check your connection.');
     } finally {
        setIsAiGenerating(false);
     }
  };
  
  const [metrics, setMetrics] = useState(
    initialData?.metrics?.length 
      ? initialData.metrics.map((m: any) => ({
          id: m.id,
          _id: m.id || Math.random().toString(36).slice(2),
          title: m.title,
          metricType: m.metricType,
          targetValue: m.targetValue?.toString() || '',
          unit: m.unit || '',
          weight: m.weight?.toString() || '1.0',
          qualitativePrompt: m.qualitativePrompt || '',
        }))
      : [newMetric()]
  );

  useEffect(() => {
    Promise.all([
      api.get('/users').catch(() => ({ data: [] })),
      api.get('/departments').catch(() => ({ data: [] })),
    ]).then(([uRes, dRes]) => {
      setEmployees(Array.isArray(uRes.data) ? uRes.data : []);
      setDepartments(Array.isArray(dRes.data) ? dRes.data : []);
    });
  }, []);

  const addMetric = () => setMetrics((m: any[]) => [...m, newMetric()]);
  const removeMetric = (id: string) => setMetrics((prev: any[]) => prev.filter((x: any) => x._id !== id));
  const updateMetric = (id: string, field: string, value: any) =>
    setMetrics((prev: any[]) => prev.map((x: any) => x._id === id ? { ...x, [field]: value } : x));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error(t('targets.title_required')); return; }
    if (metrics.some((m: any) => !m.title.trim())) { toast.error(t('targets.metrics_title_required')); return; }
    if (form.level === 'INDIVIDUAL' && !form.assigneeId) { toast.error(t('targets.assignee_required')); return; }
    
    setSaving(true);
    try {
      const payload = {
        ...form,
        weight: parseFloat(form.weight) || 1.0,
        departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
        metrics: metrics.map((m: any) => ({
          id: m.id, // Pass ID back to backend for syncing
          title: m.title,
          metricType: m.metricType,
          targetValue: m.metricType !== 'QUALITATIVE' ? parseFloat(String(m.targetValue)) || null : null,
          unit: m.unit || null,
          weight: parseFloat(String(m.weight)) || 1.0,
          qualitativePrompt: m.qualitativePrompt || null,
        })),
      };

      if (initialData?.id) {
        await api.patch(`/targets/${initialData.id}`, payload);
        toast.success(t('targets.success_update'));
      } else {
        await api.post('/targets', payload);
        toast.success(t('targets.success_create'));
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('targets.error_save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="nx-card w-full max-w-3xl max-h-[90vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
        >
          {/* Header - Sticky */}
          <div className="flex-shrink-0 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] px-8 py-6 flex justify-between items-center z-20">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                {initialData ? t('targets.edit_title') : t('targets.assign_title')}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-widest mt-1">
                {initialData ? t('targets.edit_subtitle') : t('targets.assign_subtitle')}
              </p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={16} /></button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar min-h-0">
            <form id="target-form" onSubmit={handleSubmit} className="space-y-8 pb-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('targets.target_title_label')}</label>
                <input className="nx-input" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder={t('targets.target_title_placeholder')} required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('targets.description_label')}</label>
                <textarea className="nx-input" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder={t('targets.description_placeholder')} />
                {aiEnabled && (
                  <button 
                    type="button" 
                    onClick={handleAiDraft}
                    disabled={isAiGenerating}
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--primary)] hover:text-[var(--primary)]/70 mt-2 transition-all"
                  >
                    {isAiGenerating ? <div className="w-3 h-3 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /> : <Sparkles size={12} />}
                    Enhance with Cortex AI
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Institutional Confidence</label>
                    <select className="nx-input" value={form.confidenceLevel} onChange={e => setForm({ ...form, confidenceLevel: e.target.value })}>
                       <option value="ON_TRACK">🟢 On Track</option>
                       <option value="AT_RISK">🟡 At Risk</option>
                       <option value="BLOCKED">🔴 Blocked / Needs Support</option>
                    </select>
                 </div>
                 {form.confidenceLevel !== 'ON_TRACK' && (
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Critical Blockers</label>
                       <input className="nx-input border-rose-500/30" value={form.blockers} onChange={e => setForm({ ...form, blockers: e.target.value })} placeholder="What is stopping this goal?" />
                    </div>
                 )}
              </div>

              {initialData && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('targets.status_label')}</label>
                  <select className="nx-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {Object.entries(getStatusConfig(t)).map(([val, cfg]) => (
                      <option key={val} value={val}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('targets.level_label')}</label>
              <div className="grid grid-cols-2 gap-4">
                {([['INDIVIDUAL', t('targets.individual_label'), Users], ['DEPARTMENT', t('targets.department_label'), Building2]] as const).map(([val, label, Icon]) => (
                  <button key={val} type="button" onClick={() => setForm({ ...form, level: val })}
                    className={cn('p-4 rounded-xl border flex items-center gap-3 transition-all', form.level === val ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]' : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]')}>
                    <Icon size={18} />
                    <span className="font-bold text-sm">{label}</span>
                  </button>
                ))}
              </div>

              {form.level === 'INDIVIDUAL' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('targets.assign_to_label')}</label>
                  <select className="nx-input" value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })} required>
                    <option value="">{t('targets.select_employee')}</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.jobTitle}</option>)}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('targets.department_label')}</label>
                  <select className="nx-input" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                    <option value="">{t('targets.all_departments')}</option>
                    {(departments || []).filter(Boolean).map((d: any) => <option key={d.id} value={d.id}>{d.name || 'Department'}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('targets.due_date_label')}</label>
                <input type="date" className="nx-input" value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('targets.weight_label')}</label>
                <input type="number" min="0" max="10" step="0.1" className="nx-input"
                  value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('targets.success_metrics_label')}</label>
                <button type="button" onClick={addMetric} className="text-[10px] font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-1 transition-all">
                  <Plus size={14} /> {t('targets.add_metric')}
                </button>
              </div>

              {metrics.map((metric: any, idx: number) => (
                <div key={metric._id} className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('targets.metric_n', { n: idx + 1 })}</span>
                    {metrics.length > 1 && (
                      <button type="button" onClick={() => removeMetric(metric._id)} className="text-[var(--error)] hover:opacity-80 transition-all">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <input className="nx-input text-sm" placeholder={t('targets.metric_title_placeholder')}
                    value={metric.title} onChange={e => updateMetric(metric._id, 'title', e.target.value)} required />

                  <div className="grid grid-cols-2 gap-3">
                    {getMetricTypes(t).map(mt => (
                      <button key={mt.value} type="button"
                        onClick={() => updateMetric(metric._id, 'metricType', mt.value)}
                        className={cn('p-3 rounded-xl border text-left transition-all', metric.metricType === mt.value ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30' : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]')}>
                        <div className="flex items-center gap-2 mb-1">
                          <mt.icon size={13} className={metric.metricType === mt.value ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'} />
                          <span className={cn('text-[11px] font-bold', metric.metricType === mt.value ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]')}>{mt.label}</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)]">{mt.desc}</p>
                      </button>
                    ))}
                  </div>

                  {metric.metricType !== 'QUALITATIVE' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <input className="nx-input text-sm" placeholder={t('targets.target_value_placeholder')}
                        type="number" value={metric.targetValue}
                        onChange={e => updateMetric(metric._id, 'targetValue', e.target.value)} />
                      <input className="nx-input text-sm" placeholder={t('targets.unit_placeholder')}
                        value={metric.unit} onChange={e => updateMetric(metric._id, 'unit', e.target.value)} />
                    </div>
                  ) : (
                    <input className="nx-input text-sm"
                      placeholder={t('targets.assessment_prompt_placeholder')}
                      value={metric.qualitativePrompt}
                      onChange={e => updateMetric(metric._id, 'qualitativePrompt', e.target.value)} />
                  )}
                </div>
              ))}
            </div>

            </form>
          </div>

          {/* Footer - Sticky/Fixed */}
          <div className="flex-shrink-0 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] px-8 py-6 flex justify-end gap-4 z-20">
            <button type="button" onClick={onClose} 
              className="px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
              {t('targets.cancel')}
            </button>
            <button form="target-form" type="submit" disabled={saving}
              className="px-10 py-3 rounded-xl bg-[var(--primary)] text-[var(--text-inverse)] text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Target size={14} /> {initialData ? t('targets.update_target_btn') : t('targets.create_and_assign')}</>}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
const TargetDashboard: React.FC = () => {
  const { t } = useTranslation();
  const user = getStoredUser();
  const rank = getRoleRankValue(user.role);
  const [myTargets, setMyTargets] = useState<any[]>([]);
  const [teamTargets, setTeamTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MY' | 'TEAM'>(rank >= 60 ? 'TEAM' : 'MY');
  const [filter, setFilter] = useState<string>('ALL');
  const [cascadeTarget, setCascadeTarget] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any | null>(null);
  const [exporting, setExporting] = useState(false);
  const [riskPulse, setRiskPulse] = useState<any>(null);

  useEffect(() => {
     if (rank >= 85) {
        api.get('/targets/pulse/risk').then(res => setRiskPulse(res.data)).catch(() => {});
     }
  }, [rank]);

  const fetchTargets = useCallback(async () => {
    try {
      setLoading(true);
      const promises: Promise<any>[] = [api.get('/targets')];
      if (rank >= 60) promises.push(api.get('/targets/team'));

      const [myRes, teamRes] = await Promise.all(promises);
      setMyTargets(Array.isArray(myRes.data) ? myRes.data : []);
      if (teamRes) setTeamTargets(Array.isArray(teamRes.data) ? teamRes.data : []);
    } catch {
      toast.error(t('common.sync_failed') || 'Failed to sync targets.');
    } finally {
      setLoading(false);
    }
  }, [rank]);

  useEffect(() => { fetchTargets(); }, [fetchTargets]);

  const handleExportRoadmap = async () => {
    setExporting(true);
    try {
      const response = await api.get('/export/roadmap/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `target-roadmap-${user.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      toast.success("Branded Roadmap Generated");
    } catch (err) {
      toast.error('Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleAcknowledge = async (targetId: string, status: string, message?: string) => {
    try {
      await api.post(`/targets/${targetId}/acknowledge`, { status, message });
      toast.success(status === 'ACKNOWLEDGED' ? t('targets.acknowledge_success') : t('targets.clarification_requested'));
      fetchTargets();
    } catch (err: any) { toast.error(err.response?.data?.error || t('common.action_failed')); }
  };

  const handleUpdateProgress = async (targetId: string, updates: any[], submit: boolean) => {
    try {
      await api.post(`/targets/${targetId}/progress`, { metricUpdates: updates, submit });
      toast.success(submit ? 'Goal submitted for final review' : 'Progress saved successfully');
      fetchTargets();
    } catch (err: any) { toast.error(err.response?.data?.error || t('common.update_failed')); }
  };

  const handleReview = async (targetId: string, approved: boolean, feedback?: string) => {
    try {
      await api.post(`/targets/${targetId}/review`, { approved, feedback });
      toast.success(approved ? 'Goal approved and finalized' : 'Goal returned for updates');
      fetchTargets();
    } catch (err: any) { toast.error(err.response?.data?.error || t('common.review_failed')); }
  };

  const handleEdit = (target: any) => {
    setEditingTarget(target);
  };

  const handleDeleteTarget = async (id: string) => {
    try {
      await api.delete(`/targets/${id}`);
      toast.success(t('targets.delete_success'));
      fetchTargets();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('common.deletion_failed'));
    }
  };

  const displayTargets = (activeTab === 'TEAM' && rank >= 60 ? teamTargets : myTargets)
    .filter(t => filter === 'ALL' || t.status === filter || t.level === filter);

  const statusCounts = (activeTab === 'TEAM' && rank >= 60 ? teamTargets : myTargets).reduce((acc: any, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  // Grouping Logic
  const departmentalTargets = displayTargets.filter(t => t.level === 'DEPARTMENT');
  const individualTargets = displayTargets.filter(t => t.level === 'INDIVIDUAL');

  const groupedByDept = departmentalTargets.reduce((acc: any, t) => {
    const dept = t.department?.name || 'General';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(t);
    return acc;
  }, {});

  const groupedByAssignee = individualTargets.reduce((acc: any, t) => {
    const name = t.assignee?.fullName || 'Unassigned';
    if (!acc[name]) acc[name] = [];
    acc[name].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-8 page-enter pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <PageHeader 
          title={t('targets.title')}
          description={t('targets.subtitle')}
          icon={Target}
          variant="primary"
        />
        <div className="flex gap-4">
          <button 
            onClick={handleExportRoadmap}
            disabled={exporting}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all shadow-xl"
          >
            {exporting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={14} />}
            Export Goals PDF
          </button>
          
          {(rank >= 60 || user.role === 'ADMIN') && (
            <button 
              onClick={() => { setEditingTarget(null); setShowCreate(true); }}
              className="btn-primary px-8 py-3 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
            >
              + {t('targets.assign_target')}
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('targets.total'), value: (activeTab === 'TEAM' ? teamTargets : myTargets).length, icon: Target, color: '#6366f1' },
          { label: t('targets.in_progress'), value: statusCounts['IN_PROGRESS'] || 0, icon: TrendingUp, color: '#f59e0b' },
          { label: t('targets.under_review'), value: statusCounts['UNDER_REVIEW'] || 0, icon: Clock, color: 'var(--primary)' },
          { label: t('targets.completed'), value: statusCounts['COMPLETED'] || 0, icon: CheckCircle, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="nx-card p-5 group hover:border-[var(--primary)]/30 transition-all">
            <div className="p-2.5 rounded-xl w-fit mb-3" style={{ background: `${s.color}15` }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      {/* RISK PULSE WIDGET */}
      {rank >= 85 && riskPulse && riskPulse.endangeredCount > 0 && (
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
            className="nx-card p-10 bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-3 bg-rose-500 text-white text-[8px] font-black uppercase tracking-tighter rounded-bl-xl shadow-lg flex items-center gap-2">
               <AlertTriangle size={10} />
               Critical Strategic Risk
            </div>
            <div className="flex flex-col md:flex-row items-center gap-10">
               <div className="w-24 h-24 rounded-[2rem] bg-rose-500/20 flex items-center justify-center text-rose-600 shrink-0 border-4 border-white shadow-xl">
                  <ShieldCheck size={48} />
               </div>
               <div className="flex-1 space-y-4">
                  <div>
                     <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">Institutional Risk Pulse</h3>
                     <p className="text-sm font-bold text-[var(--text-secondary)] mt-1">{riskPulse.insights}</p>
                  </div>
                  <div className="flex gap-4">
                     <div className="px-5 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Blocked Goals</div>
                        <div className="text-lg font-black text-rose-500">{riskPulse.criticalBlockers?.length || 0}</div>
                     </div>
                     <div className="px-5 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">At Risk</div>
                        <div className="text-lg font-black text-amber-500">{riskPulse.atRisk?.length || 0}</div>
                     </div>
                  </div>
               </div>
               <button onClick={() => setFilter('BLOCKED')} className="px-8 h-14 rounded-2xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-rose-500/40 hover:scale-[1.05] active:scale-95 transition-all">
                  Investigate Blockers
               </button>
            </div>
         </motion.div>
      )}

      {/* Tabs + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] gap-1">
          <button onClick={() => setActiveTab('MY')} className={cn('px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all', activeTab === 'MY' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}>{t('targets.my_targets')}</button>
          {rank >= 60 && (
            <button onClick={() => setActiveTab('TEAM')} className={cn('px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all relative', activeTab === 'TEAM' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}>
              {t('targets.team_targets')}
              {teamTargets.filter(t => t.status === 'UNDER_REVIEW').length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--warning)] rounded-full text-[8px] text-black font-black flex items-center justify-center">
                  {teamTargets.filter(t => t.status === 'UNDER_REVIEW').length}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {['ALL', 'ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'OVERDUE'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn('px-4 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all',
                filter === s ? 'bg-[var(--primary)]/20 border-[var(--primary)]/40 text-[var(--primary)]' : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              )}>
              {s === 'ALL' ? `${t('common.all') || 'All'} (${(activeTab === 'TEAM' ? teamTargets : myTargets).length})` : `${getStatusConfig(t)[s]?.label || s} (${statusCounts[s] || 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Target Content sections */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      ) : displayTargets.length > 0 ? (
        <div className="space-y-12">
          
          {/* Section: Departmental Goals */}
          {departmentalTargets.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--border-subtle)]" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] flex items-center gap-2">
                  <Building2 size={14} className="text-[var(--primary)]" /> {t('targets.dept_objectives')}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--border-subtle)]" />
              </div>

              <div className="space-y-8">
                {Object.entries(groupedByDept).map(([dept, targets]: any) => (
                  <div key={dept} className="space-y-4">
                    <div className="flex items-center gap-3">
                       <span className="px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest border border-[var(--primary)]/20">{dept === 'General' ? t('targets.general') : dept}</span>
                       <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{t('targets.goals_count', { count: targets.length })}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {targets.map((t: any) => (
                        <TargetCard key={t.id} target={t} isReviewer={activeTab === 'TEAM' || t.reviewerId === user.id}
                          onAcknowledge={(status, msg) => handleAcknowledge(t.id, status, msg)}
                          onUpdateProgress={(updates, submit) => handleUpdateProgress(t.id, updates, submit)}
                          onReview={(approved, feedback) => handleReview(t.id, approved, feedback)}
                          onCascade={() => setCascadeTarget(t)} onEdit={() => handleEdit(t)} onDelete={() => handleDeleteTarget(t.id)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: Individual Targets */}
          {individualTargets.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--border-subtle)]" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] flex items-center gap-2">
                  <Users size={14} className="text-emerald-500" /> {t('targets.indiv_performance')}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--border-subtle)]" />
              </div>

              <div className="space-y-10">
                {Object.entries(groupedByAssignee).map(([name, targets]: any) => (
                  <div key={name} className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/20 text-[10px] font-black">{name.charAt(0)}</div>
                       <div>
                         <div className="text-sm font-bold text-[var(--text-primary)]">{name}</div>
                         <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tight">{t('targets.active_assignments', { count: targets.length })}</div>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {targets.map((t: any) => (
                        <TargetCard key={t.id} target={t} isReviewer={activeTab === 'TEAM' || t.reviewerId === user.id}
                          onAcknowledge={(status, msg) => handleAcknowledge(t.id, status, msg)}
                          onUpdateProgress={(updates, submit) => handleUpdateProgress(t.id, updates, submit)}
                          onReview={(approved, feedback) => handleReview(t.id, approved, feedback)}
                          onCascade={() => setCascadeTarget(t)} onEdit={() => handleEdit(t)} onDelete={() => handleDeleteTarget(t.id)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      ) : (
        <EmptyState
          title={activeTab === 'TEAM' ? t('targets.no_team_targets') : t('targets.no_targets_assigned')}
          description={activeTab === 'TEAM' ? t('targets.no_team_desc') : t('targets.no_targets_desc')}
          icon={Flag}
        />
      )}

      {/* Modals */}
      <AnimatePresence>
        {(showCreate || editingTarget) && (
          <CreateTargetModal 
            initialData={editingTarget}
            onClose={() => { setShowCreate(false); setEditingTarget(null); }} 
            onSuccess={fetchTargets} 
          />
        )}
        {cascadeTarget && (
          <TargetCascadeModal
            target={cascadeTarget}
            onClose={() => setCascadeTarget(null)}
            onSuccess={() => { fetchTargets(); setCascadeTarget(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TargetDashboard;
