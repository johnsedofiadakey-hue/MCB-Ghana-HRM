import React, { useEffect, useState, useCallback } from 'react';
import { toast } from '../utils/toast';
import { 
  GraduationCap, Plus, Loader2, CheckCircle, 
  BookOpen, Users, Clock, Award, 
  LayoutGrid, List,  
  ArrowRight, Sparkles,
  Book, Trophy, Flame, UserPlus
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRoleRankValue } from '../utils/session';
import { useTranslation } from 'react-i18next';

const statusTheme: Record<string, string> = {
  ENROLLED: 'bg-blue-500/5 text-blue-600 border-blue-500/10',
  COMPLETED: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10',
  DROPPED: 'bg-rose-500/5 text-rose-600 border-rose-500/10',
  PLANNED: 'bg-slate-500/5 text-slate-500 border-slate-500/10',
  ONGOING: 'bg-amber-500/5 text-amber-600 border-amber-500/10',
  CANCELLED: 'bg-rose-500/5 text-rose-600 border-rose-500/10'
};

const Training = () => {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<any[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEnroll, setShowEnroll] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [form, setForm] = useState({ title: '', description: '', provider: '', startDate: '', endDate: '', durationHours: '', maxSeats: '', cost: '' });
  const [enrollForm, setEnrollForm] = useState({ employeeId: '' });

  const user = getStoredUser();
  const isAdmin = getRoleRankValue(user.role) >= 80;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([api.get('/training'), api.get('/training/my')]);
      setPrograms(Array.isArray(pRes.data) ? pRes.data : []);
      setMyEnrollments(Array.isArray(mRes.data) ? mRes.data : []);
      if (isAdmin) {
        const eRes = await api.get('/users');
        setEmployees(Array.isArray(eRes.data) ? eRes.data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/training', form);
      setShowCreate(false); 
      setForm({ title: '', description: '', provider: '', startDate: '', endDate: '', durationHours: '', maxSeats: '', cost: '' });
      fetchData();
      toast.success(t('training.success_create'));
    } catch (err: any) { setError(err?.response?.data?.error || t('common.error')); }
    finally { setSaving(false); }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/training/enroll', { programId: showEnroll.id, employeeId: enrollForm.employeeId || undefined });
      setShowEnroll(null); setEnrollForm({ employeeId: '' }); fetchData();
      toast.success(t('training.success_enroll'));
    } catch (err: any) { toast.error(String(err?.response?.data?.error || t('training.error_enroll'))); }
    finally { setSaving(false); }
  };

  const selfEnroll = async (programId: string) => {
    try {
      await api.post('/training/enroll', { programId });
      fetchData();
      toast.success(t('training.success_enroll'));
    } catch (err: any) { toast.error(String(err?.response?.data?.error || t('training.error_enroll'))); }
  };

  const completeTraining = async (enrollmentId: string) => {
    try {
      setSaving(true);
      await api.post('/training/complete', { enrollmentId, score: 100 });
      toast.success(t('training.success_complete'));
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-12 pb-32">
      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{t('training.title')}</h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <GraduationCap size={18} className="text-[var(--primary)] opacity-60" />
            {t('training.subtitle')}
          </p>
        </motion.div>

        <div className="flex items-center gap-4">
          <div className="flex bg-[var(--bg-elevated)]/50 p-1.5 rounded-2xl border border-[var(--border-subtle)] shadow-inner">
             <button onClick={() => setViewMode('grid')} className={cn("px-5 py-2.5 rounded-xl transition-all", viewMode === 'grid' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                <LayoutGrid size={18} />
             </button>
             <button onClick={() => setViewMode('list')} className={cn("px-5 py-2.5 rounded-xl transition-all", viewMode === 'list' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                <List size={18} />
             </button>
          </div>
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="px-8 h-[52px] rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 flex items-center gap-3"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={18} /> {t('training.add_program')}
            </motion.button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-40 flex flex-col items-center gap-6">
           <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">{t('training.loading')}</p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Active Personal Development */}
          {myEnrollments.length > 0 && (
            <div className="space-y-8">
              <div className="flex items-center gap-4 ml-2">
                <div className="w-10 h-10 rounded-xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-center text-orange-600">
                    <Flame size={18} />
                </div>
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">{t('training.my_enrollments')}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(myEnrollments || []).map((e, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    key={e.id}
                    className="nx-card p-8 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 blur-[40px] rounded-full group-hover:scale-150 transition-transform" />
                    <div className="flex items-start justify-between mb-8 relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] flex items-center justify-center border border-[var(--border-subtle)] shadow-sm text-[var(--primary)]">
                        <BookOpen size={22} />
                      </div>
                      <span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm", statusTheme[e.status])}>{t(`training.status_types.${e.status}`)}</span>
                    </div>
                    <div className="space-y-3 relative z-10 min-h-[100px]">
                      <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight leading-none group-hover:text-[var(--primary)] transition-colors">{e.program.title}</h3>
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic opacity-60">{e.program.provider || t('training.internal')}</p>
                    </div>
                    
                    {e.status !== 'COMPLETED' ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => completeTraining(e.id)}
                        disabled={saving}
                        className="mt-8 w-full h-14 rounded-2xl bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black uppercase tracking-[0.2em] border border-[var(--primary)]/20 flex items-center justify-center gap-3 transition-all"
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />} {t('training.mark_complete')}
                      </motion.button>
                    ) : (
                      <div className="mt-8 pt-8 border-t border-[var(--border-subtle)]/50 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3 text-emerald-600">
                          <CheckCircle size={18} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t('training.certified')}</span>
                        </div>
                        {e.score && <span className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">{e.score}%</span>}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-8">
            <div className="flex items-center gap-4 ml-2">
               <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                  <Book size={18} />
               </div>
               <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">{t('training.all_programs')}</h2>
            </div>

            {programs.length === 0 ? (
              <div className="nx-card p-32 text-center border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[var(--primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <GraduationCap size={64} className="mx-auto mb-8 text-[var(--text-muted)] opacity-20 group-hover:scale-110 transition-transform duration-700" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] opacity-40">{t('training.no_programs')}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {(programs || []).map((p, idx) => {
                  const enrolled = myEnrollments.find(e => e.programId === p.id);
                  const isFull = p.maxSeats && p.enrollments?.length >= p.maxSeats;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                      key={p.id}
                      className="nx-card p-8 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all flex flex-col group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)]/5 blur-[30px] rounded-full group-hover:scale-150 transition-transform" />
                      <div className="mb-6 flex flex-wrap gap-2 relative z-10">
                        <span className={cn("px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm", statusTheme[p.status])}>{t(`training.status_types.${p.status}`)}</span>
                        {isFull && <span className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-rose-500/20 text-rose-600 bg-rose-500/5">{t('training.form.max_load')}</span>}
                      </div>

                      <div className="space-y-3 mb-10 flex-grow relative z-10">
                        <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight leading-tight group-hover:text-[var(--primary)] transition-colors line-clamp-2">{p.title}</h3>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic opacity-60">{p.provider || t('training.internal')}</p>
                        {p.description && <p className="text-[11px] font-medium text-[var(--text-secondary)] line-clamp-3 mt-4 leading-relaxed">{p.description}</p>}
                      </div>

                      <div className="space-y-6 pt-8 border-t border-[var(--border-subtle)]/50 mt-auto relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                              <Clock size={14} className="text-[var(--primary)]" />
                              <span>{p.durationHours ? `${p.durationHours}H` : 'FLEX'}</span>
                           </div>
                           <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] justify-end">
                              <Users size={14} className="text-[var(--primary)]" />
                              <span>{p.enrollments?.length || 0}{p.maxSeats ? `/${p.maxSeats}` : ''}</span>
                           </div>
                        </div>

                        {enrolled ? (
                          <div className="w-full h-14 rounded-2xl bg-emerald-500/5 text-emerald-600 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-sm">
                            <CheckCircle size={18} /> {t('training.active_enrollment')}
                          </div>
                        ) : isAdmin ? (
                          <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => setShowEnroll(p)}
                            className="w-full h-14 rounded-2xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center justify-center gap-2 transition-all shadow-sm"
                          >
                            {t('training.manage_roster')}
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => selfEnroll(p.id)}
                            disabled={isFull}
                            className={cn(
                              "w-full h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl",
                              isFull ? "bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed" : "bg-[var(--primary)] text-white"
                            )}
                          >
                            {isFull ? t('training.form.limit_reached') : (
                              <>{t('training.self_enroll')} <ArrowRight size={16} /></>
                            )}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="nx-card border-[var(--border-subtle)] overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="nx-table">
                    <thead>
                      <tr className="bg-[var(--bg-elevated)]/10">
                        <th className="px-10 py-6">{t('training.table.header')}</th>
                        <th className="py-6">{t('training.table.body')}</th>
                        <th className="py-6">{t('training.table.horizon')}</th>
                        <th className="py-6">{t('training.table.state')}</th>
                        <th className="py-6">{t('training.table.load')}</th>
                        <th className="px-10 py-6 text-right">{t('training.table.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]/30">
                      {(programs || []).map((p, i) => {
                        const enrolled = myEnrollments.find(e => e.programId === p.id);
                        return (
                          <motion.tr 
                            key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*0.02 }}
                            className="hover:bg-[var(--bg-elevated)]/30 transition-all group"
                          >
                            <td className="px-10 py-6">
                              <div>
                                <p className="text-[13px] font-black text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors uppercase tracking-tight">{p.title}</p>
                                {p.description && <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest italic truncate max-w-[300px] opacity-60">{p.description}</p>}
                              </div>
                            </td>
                            <td className="py-6 text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{p.provider || t('training.internal')}</td>
                            <td className="py-6 text-[11px] font-mono font-bold text-[var(--text-muted)] tracking-wider">
                              {p.startDate ? `${new Date(p.startDate).toLocaleDateString([], { month: 'short', day: '2-digit' })} — ${p.endDate ? new Date(p.endDate).toLocaleDateString([], { month: 'short', day: '2-digit' }) : 'TBD'}` : t('training.table.flexible')}
                            </td>
                            <td className="py-6">
                              <span className={cn("px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm", statusTheme[p.status])}>{t(`training.status_types.${p.status}`)}</span>
                            </td>
                            <td className="py-6 text-[11px] font-black text-[var(--text-primary)]">
                              {p.enrollments?.length || 0} <span className="text-[var(--text-muted)]">/</span> {p.maxSeats || '∞'}
                            </td>
                            <td className="px-10 py-6 text-right">
                              {enrolled ? (
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-500/20 px-3 py-1.5 rounded-lg bg-emerald-500/5">{t('training.active_enrollment')}</span>
                              ) : isAdmin ? (
                                <button onClick={() => setShowEnroll(p)} className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] hover:text-[var(--text-primary)] transition-colors bg-[var(--primary)]/5 px-4 py-2 rounded-xl border border-[var(--primary)]/10">{t('common.edit')}</button>
                              ) : (
                                <button onClick={() => selfEnroll(p.id)} disabled={p.maxSeats && p.enrollments?.length >= p.maxSeats} className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] hover:text-[var(--text-primary)] transition-colors bg-[var(--primary)]/5 px-4 py-2 rounded-xl border border-[var(--primary)]/10 disabled:opacity-30">{t('training.self_enroll')}</button>
                              )}
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Curriculum Modals */}
      <AnimatePresence>
        {showCreate && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="absolute inset-0 bg-[var(--bg-main)]/80 backdrop-blur-xl" />
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                  className="nx-card w-full max-w-2xl bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl p-12 relative max-h-[90vh]"
               >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 blur-[40px] rounded-full" />
                 <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-10 border-b border-[var(--border-subtle)] pb-8">{t('training.save')}</h2>
                 
                 <div className="overflow-y-auto custom-scrollbar flex-grow space-y-10 py-2">
                    {error && <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest">{error}</div>}
                    
                    <form id="create-training-form" onSubmit={handleCreate} className="space-y-10">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('training.form.title')}</label>
                          <input className="nx-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t('training.form.title_placeholder')} />
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('training.form.provider')}</label>
                             <input className="nx-input" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder={t('training.form.provider_placeholder')} />
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('training.form.cost')}</label>
                             <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--primary)] font-black text-sm">$</span>
                                <input type="number" className="nx-input nx-input-l" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="0.00" />
                             </div>
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('training.form.start')}</label>
                             <input type="date" className="nx-input font-mono" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('training.form.end')}</label>
                             <input type="date" className="nx-input font-mono" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('training.form.duration')}</label>
                             <div className="relative group">
                                <input type="number" className="nx-input nx-input-r" value={form.durationHours} onChange={e => setForm({ ...form, durationHours: e.target.value })} placeholder="32.0" />
                                <Clock size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-40 pointer-events-none" />
                             </div>
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('training.form.seats')}</label>
                             <div className="relative group">
                                <input type="number" className="nx-input nx-input-r" value={form.maxSeats} onChange={e => setForm({ ...form, maxSeats: e.target.value })} placeholder="INFINITE" />
                                <Users size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-40 pointer-events-none" />
                             </div>
                          </div>
                       </div>

                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('training.form.description')}</label>
                          <textarea className="nx-input min-h-[140px] py-4" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('training.form.description_placeholder')} />
                       </div>
                    </form>
                 </div>
                 
                 <div className="flex gap-6 pt-10 border-t border-[var(--border-subtle)]/30">
                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-14 rounded-2xl border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all">{t('training.form.abort')}</button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} form="create-training-form" type="submit" className="flex-[2] h-14 rounded-2xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-[var(--primary)]/30 flex items-center justify-center gap-4 transition-all" disabled={saving}>
                       {saving ? <Loader2 size={18} className="animate-spin" /> : <Award size={18} />}
                       {saving ? t('common.saving') : t('training.save')}
                    </motion.button>
                 </div>
               </motion.div>
             </div>
        )}

        {showEnroll && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEnroll(null)} className="absolute inset-0 bg-[var(--bg-main)]/80 backdrop-blur-xl" />
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                  className="nx-card w-full max-w-lg bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl p-12 relative"
               >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 blur-[40px] rounded-full" />
                 <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-10 border-b border-[var(--border-subtle)] pb-8">{t('training.enroll_employee')}</h2>
                 
                 <div className="space-y-10">
                    <div className="p-6 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] space-y-3 relative group overflow-hidden">
                       <div className="absolute -right-6 -bottom-6 text-[var(--primary)] opacity-10 group-hover:scale-110 transition-transform">
                          <GraduationCap size={100} />
                       </div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">{t('training.form.description')}</p>
                       <p className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight leading-none truncate pr-10">{showEnroll.title}</p>
                       <p className="text-[11px] font-black tracking-widest text-[var(--text-muted)] uppercase italic">{showEnroll.provider || t('training.internal')}</p>
                    </div>
                    
                    <form onSubmit={handleEnroll} className="space-y-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('training.form.title')} *</label>
                          <div className="relative group">
                             <select className="nx-input appearance-none bg-[var(--bg-elevated)]/50 pr-12 font-bold" required value={enrollForm.employeeId} onChange={e => setEnrollForm({ employeeId: e.target.value })}>
                                <option value="">{t('training.select_employee')}</option>
                                {(employees || []).map(e => <option key={e.id} value={e.id}>{e.fullName} · {e.jobTitle}</option>)}
                             </select>
                             <UserPlus size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none opacity-60" />
                          </div>
                       </div>
                       
                       <div className="flex gap-6 pt-10 border-t border-[var(--border-subtle)]/30">
                          <button type="button" onClick={() => setShowEnroll(null)} className="flex-1 h-14 rounded-2xl border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all">{t('training.form.abort')}</button>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="flex-[2] h-14 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-4 transition-all" disabled={saving}>
                             {saving ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                             {saving ? t('common.saving') : t('training.enroll')}
                          </motion.button>
                       </div>
                    </form>
                 </div>
               </motion.div>
             </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Training;
