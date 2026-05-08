import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import { AlertTriangle, Plus, X, Server, MessageSquare, Loader2, Save } from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

const STATUS_COLORS: any = {
  OPEN: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  RESPONDED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  RESOLVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
};

export default function QueryManager({ employeeId, isAdmin }: { employeeId: string, isAdmin?: boolean }) {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeQuery, setActiveQuery] = useState<any>(null);
  const [form, setForm] = useState({ subject: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchQueries = async () => {
    try {
      const res = await api.get(`/queries/employee/${employeeId}`);
      setQueries(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setQueries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueries(); }, [employeeId]);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/queries/employee/${employeeId}`, form);
      setForm({ subject: '', description: '' });
      setShowModal(false);
      fetchQueries();
    } catch (err) {
      toast.info('Failed to issue query');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string, resolution?: string) => {
    try {
      await api.patch(`/queries/${id}/status`, { status, resolution });
      setActiveQuery(null);
      fetchQueries();
    } catch (err) {
      toast.info('Failed to update status');
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary-light" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white flex items-center gap-3">
          <AlertTriangle size={18} className="text-rose-500" /> Disciplinary & Queries
        </h3>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="btn-primary bg-rose-500 hover:bg-rose-600 shadow-rose-500/20 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <Plus size={14} /> Issue Query
          </motion.button>
        )}
      </div>

      {queries.length === 0 ? (
        <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-dashed border-white/10 text-center">
          <Server size={40} className="mx-auto mb-4 text-slate-700" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No disciplinary records found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {queries.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass p-6 rounded-3xl border border-white/[0.05] flex flex-col md:flex-row gap-6 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setActiveQuery(q)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border", STATUS_COLORS[q.status])}>
                      {q.status}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">{new Date(q.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{q.subject}</h4>
                  <p className="text-sm text-slate-400 line-clamp-2">{q.description}</p>
                </div>
                <div className="md:w-48 flex-shrink-0 flex items-center justify-between md:justify-end gap-3 md:flex-col md:items-end">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Issued By</p>
                    <p className="text-xs font-bold text-slate-300">{q.issuedBy?.fullName || 'System'}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detail / Update Modal */}
      <AnimatePresence>
        {activeQuery && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveQuery(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass w-full max-w-2xl bg-[#0a0f1e]/90 border-white/[0.05] overflow-hidden flex flex-col relative">
              <div className="p-8 border-b border-white/[0.05] bg-white/[0.02] flex justify-between items-start">
                <div>
                  <span className={cn("inline-block mb-3 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border", STATUS_COLORS[activeQuery.status])}>
                    {activeQuery.status}
                  </span>
                  <h2 className="text-2xl font-black text-white font-display tracking-tight leading-tight">{activeQuery.subject}</h2>
                </div>
                <button onClick={() => setActiveQuery(null)} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white flex-shrink-0"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3 block">Query Details</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{activeQuery.description}</p>
                </div>

                {activeQuery.resolution && (
                  <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-3 block text-center">Resolution Notes</p>
                    <p className="text-sm text-emerald-100/70 text-center italic">"{activeQuery.resolution}"</p>
                  </div>
                )}
              </div>

              {isAdmin && activeQuery.status !== 'RESOLVED' && (
                <div className="p-8 border-t border-white/[0.05] bg-white/[0.02] flex justify-end gap-3">
                  <button onClick={() => updateStatus(activeQuery.id, 'RESOLVED', prompt('Resolution Notes:') || 'Resolved visually')} className="btn-primary px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
                    Mark as Resolved
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Issue Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass w-full max-w-2xl bg-[#0a0f1e]/90 border-white/[0.05] overflow-hidden flex flex-col relative">
              <div className="p-8 border-b border-white/[0.05] bg-white/[0.02] flex justify-between items-center">
                <h2 className="text-2xl font-black text-rose-500 font-display tracking-tight uppercase flex items-center gap-3">
                  <AlertTriangle size={24} /> Issue Query
                </h2>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white"><X size={20} /></button>
              </div>

              <div className="p-8">
                <form onSubmit={handleIssue} id="query-form" className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Subject</label>
                    <input type="text" className="nx-input border-rose-500/20 focus:border-rose-500/50 focus:bg-rose-500/5" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required placeholder="e.g. Unexplained Absence" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Detailed Description</label>
                    <textarea className="nx-input min-h-[150px] border-rose-500/20 focus:border-rose-500/50 focus:bg-rose-500/5" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required placeholder="Provide full details of the infraction..." />
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-white/[0.05] bg-white/[0.02] flex justify-end gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel</button>
                <button form="query-form" type="submit" className="btn-primary bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-500/20 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Issue Disciplinary Query
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
