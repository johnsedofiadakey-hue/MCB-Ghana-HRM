import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Zap, CheckCircle2, XCircle, Clock, Search, 
    Filter, ArrowRight, User, Briefcase, DollarSign,
    AlertCircle, Loader2, ChevronRight
} from 'lucide-react';
import api from '../services/api';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';
import { toast } from '../utils/toast';
import { getStoredUser, hasPermission } from '../utils/session';

const PromotionRequests = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [hrComment, setHrComment] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const { t } = useTranslation();
    const user = getStoredUser();
    const canApprove = hasPermission(user, 'compensation.manage');

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await api.get('/hr/promotions');
            setRequests(res.data);
        } catch (err) {
            toast.error('Failed to load promotion requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        setProcessingId(id);
        try {
            await api.patch(`/hr/promotions/${id}`, {
                status,
                hrComment
            });
            toast.success(`Request ${status.toLowerCase()} successfully`);
            setHrComment('');
            setSelectedRequest(null);
            fetchRequests();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Action failed');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredRequests = requests.filter(r => {
        const matchesSearch = r.employee?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.manager?.fullName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'ALL' || r.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="page-transition space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-[var(--text-primary)] font-display tracking-tight mb-2 uppercase">Promotion Pipeline</h1>
                    <p className="text-[var(--text-secondary)] font-medium">Review and approve employee advancement requests</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] backdrop-blur-md flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                            {requests.filter(r => r.status === 'PENDING').length} Pending Requests
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-all" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by staff or manager..."
                        className="nx-input nx-input-l w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={cn(
                                "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                                filterStatus === status 
                                    ? "bg-[var(--primary)] text-white border-transparent shadow-lg shadow-[var(--primary)]/20" 
                                    : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="py-40 flex flex-col items-center justify-center gap-6">
                    <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)]">Syncing Pipeline Data</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="nx-card p-20 text-center flex flex-col items-center justify-center space-y-6 opacity-60 grayscale border-dashed">
                    <div className="w-20 h-20 rounded-3xl bg-[var(--bg-elevated)] flex items-center justify-center">
                        <Zap size={40} className="text-[var(--text-muted)]" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">No Requests Found</h3>
                        <p className="text-sm font-medium text-[var(--text-muted)]">There are no promotion requests matching your criteria.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {filteredRequests.map(req => (
                        <motion.div 
                            key={req.id}
                            layout
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                                "nx-card p-8 group relative overflow-hidden transition-all border-l-4",
                                req.status === 'PENDING' ? "border-l-amber-500" :
                                req.status === 'APPROVED' ? "border-l-emerald-500" : "border-l-rose-500"
                            )}
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border-subtle)]">
                                        <img src={req.employee?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.employee?.fullName)}&background=random`} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">{req.employee?.fullName}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1">{req.employee?.jobTitle}</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase flex items-center gap-2",
                                    req.status === 'PENDING' ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                                    req.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                                    "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                )}>
                                    {req.status === 'PENDING' ? <Clock size={12} /> : req.status === 'APPROVED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                    {req.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-[var(--text-muted)]">
                                        <Briefcase size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Proposed Role</span>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 mb-0.5">Current Role</span>
                                            <span className="text-[11px] font-bold text-[var(--text-secondary)] line-through decoration-[var(--error)]/30">{req.employee?.jobTitle}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-[1px] flex-1 bg-[var(--border-subtle)]" />
                                            <ArrowRight size={10} className="text-[var(--text-muted)] opacity-40" />
                                            <div className="h-[1px] flex-1 bg-[var(--border-subtle)]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--primary)] mb-0.5">Proposed Advancement</span>
                                            <span className="text-[14px] font-black text-[var(--text-primary)] leading-tight">{req.targetJobTitle || req.targetRole}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4 text-right">
                                    <div className="flex items-center gap-3 text-[var(--text-muted)] justify-end">
                                        <DollarSign size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Proposed Salary</span>
                                    </div>
                                    <p className="text-lg font-black text-emerald-500">
                                        GHS {req.proposedSalary ? Number(req.proposedSalary).toLocaleString() : '---'} <span className="text-[10px] opacity-60">/yr</span>
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] space-y-4 mb-8">
                                <div className="flex items-center gap-3 text-[var(--text-muted)]">
                                    <AlertCircle size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Manager's Rationale</span>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed italic">
                                    "{req.reason}"
                                </p>
                                <div className="pt-4 border-t border-[var(--border-subtle)]/50 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-[10px] font-black">
                                        {req.manager?.fullName[0]}
                                    </div>
                                    <p className="text-[10px] font-bold text-[var(--text-muted)]">
                                        Suggested by <span className="text-[var(--text-primary)]">{req.manager?.fullName}</span> on {new Date(req.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {req.status === 'PENDING' && canApprove && (
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setSelectedRequest(req)}
                                        className="flex-1 py-4 rounded-2xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        Process Request
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}

                            {req.hrComment && (
                                <div className="p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 mt-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] mb-1">HR/MD Comment</p>
                                    <p className="text-xs font-medium text-[var(--text-secondary)]">{req.hrComment}</p>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Processing Modal */}
            <AnimatePresence>
                {selectedRequest && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[2.5rem] p-10 shadow-2xl relative"
                        >
                            <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">Review Promotion</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-8">
                                For <span className="text-[var(--primary)]">{selectedRequest.employee?.fullName}</span>
                            </p>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Official Decision Comment</label>
                                    <textarea 
                                        value={hrComment}
                                        onChange={(e) => setHrComment(e.target.value)}
                                        placeholder="Provide feedback for the manager and employee..."
                                        className="nx-input min-h-[120px] text-sm p-6"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button 
                                        onClick={() => handleAction(selectedRequest.id, 'REJECTED')}
                                        disabled={!!processingId}
                                        className="py-5 rounded-2xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {processingId === selectedRequest.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                        Reject
                                    </button>
                                    <button 
                                        onClick={() => handleAction(selectedRequest.id, 'APPROVED')}
                                        disabled={!!processingId}
                                        className="py-5 rounded-2xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {processingId === selectedRequest.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        Approve
                                    </button>
                                </div>
                                <button 
                                    onClick={() => setSelectedRequest(null)}
                                    className="w-full text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all mt-2"
                                >
                                    Go Back
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PromotionRequests;
