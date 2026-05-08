import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, MapPin, CheckCircle2
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';

interface InterviewSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
}

const InterviewSchedulerModal = ({ isOpen, onClose, candidateId, candidateName }: InterviewSchedulerModalProps) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]); // Potential interviewers
  const [form, setForm] = useState({
    stage: 'TECHNICAL_INTERVIEW',
    scheduledAtDate: '',
    scheduledAtTime: '',
    interviewerId: '',
    location: 'Remote (Zoom/Meet)',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchInterviewers();
    }
  }, [isOpen]);

  const fetchInterviewers = async () => {
    try {
      const res = await api.get('/employees?role=MANAGER,HR_OFFICER,IT_MANAGER,DIRECTOR');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.scheduledAtDate || !form.scheduledAtTime || !form.interviewerId) {
       return toast.error('Please complete all mandatory fields');
    }

    try {
      setLoading(true);
      const scheduledAt = `${form.scheduledAtDate}T${form.scheduledAtTime}:00`;
      await api.post('/recruitment/interviews', {
        candidateId,
        stage: form.stage,
        scheduledAt,
        interviewerId: form.interviewerId,
        location: form.location,
        notes: form.notes
      });
      toast.success('Interview successfully synchronized with schedule');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to schedule interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-black/60 backdrop-blur-xl" 
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="w-full max-w-xl bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-subtle)] shadow-2xl relative z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="px-10 py-10 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex justify-between items-center">
              <div className="flex items-center gap-5">
                 <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-600 shadow-lg">
                    <Calendar size={24} />
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter uppercase">Schedule Interview</h2>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1 opacity-60">Candidate: {candidateName}</p>
                 </div>
              </div>
              <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Interview Stage</label>
                  <select 
                    className="nx-input" 
                    value={form.stage} 
                    onChange={e => setForm({ ...form, stage: e.target.value })}
                  >
                    <option value="SCREENING">Initial Screening</option>
                    <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
                    <option value="CULTURE_FIT">Culture Fit</option>
                    <option value="FINAL_ROUND">MD / Final Round</option>
                  </select>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Proposed Date</label>
                    <input 
                      type="date" 
                      className="nx-input" 
                      value={form.scheduledAtDate}
                      onChange={e => setForm({ ...form, scheduledAtDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Time (Local)</label>
                    <input 
                      type="time" 
                      className="nx-input" 
                      value={form.scheduledAtTime}
                      onChange={e => setForm({ ...form, scheduledAtTime: e.target.value })}
                    />
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Assigned Interviewer</label>
                  <select 
                    className="nx-input" 
                    value={form.interviewerId} 
                    onChange={e => setForm({ ...form, interviewerId: e.target.value })}
                  >
                    <option value="">Select Interviewer</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                    ))}
                  </select>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Location / Link</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input 
                      type="text" 
                      className="nx-input pl-12" 
                      placeholder="Meeting link or office room"
                      value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })}
                    />
                  </div>
               </div>

               <div className="pt-6">
                 <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-16 rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[var(--primary)]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   {loading ? 'Synchronizing...' : (
                     <>
                       <CheckCircle2 size={18} /> Schedule Deployment
                     </>
                   )}
                 </button>
               </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InterviewSchedulerModal;
