import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mail, Phone, FileText, ExternalLink, 
  User, ArrowRight, Calendar, Zap
} from 'lucide-react';
import api from '../../services/api';
import { cn } from '../../utils/cn';
import { toast } from '../../utils/toast';
import InterviewSchedulerModal from './InterviewSchedulerModal';

interface CandidateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
}

const statusThemes: Record<string, string> = {
  APPLIED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  SCREENING: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20',
  INTERVIEW_SCHEDULED: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  OFFERED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  HIRED: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20',
};

const CandidateListModal = ({ isOpen, onClose, jobId, jobTitle }: CandidateListModalProps) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulingFor, setSchedulingFor] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    if (isOpen && jobId) {
      fetchCandidates();
    }
  }, [isOpen, jobId]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/recruitment/candidates?jobPositionId=${jobId}`);
      setCandidates(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch candidate pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (candidateId: string, newStatus: string) => {
    if (newStatus === 'INTERVIEW_SCHEDULED') {
      const cand = candidates.find(c => c.id === candidateId);
      setSchedulingFor({ id: candidateId, name: cand.fullName });
      return;
    }

    try {
      await api.patch(`/recruitment/candidates/${candidateId}/status`, { status: newStatus });
      toast.success(`Candidate moved to ${newStatus}`);
      fetchCandidates();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={onClose} 
              className="absolute inset-0 bg-black/60 backdrop-blur-xl" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-4xl bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-subtle)] shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-10 py-10 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter uppercase">{jobTitle}</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1 opacity-60">Candidate Pipeline · {candidates.length} Applicants</p>
                </div>
                <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Fetching Applicants</p>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mx-auto opacity-20">
                      <User size={40} />
                    </div>
                    <p className="text-[var(--text-muted)] font-black uppercase tracking-widest text-[11px]">No applications received for this position yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {candidates.map((candidate) => (
                      <motion.div 
                        key={candidate.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-8 rounded-3xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] relative group overflow-hidden"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                          <div className="flex items-start gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-[var(--text-inverse)] text-xl font-black shadow-lg">
                              {candidate.fullName[0]}
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-[var(--text-primary)]">{candidate.fullName}</h3>
                              <div className="flex flex-wrap items-center gap-4 mt-2">
                                <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-bold">
                                  <Mail size={14} className="opacity-40" /> {candidate.email}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-bold">
                                  <Phone size={14} className="opacity-40" /> {candidate.phone || 'No phone'}
                                </span>
                              </div>
                              <div className="mt-4 flex items-center gap-3">
                                <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm", statusThemes[candidate.status] || 'bg-slate-500/10 text-slate-500')}>
                                  {candidate.status.replace(/_/g, ' ')}
                                </span>
                                {candidate.resumeUrl && (
                                  <a 
                                    href={candidate.resumeUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--primary)] hover:underline"
                                  >
                                    <FileText size={14} /> Resume <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={async () => {
                                const loadingToast = toast.loading('AI Analyzing candidate fit...');
                                try {
                                  const res = await api.post('/ai/parse-resume', { candidateId: candidate.id });
                                  const aires = res.data;
                                  toast.dismiss(loadingToast);
                                  toast.success(`AI Match Score: ${aires.matchScore}%`);
                                } catch (e) {
                                  toast.dismiss(loadingToast);
                                  toast.error('AI Analysis failed.');
                                }
                              }}
                              className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2"
                            >
                               <Zap size={12} /> AI Scan
                            </button>

                            {['SCREENING', 'INTERVIEW_SCHEDULED', 'OFFERED', 'REJECTED'].map((status) => (
                              candidate.status !== status && (
                                <button 
                                  key={status}
                                  onClick={() => handleStatusUpdate(candidate.id, status)}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    status === 'REJECTED' ? "bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white" : "bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                                  )}
                                >
                                  {status === 'INTERVIEW_SCHEDULED' && <Calendar size={12} />}
                                  {status === 'INTERVIEW_SCHEDULED' ? 'Schedule' : status.replace('SCHEDULED', '')}
                                </button>
                              )
                            ))}
                          </div>
                        </div>
                        
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                           <ArrowRight size={40} className="rotate-[-45deg]" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-10 py-8 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex justify-end">
                <button 
                  onClick={onClose}
                  className="px-8 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest hover:text-[var(--primary)] transition-all"
                >
                  Close Pipeline
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <InterviewSchedulerModal 
        isOpen={!!schedulingFor}
        onClose={() => { setSchedulingFor(null); fetchCandidates(); }}
        candidateId={schedulingFor?.id || ''}
        candidateName={schedulingFor?.name || ''}
      />
    </>
  );
};

export default CandidateListModal;
