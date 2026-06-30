import React, { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import { Calendar, Clock, Play, Plus, RefreshCw, Layers, ShieldCheck, X, Trash2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { getStoredUser, getRoleRankValue } from '../utils/session';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import PageHeader from '../components/common/PageHeader';
import ConfirmDeleteModal from '../components/common/ConfirmDeleteModal';
import { useTranslation } from 'react-i18next';

interface Cycle {
    id: string;
    name: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
        if (response?.data?.error) return response.data.error;
        if (response?.data?.message) return response.data.message;
    }
    if (error instanceof Error) return error.message;
    return fallback;
};

const CycleManagement: React.FC = () => {
    const { t } = useTranslation();
    const currentUser = getStoredUser() as { role?: string };
    const canManageCycles = getRoleRankValue(currentUser.role) >= 80;
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
    const [cyclePackets, setCyclePackets] = useState<any[]>([]);
    const [formData, setFormData] = useState({ name: '', type: 'QUARTERLY', startDate: '', endDate: '' });
    const [pendingDelete, setPendingDelete] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchCycles();
    }, []);

    const fetchCycles = async () => {
        setLoading(true);
        try {
            const res = await api.get('/cycles');
            setCycles(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/cycles', formData);
            setShowModal(false);
            setFormData({ name: '', type: 'QUARTERLY', startDate: '', endDate: '' });
            fetchCycles();
            toast.info(t('cycles.deployment_success'));
        } catch (error) {
            toast.info(String(getErrorMessage(error, "Failed to create cycle")));
        }
    };

    const initiateAppraisals = async (cycleId: string) => {
        const isSync = cyclePackets.length > 0 && selectedCycleId === cycleId;
        const confirmMsg = isSync 
            ? t('cycles.sync_confirm')
            : t('cycles.initiate_confirm');

        if (!confirm(confirmMsg)) return;

        try {
            const res = await api.post('/appraisals/init', { cycleId });
            toast.success(String(res.data.message || t('cycles.deployment_success')));
            fetchCycles();
        } catch (error) {
            toast.error(String(getErrorMessage(error, "Failed to initiate reviews")));
        }
    };

    const activateCycle = async (cycleId: string) => {
        try {
            await api.put(`/cycles/${cycleId}`, { status: 'ACTIVE' });
            fetchCycles();
            toast.info(t('common.success'));
        } catch (error) {
            toast.info(String(getErrorMessage(error, "Failed to activate cycle")));
        }
    };

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            if (pendingDelete.type === 'PACKET') {
                await api.delete(`/appraisals/packet/${pendingDelete.id}`);
                setCyclePackets(prev => prev.filter(p => p.id !== pendingDelete.id));
                toast.success(t('common.success'));
            } else {
                await api.delete(`/cycles/${pendingDelete.id}`);
                toast.info(t('common.success'));
                fetchCycles();
            }
            setPendingDelete(null);
        } catch (error) {
            toast.error(String(getErrorMessage(error, "Deletion failed")));
        } finally {
            setDeleting(false);
        }
    };

    const fetchCyclePackets = async (cycleId: string) => {
        try {
            const res = await api.get(`/appraisals/cycle/${cycleId}/packets`);
            setCyclePackets(Array.isArray(res.data) ? res.data : []);
            setSelectedCycleId(cycleId);
        } catch (error) {
            toast.error("Failed to fetch cycle packets");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <RefreshCw size={32} className="animate-spin text-[var(--primary)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-secondary)]">{t('common.loading')}</p>
        </div>
    );

    return (
        <div className="space-y-10 page-transition min-h-screen pb-24 lg:pb-8">
            <PageHeader 
                title={t('cycles.title')}
                description={t('cycles.description')}
                icon={Layers}
                variant="purple"
                action={canManageCycles ? {
                    label: t('cycles.add_new'),
                    onClick: () => setShowModal(true),
                    icon: Plus
                } : undefined}
            />

            {/* Strategic Information Alert */}
            <div className="p-8 rounded-[2rem] bg-[var(--primary)]/5 border border-[var(--primary)]/10 flex items-center gap-6">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20">
                    <ShieldCheck className="text-[var(--primary)]" size={20} />
                </div>
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">{t('cycles.notice_title')}</h3>
                    <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">{t('cycles.notice_desc')}</p>
                </div>
            </div>

            {/* Cycles Grid */}
            <div className="grid gap-6">
                {cycles.length === 0 ? (
                    <div className="nx-card p-20 text-center border-[var(--border-subtle)] opacity-50">
                        <Calendar size={48} className="mx-auto mb-6 text-[var(--text-muted)]" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">{t('cycles.no_sessions')}</p>
                    </div>
                ) : (
                    cycles.map((cycle, idx) => (
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={cycle.id} 
                            className="nx-card p-8 md:p-10 border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-[var(--primary)]/30 transition-all"
                        >
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-2xl font-black text-[var(--text-primary)] font-display uppercase tracking-tight">{cycle.name}</h3>
                                    <span className={cn(
                                        "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                                        cycle.status === 'ACTIVE' 
                                            ? "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20" 
                                            : "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20"
                                    )}>
                                        {cycle.status === 'ACTIVE' ? t('common.active') : cycle.status}
                                    </span>
                                </div>
                                <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                                    <span className="flex items-center gap-2"><Calendar size={14} className="text-[var(--primary)]" /> {t('common.date')}: {new Date(cycle.startDate).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-2"><Clock size={14} className="text-[var(--primary)]" /> {t('onboarding.due')}: {new Date(cycle.endDate).toLocaleDateString()}</span>
                                    <span className="bg-[var(--bg-elevated)]/50 px-3 py-1 rounded-lg border border-[var(--border-subtle)]">{cycle.type}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-5">
                                {cycle.status === 'DRAFT' && canManageCycles && (
                                    <button
                                        onClick={() => activateCycle(cycle.id)}
                                        className="px-6 py-3 rounded-2xl bg-[var(--warning)]/10 hover:bg-[var(--warning)]/20 text-[var(--warning)] border border-[var(--warning)]/20 text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        {t('cycles.activate')}
                                    </button>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => initiateAppraisals(cycle.id)}
                                    disabled={cycle.status !== 'ACTIVE' || !canManageCycles}
                                    className={cn(
                                        "px-8 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl",
                                        cycle.status === 'ACTIVE' && canManageCycles
                                            ? "bg-[var(--primary)] text-white shadow-[var(--primary)]/20 hover:scale-105"
                                            : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed grayscale"
                                    )}
                                >
                                    <Play size={16} fill="currentColor" /> {t('cycles.launch_reviews')}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => fetchCyclePackets(cycle.id)}
                                    className="px-6 py-4 rounded-2xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 text-[var(--text-secondary)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    {t('dashboard.actions.view_all')}
                                </motion.button>
                                {canManageCycles && (
                                    <button 
                                        onClick={() => setPendingDelete({ id: cycle.id, type: 'CYCLE' })}
                                        className="p-4 rounded-2xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors text-slate-600 border border-white/5"
                                        title={t('common.delete')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {getRoleRankValue(currentUser.role) >= 90 && (
                <div className="mt-10 p-10 rounded-[2.5rem] border border-red-500/20 bg-red-500/5 backdrop-blur-3xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity translate-x-1/4 -translate-y-1/4">
                        <AlertTriangle size={240} />
                    </div>
                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight">{t('cycles.system_reset_title')}</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/60 mt-1">{t('cycles.delete_warning')}</p>
                                <p className="text-[10px] font-bold text-[var(--text-muted)] mt-2 max-w-md">Deletes ALL cycles, packets, and historical reviews. Irreversible.</p>
                            </div>
                        </div>
                        <button 
                            onClick={async () => {
                                if (!confirm("CRITICAL: This will permanently delete EVERY appraisal record. Confirm?")) return;
                                try {
                                    setLoading(true);
                                    const res = await api.post('/appraisals/ultimate-reset');
                                    toast.success(res.data.message);
                                    fetchCycles();
                                    setSelectedCycleId(null);
                                    setCyclePackets([]);
                                } catch (error) {
                                    toast.error("Factory reset failed.");
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            className="nx-btn-danger px-10 h-16 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] whitespace-nowrap"
                        >
                            {t('common.delete')}
                        </button>
                    </div>
                </div>
            )}

            {/* Oversight Section */}
            <AnimatePresence>
                {selectedCycleId && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-6">
                        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-6">
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
                                    <ShieldCheck className="text-[var(--primary)]" /> {t('cycles.indicators.real_time')}: {cycles.find(c => c.id === selectedCycleId)?.name}
                                </h2>
                                {canManageCycles && (
                                    <button 
                                        onClick={() => initiateAppraisals(selectedCycleId || '')}
                                        className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-[var(--primary)] text-[var(--text-inverse)] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20 hover:scale-105 transition-all"
                                    >
                                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                        {t('cycles.sync_participants')}
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setSelectedCycleId(null)} className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">{t('common.cancel')}</button>
                        </div>

                        <div className="grid gap-4">
                            {cyclePackets.length === 0 ? (
                                <p className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50">{t('cycles.no_sessions')}</p>
                            ) : (
                                <div className="nx-table-container">
                                    <table className="nx-table">
                                        <thead>
                                            <tr>
                                                <th>{t('onboarding.employee')}</th>
                                                <th>{t('cycles.indicators.status')}</th>
                                                <th>{t('common.status')}</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cyclePackets.map(packet => (
                                                <tr key={packet.id}>
                                                    <td>
                                                        <div className="font-bold text-[var(--text-primary)]">{packet.employee?.fullName}</div>
                                                        <div className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">{packet.employee?.jobTitle}</div>
                                                    </td>
                                                    <td>
                                                        <span className="px-2 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest border border-[var(--border-subtle)]">
                                                            {packet.currentStage.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={cn(
                                                            "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border",
                                                            packet.status === 'COMPLETED' ? "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20" : "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20"
                                                        )}>
                                                            {packet.status}
                                                        </span>
                                                    </td>
                                                    <td className="text-right">
                                                        <button 
                                                            onClick={() => setPendingDelete({ id: packet.id, type: 'PACKET' })}
                                                            className="text-rose-500 hover:text-rose-400 transition-colors"
                                                            title={t('common.delete')}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CREATE MODAL */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 40, opacity: 0 }}
                            className="nx-card w-full max-w-xl bg-[var(--bg-card)] border-[var(--border-subtle)] p-7 sm:p-10 relative shadow-2xl overflow-hidden rounded-t-3xl sm:rounded-3xl max-h-[92dvh] overflow-y-auto"
                        >
                             <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
                                <RefreshCw size={120} className="text-[var(--growth)]" />
                             </div>

                             <div className="flex justify-between items-start mb-10 relative z-10">
                                <div>
                                    <h2 className="text-3xl font-black text-[var(--text-primary)] font-display tracking-tight uppercase">{t('cycles.add_new')}</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mt-2">{t('cycles.notice_title')}</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-xl text-[var(--text-muted)] transition-colors">
                                    <X size={20} />
                                </button>
                             </div>

                             <form onSubmit={handleCreate} className="space-y-8 relative z-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">{t('cycles.headers.cycle_name')}</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. FY26 ANNUAL ASSESSMENT"
                                        className="nx-input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                
                                 <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1">{t('common.type')}</label>
                                    <select
                                        className="nx-input appearance-none bg-[var(--bg-elevated)]"
                                            value={formData.type}
                                            onChange={e => {
                                                const type = e.target.value;
                                                const now = new Date();
                                                let start = new Date(now);
                                                let end = new Date(now);
                                                
                                                if (type === 'MONTHLY') {
                                                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                                                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                                                } else if (type === 'QUARTERLY') {
                                                    const q = Math.floor(now.getMonth() / 3);
                                                    start = new Date(now.getFullYear(), q * 3, 1);
                                                    end = new Date(now.getFullYear(), (q + 1) * 3, 0);
                                                } else if (type === 'BI_ANNUAL') {
                                                    const h = now.getMonth() < 6 ? 0 : 6;
                                                    start = new Date(now.getFullYear(), h, 1);
                                                    end = new Date(now.getFullYear(), h + 6, 0);
                                                } else if (type === 'ANNUAL') {
                                                    start = new Date(now.getFullYear(), 0, 1);
                                                    end = new Date(now.getFullYear(), 12, 0);
                                                }

                                                setFormData({ 
                                                    ...formData, 
                                                    type, 
                                                    startDate: start.toISOString().split('T')[0],
                                                    endDate: end.toISOString().split('T')[0]
                                                });
                                            }}
                                        >
                                            <option value="MONTHLY">Monthly Review</option>
                                            <option value="QUARTERLY">Quarterly Review</option>
                                            <option value="BI_ANNUAL">Bi-Annual Assessment</option>
                                            <option value="ANNUAL">Annual Evaluation</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3 opacity-30">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1 flex items-center gap-2">
                                            {t('common.status')} <ShieldCheck size={12} />
                                        </label>
                                        <div className="nx-input flex items-center bg-white/5 cursor-not-allowed uppercase">
                                            DRAFT MODE
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 p-8 rounded-3xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] ml-1 flex items-center gap-2">
                                            <Calendar size={12} /> {t('common.date')}
                                        </label>
                                        <input
                                            required
                                            type="date"
                                            className="nx-input !bg-transparent !border-[var(--border-subtle)] focus:!border-[var(--primary)]"
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] ml-1 flex items-center gap-2">
                                            <Clock size={12} /> {t('onboarding.due')}
                                        </label>
                                        <input
                                            required
                                            type="date"
                                            className="nx-input !bg-transparent !border-[var(--border-subtle)] focus:!border-[var(--primary)]"
                                            value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>
 
                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        className="w-full py-5 rounded-2xl bg-[var(--primary)] text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-[var(--primary)]/30 hover:scale-[1.02] transition-all active:scale-[0.98]"
                                    >
                                        {t('common.save')}
                                    </button>
                                </div>
                             </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmDeleteModal
                isOpen={!!pendingDelete}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleConfirmDelete}
                title={pendingDelete?.type === 'PACKET' ? t('common.confirm_delete') : t('common.delete')}
                description={t('cycles.delete_warning')}
                loading={deleting}
            />
        </div>
    );
};

export default CycleManagement;
