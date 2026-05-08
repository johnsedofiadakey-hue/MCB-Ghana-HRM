import { useState } from 'react';
import api from '../services/api';
import { X, CheckCircle, XCircle, MessageSquare, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReviewKpiModalProps {
    isOpen: boolean;
    onClose: () => void;
    sheetId: string;
    employeeName: string;
    onSuccess: () => void;
}

const ReviewKpiModal = ({ isOpen, onClose, sheetId, employeeName, onSuccess }: ReviewKpiModalProps) => {
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState('');

    const handleReview = async (decision: 'APPROVE' | 'REJECT') => {
        if (decision === 'REJECT' && !feedback) {
            setError("Mandatory Requirement: Please provide feedback for rejection.");
            return;
        }

        setLoading(true);
        setError('');
        try {
            await api.post('/kpis/review', { sheetId, decision, feedback });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.error || "Executive Audit Failure: Unable to process review.");
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
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass w-full max-w-lg bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl shadow-[var(--primary)]/10"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <ShieldCheck className="text-primary-light" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white font-display tracking-tight">Executive Review</h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">Final Authorization Layer</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-slate-500 hover:text-white transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-6">
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <AlertCircle size={16} /> {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                                <p className="text-sm font-medium text-slate-300 leading-relaxed">
                                    Performing strategic evaluation for <span className="text-primary-light font-bold underline underline-offset-4 decoration-primary/30">{employeeName}</span>. 
                                    Please provide authoritative feedback before finalizing this cycle.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 ml-1">
                                    <MessageSquare size={14} className="text-slate-500" />
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Executive Feedback</label>
                                </div>
                                <textarea
                                    className="nx-input min-h-[140px] py-4 resize-none text-sm font-medium bg-white/[0.02] border-white/5 focus:bg-white/[0.05]"
                                    placeholder="Enter strategic observations or improvement protocols..."
                                    value={feedback}
                                    onChange={e => { setFeedback(e.target.value); if(error) setError(''); }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleReview('REJECT')}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-3 p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-500/10 transition-all"
                                >
                                    <XCircle size={16} /> Reject Cycle
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleReview('APPROVE')}
                                    disabled={loading}
                                    className="btn-primary p-4 rounded-2xl justify-center text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <CheckCircle size={16} className="mr-2" /> Approve & Lock
                                        </>
                                    )}
                                </motion.button>
                            </div>

                            <div className="pt-2">
                                <button 
                                    onClick={async () => {
                                        if (window.confirm("CRITICAL: This will permanently wipe all staff progress for this mission. Proceed with complete reset?")) {
                                            setLoading(true);
                                            try {
                                                await api.delete(`/kpis/${sheetId}`);
                                                onSuccess();
                                                onClose();
                                            } catch (err: any) {
                                                setError(err?.response?.data?.error || "Reset Failed: Unable to wipe mission data.");
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    }}
                                    disabled={loading}
                                    className="w-full py-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-rose-400 transition-colors border border-dashed border-white/5 rounded-2xl hover:border-rose-500/30 hover:bg-rose-500/5"
                                >
                                    Clear & Reset Mission (Fresh Start)
                                </button>
                            </div>
                        </div>

                        {/* Audit Footer */}
                        <div className="px-8 py-4 bg-white/[0.01] border-t border-white/[0.03] text-center">
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-700">Audit Trail: Personnel_ID_{sheetId.slice(-8)}</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ReviewKpiModal;
