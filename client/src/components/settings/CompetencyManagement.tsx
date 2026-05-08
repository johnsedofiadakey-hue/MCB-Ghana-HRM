import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, Save, X, Info } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Competency {
  id: string;
  name: string;
  description: string;
  weight: number;
}

const CompetencyManagement: React.FC = () => {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', weight: 5 });
  const [showAdd, setShowAdd] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    fetchCompetencies();
  }, []);

  const fetchCompetencies = async () => {
    try {
      const res = await api.get('/competencies');
      setCompetencies(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/competencies/${editingId}`, formData);
        toast.success("Competency updated");
      } else {
        await api.post('/competencies', formData);
        toast.success("Competency added");
      }
      setEditingId(null);
      setShowAdd(false);
      setFormData({ name: '', description: '', weight: 5 });
      fetchCompetencies();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will remove this appraisal area for new appraisals.")) return;
    try {
      await api.delete(`/competencies/${id}`);
      toast.success("Competency removed");
      fetchCompetencies();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete");
    }
  };

  const startEdit = (c: Competency) => {
    setEditingId(c.id);
    setFormData({ name: c.name, description: c.description, weight: c.weight });
    setShowAdd(true);
  };

  const totalWeight = competencies.reduce((acc, c) => acc + c.weight, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-black text-[var(--text-primary)] font-display">Competency Framework</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Define areas for performance appraisal</p>
        </div>
        {!showAdd && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setShowAdd(true); setEditingId(null); setFormData({ name: '', description: '', weight: 5 }); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 text-primary-light border border-primary/30 text-[10px] font-black uppercase tracking-widest"
          >
            <Plus size={14} /> Add Area
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 rounded-3xl bg-primary/5 border border-primary/20 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4">
              <button onClick={() => setShowGuide(false)} className="text-primary-light/40 hover:text-primary-light transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary-light flex-shrink-0">
                <Info size={20} />
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-display font-black text-[var(--text-primary)] text-base">Professional Setting Guide</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Set clear, measurable areas for appraisal to ensure transparency. Use <strong>Weights</strong> to prioritize what matters most to your organization.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                    <p className="text-[10px] font-black uppercase text-[var(--primary)] mb-2">Example: Technical Proficiency</p>
                    <p className="text-[11px] text-[var(--text-secondary)] italic">"Consistently delivers bug-free code, adheres to architectural patterns, and mentors junior engineers."</p>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] mt-2">Recommended Weight: 6 / 10</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                    <p className="text-[10px] font-black uppercase text-[var(--success)] mb-2">Example: Target Delivery</p>
                    <p className="text-[11px] text-[var(--text-secondary)] italic">"Achieves quarterly sales targets and maintains a healthy lead pipeline. Accurate forecasting."</p>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] mt-2">Recommended Weight: 8 / 10</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--warning)]/5 border border-[var(--warning)]/10">
                    <p className="text-[10px] font-black uppercase text-[var(--warning)] mb-1">How Weighting Works</p>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        Weights determine the priority of each area in the final calculation. A scale of 1-10 ensures clarity in expectations.
                    </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSave}
            className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Area Name</label>
                <input
                  required
                  className="nx-input p-3 font-bold"
                  placeholder="e.g. Communication & Teamwork"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
               <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Priority Weight (1-10)</label>
                <input
                  required
                   type="number"
                  min="1"
                  max="10"
                  className="nx-input p-3 font-bold"
                  value={formData.weight}
                  onChange={e => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Description (Clarity for Staff)</label>
              <textarea
                required
                className="nx-input p-3 font-bold resize-none h-24"
                placeholder="Success Looks Like: Communicates status early, collaborates across departments, and resolves conflicts constructively."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
              >
                <Save size={14} /> {editingId ? 'Update Area' : 'Save Area'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {competencies.length === 0 && !loading ? (
          <div className="p-10 text-center rounded-[2rem] border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)]">
            <Info size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">No custom competencies defined</p>
            <p className="text-[10px] mt-2 opacity-60">System will use defaults if none are provided.</p>
          </div>
        ) : (
          competencies.map((c) => (
            <motion.div
              layout
              key={c.id}
              className="group p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                   <h4 className="font-bold text-[var(--text-primary)] text-sm">{c.name}</h4>
                  <span className="px-2 py-0.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[9px] font-black text-[var(--text-muted)]">Weight: {c.weight}</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-1">{c.description}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(c)}
                  className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

       {competencies.length > 0 && (
        <div className="p-4 rounded-xl border flex items-center gap-3 bg-primary/10 border-primary/20 text-primary-light">
          <Info size={16} />
          <p className="text-[10px] font-black uppercase tracking-widest">
            Total Framework Weighting Mass: {totalWeight}
          </p>
        </div>
      )}
    </div>
  );
};

export default CompetencyManagement;
