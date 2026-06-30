import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShieldCheck, Scale, Award, 
  Target, AlertTriangle, ChevronRight, 
  CheckCircle, Plus, Trash2, Info 
} from 'lucide-react';
import { cn } from '../../utils/cn';
import api from '../../services/api';
import { toast } from '../../utils/toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  packet: any;
  onFinalized?: () => void;
  onFinalize?: (data: { finalScore: number; finalVerdict: string; assignedTargets: any[] }) => Promise<void>;
  loading?: boolean;
}

const FinalizePerformanceReviewModal: React.FC<Props> = ({ isOpen, onClose, packet, onFinalized, onFinalize, loading: externalLoading }) => {
  const [suggestion, setSuggestion] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [verdict, setVerdict] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const loading = externalLoading ?? localLoading;

  // Growth targets state
  const [targets, setTargets] = useState<any[]>([]);
  const [newTarget, setNewTarget] = useState({ title: '', description: '', metricTitle: '', metricValue: 5, metricUnit: 'tasks' });
  const [showAddTarget, setShowAddTarget] = useState(false);

  useEffect(() => {
    if (packet?.reviews) {
      const self = packet.reviews.find((r: any) => r.reviewStage === 'SELF_REVIEW' && r.status === 'SUBMITTED');
      const manager = packet.reviews.find((r: any) => r.reviewStage === 'MANAGER_REVIEW' && r.status === 'SUBMITTED');
      
      const selfScore = self?.overallRating || 0;
      const managerScore = manager?.overallRating || 0;
      
      // Suggested score: 20% Self, 80% Manager
      const suggested = Math.round((selfScore * 0.2) + (managerScore * 0.8));
      setSuggestion(suggested);
      setFinalScore(suggested);
    }
  }, [packet]);

  const handleFinalize = async () => {
    if (!verdict || verdict.trim().length < 10) {
      toast.error('Please provide a final comment (at least 10 characters).');
      return;
    }

    setLocalLoading(true);
    try {
      const payload = {
        finalScore,
        finalVerdict: verdict,
        assignedTargets: targets
      };
      if (onFinalize) {
        await onFinalize(payload);
      } else {
        await api.post('/appraisals/final-sign-off', { packetId: packet.id, ...payload });
      }
      toast.success('Performance review finalized and closed.');
      onFinalized?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to finalize review.');
    } finally {
      setLocalLoading(false);
    }
  };

  const addTarget = () => {
    if (!newTarget.title) return;
    setTargets([...targets, { ...newTarget, id: Date.now() }]);
    setNewTarget({ title: '', description: '', metricTitle: '', metricValue: 5, metricUnit: 'tasks' });
    setShowAddTarget(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="glass w-full max-w-4xl max-h-[90vh] overflow-y-auto border-white/10 p-10 relative shadow-2xl rounded-[3rem]"
      >
        <button onClick={onClose} className="absolute top-8 right-8 p-3 hover:bg-white/5 rounded-full text-slate-500">
          <X size={24} />
        </button>

        <div className="flex items-center gap-6 mb-12">
          <div className="w-16 h-16 rounded-[2rem] bg-[var(--growth)]/10 flex items-center justify-center border border-[var(--growth)]/20 shadow-2xl shadow-[var(--growth)]/20">
            <ShieldCheck className="text-[var(--growth-light)]" size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Final Performance Review</h2>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-2">
              Closing Session <ChevronRight size={12} /> {packet.employee.fullName}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Scoring Area */}
          <div className="space-y-10">
            <div className="p-8 rounded-[2rem] bg-[var(--primary)]/5 border border-[var(--primary)]/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Target size={80} className="text-[var(--primary)]" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--primary)] mb-8 flex items-center gap-2">
                    <Award size={14} /> Scoring Summary
                </h4>

                <div className="flex items-end gap-6 mb-10">
                   <div className="flex-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 italic">Suggested Score</p>
                      <div className="text-5xl font-black text-white">{suggestion}%</div>
                   </div>
                   <div className="flex-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] mb-2 italic">Final Approved Score</p>
                      <input 
                        type="number" 
                        className="nx-input !text-3xl !font-black !py-2 !px-4"
                        value={finalScore}
                        onChange={(e) => setFinalScore(Number(e.target.value))}
                        max={100}
                        min={0}
                      />
                   </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--text-primary)] opacity-80">
                   <Info size={16} className="shrink-0" />
                   <p className="text-xs font-medium">This suggestion is calculated based on 20% of the employee's self-review and 80% of the manager's assessment.</p>
                </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-4 italic">Final Review Comments</label>
              <textarea 
                placeholder="Provide a final summary of this performance period, including overall results and key areas of focus..."
                className="nx-input min-h-[150px] !rounded-[2rem] !p-8"
                value={verdict}
                onChange={(e) => setVerdict(e.target.value)}
              />
            </div>
          </div>

          {/* Growth & Development Area */}
          <div className="space-y-8">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                   <Target className="text-[var(--growth-light)]" size={18} /> Future Goals
                </h3>
                <button 
                  onClick={() => setShowAddTarget(true)}
                  className="p-2.5 rounded-xl bg-[var(--growth)]/10 text-[var(--growth-light)] hover:bg-[var(--growth)]/20 transition-all border border-[var(--growth)]/20 shadow-xl shadow-[var(--growth)]/10"
                >
                   <Plus size={18} />
                </button>
             </div>

             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                   {targets.length === 0 ? (
                      <motion.div className="p-10 border-2 border-dashed border-white/5 rounded-[2rem] text-center">
                         <Target size={32} className="mx-auto text-slate-700 mb-4 opacity-50" />
                         <p className="text-xs font-bold text-slate-500">No specific growth goals assigned yet.</p>
                      </motion.div>
                   ) : (
                      targets.map(t => (
                        <motion.div key={t.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-[2rem] glass border-white/5 flex items-start justify-between group">
                           <div>
                              <h4 className="font-bold text-white text-sm mb-1">{t.title}</h4>
                              <p className="text-[10px] text-slate-500 font-medium mb-3">{t.description}</p>
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                 {t.metricValue} {t.metricUnit}
                              </div>
                           </div>
                           <button onClick={() => setTargets(targets.filter(x => x.id !== t.id))} className="p-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all">
                              <Trash2 size={14} />
                           </button>
                        </motion.div>
                      ))
                   )}

                   {showAddTarget && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 border-[var(--growth)]/30 space-y-4 rounded-[2rem] bg-[var(--growth)]/5 shadow-2xl">
                         <input 
                           placeholder="Goal Title (e.g. Sales Training)"
                           className="nx-input !bg-white/5 !border-white/10"
                           value={newTarget.title}
                           onChange={e => setNewTarget({...newTarget, title: e.target.value})}
                         />
                         <textarea 
                           placeholder="Briefly describe what needs to be achieved..."
                           className="nx-input !bg-white/5 !border-white/10 min-h-[80px]"
                           value={newTarget.description}
                           onChange={e => setNewTarget({...newTarget, description: e.target.value})}
                         />
                         <div className="grid grid-cols-2 gap-4">
                            <input 
                               type="number"
                               placeholder="Metric Value"
                               className="nx-input !bg-white/5 !border-white/10"
                               value={newTarget.metricValue}
                               onChange={e => setNewTarget({...newTarget, metricValue: Number(e.target.value)})}
                            />
                            <input 
                               placeholder="Unit (e.g. tasks, %)"
                               className="nx-input !bg-white/5 !border-white/10"
                               value={newTarget.metricUnit}
                               onChange={e => setNewTarget({...newTarget, metricUnit: e.target.value})}
                            />
                         </div>
                         <div className="flex gap-2 pt-2">
                           <button onClick={addTarget} className="flex-1 py-3 bg-[var(--growth)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Add Goal</button>
                           <button onClick={() => setShowAddTarget(false)} className="px-6 py-3 bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>

             <div className="pt-8 flex flex-col items-center">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleFinalize}
                  disabled={loading}
                  className="w-full py-6 rounded-[2rem] bg-[var(--growth)] text-white flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-[var(--growth)]/20 transition-all group lg:mt-6"
                >
                  {loading ? <CheckCircle className="animate-pulse" size={18} /> : <ShieldCheck size={18} className="group-hover:rotate-12 transition-transform" />}
                  {loading ? 'Finalizing Review...' : 'Close & Finalize Review'}
                </motion.button>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-6 flex items-center gap-2">
                  <AlertTriangle size={12} className="text-amber-500/50" /> This action cannot be undone.
                </p>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FinalizePerformanceReviewModal;
