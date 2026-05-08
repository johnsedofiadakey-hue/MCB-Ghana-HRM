import React, { useState, useEffect } from 'react';
import { toast } from '../utils/toast';
import { useParams } from 'react-router-dom';
import { Shield, Clock, AlertTriangle, FileText, CheckCircle, Plus, X, Loader2, Sparkles, History } from 'lucide-react';
import api from '../services/api';
import { getStoredUser } from '../utils/session';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface HistoryRecord {
    id: string;
    type: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    createdAt: string;
    loggedBy: { fullName: string };
}

const EmployeeHistory = () => {
    // Ideally this comes from route params or context. For now, assuming current user viewing their own or manager viewing one.
    // Let's implement getting records for a specific employee ID passed in URL or defaulting to "my-history".
    const { employeeId } = useParams();
    const isSelf = !employeeId;
    const currentUser = getStoredUser();
    const userId = currentUser?.id;

    // For demo, if strictly "portal" for logged in user to see their own history:
    // But request asked for "reports can be inputed by supervisor". So it's a management view too.

    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // New Record Form State
    const [showForm, setShowForm] = useState(false);
    const [newRecord, setNewRecord] = useState({
        type: 'GENERAL_NOTE',
        title: '',
        description: '',
        severity: 'LOW'
    });

    useEffect(() => {
        const currentUser = getStoredUser();
        const targetId = employeeId || currentUser?.id;
        if (targetId) {
            fetchHistory(targetId);
        } else {
            setLoading(false);
        }
    }, [employeeId]);

    const fetchHistory = async (id: string) => {
        try {
            const res = await api.get(`/history/${id}`);
            setRecords(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...newRecord, employeeId: employeeId || userId };

            await api.post('/history', payload);
            toast.info("Record added successfully");
            setShowForm(false);
            setNewRecord({ type: 'GENERAL_NOTE', title: '', description: '', severity: 'LOW' });
            if (employeeId) fetchHistory(employeeId);
        } catch (error) {
            console.error(error);
            toast.info("Failed to add record");
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'DISCIPLINARY': return <AlertTriangle className="text-red-500" />;
            case 'QUERY': return <FileText className="text-orange-500" />;
            case 'COMMENDATION': return <CheckCircle className="text-green-500" />;
            default: return <Clock className="text-slate-400" />;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
                <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] animate-pulse">Loading History...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 page-enter min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-[var(--text-primary)] font-display tracking-tight flex items-center gap-4">
                        <History size={36} className="text-[var(--primary)]" />
                        <span className="gradient-text">Member</span> History
                    </h1>
                    <p className="text-sm font-medium text-[var(--text-muted)] mt-2 flex items-center gap-2">
                        <Shield size={14} className="text-[var(--primary)]" />
                        A complete audit trail of professional milestones and incidents.
                    </p>
                </div>
                {!isSelf && (
                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setShowForm(!showForm)}
                        className="btn-primary px-10 py-5 rounded-2xl shadow-xl shadow-[var(--primary)]/20 text-[11px]"
                    >
                        <Plus size={18} /> Add Entry
                    </motion.button>
                )}
            </div>

            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-[var(--bg-main)]/80 backdrop-blur-xl" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="nx-glass-card w-full max-w-lg bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl shadow-[var(--primary)]/20"
                        >
                            <div className="p-10 border-b border-[var(--border-subtle)]/50 bg-[var(--bg-elevated)]/30 flex justify-between items-center">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20 text-[var(--primary)] shadow-lg"><FileText size={28} /></div>
                                    <div>
                                        <h2 className="text-3xl font-black text-[var(--text-primary)] font-display tracking-tight uppercase">Add Entry</h2>
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mt-1 opacity-60">Staff Record</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowForm(false)} className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Type</label>
                                        <select
                                            className="nx-input p-4 font-bold text-sm appearance-none"
                                            value={newRecord.type}
                                            onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
                                        >
                                            <option value="GENERAL_NOTE">General Note</option>
                                            <option value="QUERY">Query</option>
                                            <option value="DISCIPLINARY">Disciplinary Action</option>
                                            <option value="COMMENDATION">Commendation</option>
                                            <option value="ISSUE">Issue Report</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Severity</label>
                                        <select
                                            className="nx-input p-4 font-bold text-sm appearance-none"
                                            value={newRecord.severity}
                                            onChange={(e) => setNewRecord({ ...newRecord, severity: e.target.value })}
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="CRITICAL">Critical</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Subject</label>
                                    <input
                                        type="text"
                                        className="nx-input p-5 font-bold text-lg"
                                        value={newRecord.title}
                                        onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                                        required
                                        placeholder="Brief title of the entry..."
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Details</label>
                                    <textarea
                                        className="nx-input p-5 font-bold text-sm h-32"
                                        value={newRecord.description}
                                        onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                                        required
                                        placeholder="Detailed explanation of the incident or note..."
                                    />
                                </div>
                                <div className="pt-4 flex gap-5">
                                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
                                    <button type="submit" className="btn-primary flex-[2] py-5 shadow-2xl shadow-[var(--primary)]/20">
                                        <Shield size={18} />
                                        <span>Save Record</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="space-y-6">
                <div className="flex items-center gap-3 ml-2">
                    <Sparkles size={18} className="text-[var(--primary)]" />
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Employment History</h2>
                </div>

                {records.length === 0 ? (
                    <div className="nx-glass-card p-24 text-center">
                        <History size={64} className="mx-auto mb-8 opacity-10 text-[var(--text-muted)]" />
                        <h2 className="text-2xl font-black text-[var(--text-primary)] mb-3 font-display uppercase tracking-tight">No History</h2>
                        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed opacity-60 italic">No historical records have been added for this employee yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {records.map((record, rIdx) => (
                            <motion.div 
                                key={record.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: rIdx * 0.05 }}
                                className="nx-glass-card p-10 flex flex-col md:flex-row gap-10 group relative overflow-hidden"
                            >
                                <div className={cn(
                                    "absolute top-0 left-0 w-1.5 h-full",
                                    record.type === 'DISCIPLINARY' ? "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]" :
                                    record.type === 'COMMENDATION' ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" :
                                    record.type === 'QUERY' ? "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" :
                                    "bg-[var(--primary)] shadow-[0_0_15px_var(--ring-color)]"
                                )} />
                                
                                <div className="flex-shrink-0">
                                    <div className={cn(
                                        "w-16 h-16 rounded-2xl flex items-center justify-center border shadow-lg group-hover:scale-110 transition-all duration-500",
                                        record.type === 'DISCIPLINARY' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                                        record.type === 'COMMENDATION' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                        record.type === 'QUERY' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                        "bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)]"
                                    )}>
                                        {React.cloneElement(getIcon(record.type) as React.ReactElement, { size: 32 })}
                                    </div>
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="text-2xl font-black text-[var(--text-primary)] font-display tracking-tight group-hover:text-[var(--primary)] transition-colors uppercase">{record.title}</h4>
                                            <div className="flex flex-wrap items-center gap-4 mt-2">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                                    record.type === 'DISCIPLINARY' ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                                    record.type === 'COMMENDATION' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                    record.type === 'QUERY' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                                    "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20"
                                                )}>
                                                    {record.type}
                                                </span>
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">
                                                    <Clock size={12} />
                                                    {new Date(record.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">
                                                    <Shield size={12} />
                                                    {record.loggedBy?.fullName}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border self-start md:self-center",
                                            record.status === 'OPEN' ? "bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)] animate-pulse" : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]"
                                        )}>
                                            {record.status}
                                        </div>
                                    </div>
                                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed bg-[var(--bg-elevated)]/30 p-6 rounded-2xl border border-[var(--border-subtle)]/30 group-hover:border-[var(--primary)]/20 transition-all">
                                        {record.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeHistory;
