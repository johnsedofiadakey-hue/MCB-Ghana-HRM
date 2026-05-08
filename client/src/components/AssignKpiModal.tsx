import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Plus, Trash2, Save, Target, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRoleRankValue } from '../utils/session';

interface AssignKpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onSuccess: () => void;
}

type KpiItem = {
  category: string;
  description: string;
  weight: number;
  target: number;
  type?: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};

const AssignKpiModal = ({ isOpen, onClose, employeeId, employeeName, onSuccess }: AssignKpiModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState(`Performance Targets - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const year = new Date().getFullYear();

  const [items, setItems] = useState<KpiItem[]>([]);
  const [isTemplate, setIsTemplate] = useState(false);
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [mandates, setMandates] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchMandates();
    }
  }, [isOpen]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); }
  };

  const fetchMandates = async () => {
    try {
      const u = getStoredUser();
      const res = await api.get('/kpi/mandates', { 
        params: { departmentId: u.departmentId, month, year } 
      });
      setMandates(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('[AssignKpiModal] Failed to fetch mandates:', err);
    }
  };

  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight), 0);

  const addItem = () => {
    setItems([...items, { category: 'New Initiative', description: '', weight: 0, target: 0, type: 'LEADING' }]);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof KpiItem, value: string) => {
    const newItems = [...items];
    const parsedValue = (field === 'weight' || field === 'target') ? Number(value) : value;
    newItems[index] = { ...newItems[index], [field]: parsedValue } as KpiItem;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Removed 100% cumulative weight restriction as per new 1-10 scale guidelines

    setLoading(true);
    try {
      const payload = { 
        title, 
        employeeId: isTemplate ? null : employeeId, 
        targetDepartmentId: isTemplate ? targetDepartmentId : null,
        isTemplate,
        month, 
        year, 
        items 
      };
      await api.post('/kpi/assign', payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to deploy targets.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[var(--bg-main)]/80 backdrop-blur-xl"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass w-full max-w-6xl bg-[var(--bg-card)]/90 border-[var(--border-subtle)] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl shadow-[var(--primary)]/10 rounded-[2.5rem]"
          >
            {/* Header */}
            <div className="p-8 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-elevated)]/30">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20">
                  <Target className="text-[var(--primary)]" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase tracking-widest">
                    {isTemplate ? 'Template Creation' : 'Goal Assignment'}
                  </h2>
                  <p className="text-[13px] font-bold text-[var(--text-secondary)] mt-0.5 opacity-60">
                    {isTemplate 
                      ? 'Defining reusable goals for department-wide use' 
                      : <span>Defining individual goals for <span className="text-[var(--primary)] font-bold underline decoration-[var(--primary)] decoration-2 underline-offset-4">{employeeName}</span></span>
                    }
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all"
              >
                <X size={24} />
              </button>
            </div>
            {/* ... rest of the component body ... */}

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
              {/* Form Section */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 text-xs font-black uppercase tracking-widest"
                    >
                      <AlertCircle size={18} /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Period Label</label>
                    <input 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)}
                      className="nx-input" 
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Target Month</label>
                    <select 
                      value={month} 
                      onChange={(e) => setMonth(Number(e.target.value))}
                      className="nx-input appearance-none"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Target Year</label>
                    <input value={year} className="nx-input opacity-50" readOnly />
                  </div>
                </div>

                {getRoleRankValue(getStoredUser().role) >= 80 && (
                  <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center border border-[var(--primary)]/20">
                        <ShieldCheck className="text-[var(--primary)]" size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest leading-none">Template Mode</p>
                        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mt-1">Create a template for others to follow</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div 
                          onClick={() => setIsTemplate(!isTemplate)}
                          className={cn(
                            "w-12 h-6 rounded-full p-1 transition-all duration-300",
                            isTemplate ? "bg-[var(--primary)]" : "bg-[var(--bg-elevated)]"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 bg-[var(--bg-card)] rounded-full transition-transform duration-300 shadow-sm",
                            isTemplate ? "translate-x-6" : "translate-x-0"
                          )} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Activate Template</span>
                      </label>
                      {isTemplate && (
                        <select 
                          className="nx-input-small min-w-[200px]"
                          value={targetDepartmentId}
                          onChange={e => setTargetDepartmentId(e.target.value)}
                        >
                          <option value="">-- Apply Globally --</option>
                          {(departments || []).filter(Boolean).map(d => <option key={d.id} value={d.id}>{d.name || 'Department'}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex justify-between items-end px-1">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.25em] text-[var(--text-primary)]">Execution Parameters</h3>
                      <p className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-widest font-bold">Assign weight to each objective</p>
                    </div>
                    <div className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)]"
                    )}>
                      Total Priority Mass: {totalWeight}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={index} 
                        className="group p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all shadow-sm flex flex-col md:flex-row gap-5 items-center"
                      >
                        <input 
                          placeholder="Category"
                          value={item.category}
                          onChange={(e) => updateItem(index, 'category', e.target.value)}
                          className="nx-input md:w-32 text-xs font-black uppercase tracking-widest text-[var(--primary)]"
                        />
                        <select 
                          value={item.type || 'LEADING'}
                          onChange={(e) => updateItem(index, 'type', e.target.value)}
                          className="nx-input md:w-28 text-xs font-black uppercase tracking-widest bg-[var(--bg-elevated)]"
                        >
                          <option value="LEADING" className="bg-[var(--bg-card)]">Leading</option>
                          <option value="LAGGING" className="bg-[var(--bg-card)]">Lagging</option>
                        </select>
                        <input 
                          placeholder="Define the objective..."
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="nx-input flex-1 text-sm font-semibold text-[var(--text-primary)]"
                        />
                        <div className="flex items-center gap-4 w-full md:w-auto">
                           <div className="relative flex-1 md:w-28">
                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">W</span>
                             <input 
                              type="number" 
                              min="1"
                              max="10"
                              value={item.weight}
                              onChange={(e) => updateItem(index, 'weight', e.target.value)}
                              className="nx-input text-center pr-8 w-full bg-white/5 border-white/5 text-white"
                            />
                          </div>
                          <div className="relative flex-1 md:w-28">
                            <input 
                              type="number" 
                              placeholder="Level"
                              value={item.target}
                              onChange={(e) => updateItem(index, 'target', e.target.value)}
                              className="nx-input text-center w-full bg-white/5 border-white/5 text-white"
                            />
                          </div>
                          <button 
                            onClick={() => removeItem(index)}
                            className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <button 
                    onClick={addItem}
                    className="w-full py-5 rounded-3xl border border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 text-[var(--text-muted)] hover:text-[var(--primary)] text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 group"
                  >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
                    <span>Insert Operational Goal</span>
                  </button>
                </div>
              </div>

              {/* Template Help Sidebar */}
              <div className="w-96 border-l border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-10 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <ShieldCheck className="text-emerald-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Goal Templates</h3>
                    <p className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-widest mt-0.5">Global Directives</p>
                  </div>
                </div>

                {mandates.length > 0 ? (
                  <div className="space-y-4">
                    {(mandates || []).filter(Boolean).map((m, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={m.id || idx} 
                        className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/30 transition-all"
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-2">{m.title || 'Untitled Mandate'}</p>
                        <div className="space-y-2 mb-3">
                          {(m.items || []).filter(Boolean).map((item: any, i: number) => (
                            <div key={i} className="text-[10px] text-slate-400 flex justify-between gap-2 border-b border-white/5 pb-1">
                              <span>• {item.name || 'Objective'}</span>
                              <span className="text-emerald-500/50">W: {item.weight || 0}</span>
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={() => {
                            const newItems = (m.items || []).filter(Boolean).map((i: any) => ({
                              category: i.category || 'Strategic',
                              description: i.description || i.name || 'Objective',
                              weight: i.weight || 0,
                              target: i.targetValue || 0
                            }));
                            setItems([...items, ...newItems]);
                          }}
                          className="w-full py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          Import All Items
                        </button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 opacity-30 grayscale">
                    <Target size={40} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No active mandates</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex justify-end gap-5">
              <button 
                onClick={onClose}
                className="px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-primary/30"
              >
                {loading ? 'Processing...' : (
                  <div className="flex items-center gap-2">
                    <Save size={18} /> {isTemplate ? 'Publish Template' : 'Assign Goals'}
                  </div>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AssignKpiModal;