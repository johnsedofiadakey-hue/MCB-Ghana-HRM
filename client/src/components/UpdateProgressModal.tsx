import { useEffect, useState } from 'react';
import api from '../services/api';
import { X, Save, Activity, Target, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressItem {
  id: string;
  description: string;
  name?: string;
  targetValue: number;
  weight: number;
  actualValue: number | null;
}

interface ProgressSheet {
  id: string;
  items: ProgressItem[];
}

interface FormItem {
  id: string;
  description: string;
  name?: string;
  target: number;
  weight: number;
  actualValue: number | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sheet: ProgressSheet | null;
  onSuccess: () => void;
}

const UpdateProgressModal = ({ isOpen, onClose, sheet, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormItem[]>([]);

  useEffect(() => {
    if (!sheet) return;
    setFormData(
      (sheet?.items || []).map((item) => ({
        id: item?.id || '',
        description: item?.description || item?.name || 'Goal',
        name: item?.name,
        target: item?.targetValue || 0,
        weight: item?.weight || 0,
        actualValue: item?.actualValue
      }))
    );
  }, [sheet]);

  const handleChange = (index: number, val: string) => {
    const newData = [...formData];
    newData[index].actualValue = (val === '' ? null : Number(val)) as any;
    setFormData(newData);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (!sheet?.id) return;
      await api.patch('/kpis/update-progress', {
        sheetId: sheet.id,
        items: (formData || []).map((f) => ({
          id: f?.id,
          actualValue: Number(f?.actualValue || 0)
        }))
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Data Synchronization Error: Failed to commit progress.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {(isOpen && sheet) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass w-full max-w-2xl bg-[#0a0f1e]/90 border-white/[0.05] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl shadow-primary/10"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Activity className="text-primary-light" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white font-display tracking-tight">Telemetric Update</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">Real-time Performance Sync</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest"
                  >
                    <AlertCircle size={18} /> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                {(formData || []).map((item, index) => (
                  <motion.div
                    layout
                    key={item?.id || index}
                    className="group p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-primary/20 transition-all flex flex-col md:flex-row gap-6 items-center"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Target size={14} className="text-primary-light" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-white truncate">{item?.description || item?.name || 'Goal'}</h4>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Target: <span className="text-slate-200">{item?.target || 0}</span>
                        </div>
                        <div className="px-3 py-1 rounded-lg bg-primary/5 border border-primary/10 text-[10px] font-black uppercase tracking-widest text-primary-light">
                          Weight: {item?.weight || 0}
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-48 space-y-2 mt-4 md:mt-0">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Personnel Result</label>
                      <input
                        type="number"
                        value={item?.actualValue === null ? '' : item?.actualValue}
                        onChange={(e) => handleChange(index, e.target.value)}
                        className="nx-input text-right font-black text-lg py-3 border-white/5 bg-white/[0.03] focus:bg-white/[0.05] text-primary-light w-full"
                        placeholder="0"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-white/[0.05] bg-white/[0.01] flex justify-end gap-4">
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Syncing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save size={16} /> Commit Telemetry
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

export default UpdateProgressModal;