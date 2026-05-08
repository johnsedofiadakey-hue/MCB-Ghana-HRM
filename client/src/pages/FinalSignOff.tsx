import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../utils/toast';
import { Target, Clock, ShieldCheck, Users, Loader2, CheckCircle, Search, ChevronRight, Trash2, Sparkles } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import PageHeader from '../components/common/PageHeader';
import FlowSteps from '../components/common/FlowSteps';
import EmptyState from '../components/common/EmptyState';
import MCBAIInsight from '../components/layout/MCBAIInsight';
import { useAI } from '../context/AIContext';
import { getStoredUser } from '../utils/session';

interface TeamAppraisal {
  id: string;
  status: string;
  currentStage: string;
  employee: { id: string; fullName: string; jobTitle: string; avatarUrl?: string };
  cycle: { title: string; endDate: string };
  reviews: Review[];
  finalScore?: number;
}

interface Review {
  id: string;
  reviewer: { fullName: string; avatarUrl?: string };
  reviewStage: string;
  overallRating: number | null;
  summary: string;
  submittedAt: string;
}

const FinalSignOff = () => {
  const [appraisals, setAppraisals] = useState<TeamAppraisal[]>([]);
  const [selectedAppraisal, setSelectedAppraisal] = useState<TeamAppraisal | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const { setContextData } = useAI();
  const user = getStoredUser();
  const isStrategicEnabled = (user?.rank || 0) >= 85;

  useEffect(() => {
    if (selectedAppraisal) {
      setContextData({
        type: 'APPRAISAL_SIGN_OFF',
        packetId: selectedAppraisal.id,
        employeeName: selectedAppraisal.employee.fullName,
        reviews: selectedAppraisal.reviews,
        finalScore: selectedAppraisal.finalScore
      });
    } else {
      setContextData(null);
    }
  }, [selectedAppraisal, setContextData]);

  useEffect(() => {
    fetchAwaitingSignOff();
  }, []);

  const fetchAwaitingSignOff = async () => {
    try {
      const res = await api.get('/appraisals/final-sign-off-list');
      setAppraisals(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
      setAppraisals([]);
    } finally {
      setLoading(false);
    }
  };

  const { t, i18n: i18n_fe } = useTranslation();

  const [exporting, setExporting] = useState(false);
  const handlePrint = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExporting(true);
    try {
      const response = await api.get(`/export/appraisal/${id}/pdf?lang=${i18n_fe.language}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `appraisal-report-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      toast.success('PDF Generated');
    } catch (err) {
      toast.error('Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  const [finalComment, setFinalComment] = useState('');
  const handleFinalApproval = async () => {
    if (!selectedAppraisal) return;
    if (!confirm(`Are you sure you want to provide final approval for ${selectedAppraisal.employee.fullName}?`)) return;
    
    setProcessing(true);
    try {
      await api.post('/appraisals/final-sign-off', { 
        packetId: selectedAppraisal.id,
        finalVerdict: finalComment,
        finalScore: selectedAppraisal.finalScore || 0
      });
      toast.success("Evaluation Finalized.");
      setSelectedAppraisal(null);
      setFinalComment('');
      fetchAwaitingSignOff();
    } catch (error: any) {
      toast.error(String(error?.response?.data?.error || 'Error completing approval'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteAppraisal = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the review for ${name}? This cannot be undone.`)) return;
    
    try {
      await api.delete(`/appraisals/packet/${id}`);
      toast.info("Review record removed.");
      if (selectedAppraisal?.id === id) setSelectedAppraisal(null);
      fetchAwaitingSignOff();
    } catch (error: any) {
      toast.error(String(error?.response?.data?.error || 'Error deleting review'));
    }
  };

  const filtered = (appraisals || []).filter(a => a?.employee?.fullName?.toLowerCase().includes(searchTerm?.toLowerCase() || ''));

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 size={32} className="animate-spin text-[var(--growth-light)]" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Loading reviews...</p>
    </div>
  );

  return (
    <div className="space-y-10 page-transition min-h-screen pb-20">
      <PageHeader 
        title="Director Final Approval"
        description="Provide the final decision on performance reviews. This will officially close the record for this cycle."
        icon={ShieldCheck}
        variant="purple"
      />

      <FlowSteps 
        currentStep={3}
        variant="purple"
        steps={[
          { id: 1, label: 'Self Review', description: 'Employee' },
          { id: 2, label: 'Manager Review', description: 'Assessment' },
          { id: 3, label: 'Final Decision', description: 'Director' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Awaiting Approval */}
        <div className="lg:col-span-4 space-y-6">
            <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--growth-light)] transition-colors" size={18} />
                <input 
                    placeholder="Search staff records..." 
                    className="nx-input !pl-14 !bg-[var(--bg-card)]/50 border-[var(--border-subtle)] focus:!border-[var(--growth)]/30"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-3">
               {filtered.length === 0 ? (
                  <EmptyState 
                    title="Queue Empty"
                    description="No performance reviews are currently awaiting final approval."
                    icon={CheckCircle}
                    variant="slate"
                    className="p-10"
                  />
               ) : (
                  filtered.map((appraisal) => (
                    <motion.div
                      whileHover={{ x: 5 }}
                      key={appraisal.id}
                      onClick={() => setSelectedAppraisal(appraisal)}
                      className={cn(
                        "p-6 rounded-[1.8rem] cursor-pointer transition-all duration-300 border relative overflow-hidden group/card",
                        selectedAppraisal?.id === appraisal.id
                          ? "bg-[var(--growth)]/10 border-[var(--growth)]/30 shadow-2xl shadow-[var(--growth)]/10"
                          : "nx-card border-[var(--border-subtle)] hover:border-[var(--primary)]/30"
                      )}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-[var(--growth)]/5 flex items-center justify-center text-xs font-black text-[var(--growth-light)] border border-[var(--growth)]/20">
                              {appraisal?.employee?.fullName?.split(' ')?.map(n => n[0])?.join('')?.slice(0, 2) || '??'}
                           </div>
                           <div>
                             <p className="font-bold text-sm text-[var(--text-primary)]">{appraisal.employee.fullName}</p>
                             <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-0.5">{appraisal.employee.jobTitle}</p>
                           </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]/30">
                         <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
                                <Clock size={12} className="text-[var(--growth-light)]" />
                                Review Stage: <strong className="text-[var(--text-primary)] text-xs ml-1">{(appraisal.currentStage || 'Unknown').replace(/_/g, ' ')}</strong>
                            </span>
                            <button 
                                onClick={(e) => handleDeleteAppraisal(e, appraisal.id, appraisal.employee.fullName)}
                                className="p-2 rounded-lg bg-[var(--primary)]/5 hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                            >
                                <Trash2 size={12} />
                            </button>
                         </div>
                         <ChevronRight size={14} className="text-[var(--text-muted)] group-hover/card:text-[var(--growth-light)] group-hover/card:translate-x-1 transition-all" />
                      </div>
                    </motion.div>
                  ))
               )}
            </div>
        </div>

        {/* Right Column: Approval Area */}
        <div className="lg:col-span-8">
           <AnimatePresence mode="wait">
              {!selectedAppraisal ? (
                  <div className="col-span-full">
                    <EmptyState 
                        title="Sign-off Required"
                        description="Select an appraisal from the queue to provide a final decision."
                        icon={Target}
                        variant="purple"
                        className="h-[60vh]"
                    />
                  </div>
               ) : (
                <motion.div
                  key={selectedAppraisal.id}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="nx-card p-10 border-[var(--border-subtle)] relative bg-[var(--bg-card)]/40 backdrop-blur-3xl overflow-hidden rounded-[2.5rem]"
                >
                  <div className="relative z-10 w-full mb-12 border-b border-[var(--border-subtle)]/50 pb-10">
                    <h2 className="text-4xl font-black text-[var(--text-primary)] font-display tracking-tight uppercase leading-none mb-4">{selectedAppraisal.employee.fullName}</h2>
                    <p className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-3">
                        {selectedAppraisal.employee.jobTitle} 
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-subtle)]" />
                        {selectedAppraisal.cycle.title}
                    </p>
                  </div>

                  <div className="space-y-10 relative z-10">
                     {/* Summary Dashboard */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-8 rounded-[2rem] bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] mb-6 flex items-center gap-2">
                                <Users size={12} /> Review Summary
                            </h4>
                            <div className="space-y-6">
                                {selectedAppraisal.reviews.map(r => (
                                    <div key={r.id} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-[var(--text-muted)] italic">{(r.reviewStage || '').replace(/_/g, ' ')}</span>
                                            <span className="text-xs font-black text-[var(--text-primary)]">{r.overallRating !== null ? `${r.overallRating}%` : '[Hidden]'}</span>
                                        </div>
                                        <div className="w-full h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                            <div className="h-full bg-[var(--primary)]/30" style={{ width: `${r.overallRating || 0}%` }} />
                                        </div>
                                        {r.summary && (
                                            <p className="text-[9px] text-[var(--text-muted)] leading-relaxed font-medium pl-3 border-l border-[var(--border-subtle)] tracking-tighter italic">
                                                "{r.summary}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="flex-1 p-10 rounded-[2.5rem] bg-[var(--growth)]/5 border border-[var(--growth)]/10 flex flex-col items-center justify-center text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--growth-light)] mb-4 italic">Performance Score</p>
                                <div className="text-7xl font-black text-[var(--text-primary)] font-display leading-none mb-2">{selectedAppraisal.finalScore !== null && selectedAppraisal.finalScore !== undefined ? selectedAppraisal.finalScore : '[Hidden]'}</div>
                                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Final Score</div>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-4 italic">Final Conclusion</label>
                                <textarea 
                                    value={finalComment}
                                    onChange={(e) => setFinalComment(e.target.value)}
                                    placeholder="Add final comments for the official record..."
                                    className="nx-input min-h-[100px] !bg-[var(--bg-elevated)]/50 !rounded-2xl"
                                />
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleFinalApproval}
                                disabled={processing}
                                className="w-full py-6 rounded-[2rem] bg-[var(--growth)] text-white flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-[var(--growth)]/30 group"
                            >
                                {processing ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} className="group-hover:rotate-12 transition-transform" />}
                                {processing ? 'FINISHING...' : 'PROVIDE FINAL APPROVAL'}
                            </motion.button>

                             <div className="flex gap-4">
                                <button
                                    onClick={(e) => handlePrint(e, selectedAppraisal.id)}
                                    disabled={exporting}
                                    className="flex-1 py-4 rounded-[1.5rem] border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center gap-3 text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                    {exporting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    Download Official Report
                                </button>
                                
                                {isStrategicEnabled && (
                                    <button
                                        onClick={() => setIsAIOpen(true)}
                                        className="px-6 rounded-[1.5rem] bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-500 hover:text-amber-400 hover:border-amber-500/50 transition-all flex items-center justify-center gap-3 text-[9px] font-black uppercase tracking-widest group shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                                    >
                                        <Sparkles size={14} className="group-hover:scale-125 transition-transform" />
                                        Strategic Intelligence
                                    </button>
                                )}
                             </div>
                         </div>
                      </div>
                  </div>
                </motion.div>
               )}
           </AnimatePresence>
        </div>
      </div>

      <MCBAIInsight 
        isOpen={isAIOpen} 
        onClose={() => setIsAIOpen(false)} 
      />
    </div>
  );
};

export default FinalSignOff;
