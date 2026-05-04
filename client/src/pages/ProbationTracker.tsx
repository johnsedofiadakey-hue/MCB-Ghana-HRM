import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, X, CheckCircle2, AlertTriangle, Search, Users, Calendar, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { toast } from '../utils/toast';
import { cn } from '../utils/cn';
import { getStoredUser, getRoleRankValue } from '../utils/session';

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    IN_PROGRESS: { label: 'In Progress', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
    PASSED: { label: 'Passed', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
    EXTENDED: { label: 'Extended', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
    FAILED: { label: 'Failed', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
};

const ProbationTracker: React.FC = () => {
    const user = getStoredUser();
    const rank = getRoleRankValue(user?.role);
    const [records, setRecords] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [editRecord, setEditRecord] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        employeeId: '', startDate: '', period: 90, notes: '', reviewDate: '',
    });
    const [editForm, setEditForm] = useState<any>({});

    useEffect(() => { fetchRecords(); fetchStats(); fetchEmployees(); }, [filterStatus]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterStatus) params.status = filterStatus;
            const res = await api.get('/hr/probation', { params });
            setRecords(Array.isArray(res.data) ? res.data : []);
        } catch { toast.error('Failed to load records'); }
        finally { setLoading(false); }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/hr/probation/stats');
            setStats(res.data);
        } catch {}
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/users?status=ACTIVE');
            setEmployees(Array.isArray(res.data) ? res.data : res.data?.employees || []);
        } catch {}
    };

    const handleCreate = async () => {
        if (!form.employeeId || !form.startDate) return toast.error('Employee and start date are required');
        setSaving(true);
        try {
            await api.post('/hr/probation', form);
            toast.success('Probation record created');
            setShowCreate(false);
            setForm({ employeeId: '', startDate: '', period: 90, notes: '', reviewDate: '' });
            fetchRecords(); fetchStats();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create record');
        } finally { setSaving(false); }
    };

    const handleUpdate = async () => {
        setSaving(true);
        try {
            await api.patch(`/hr/probation/${editRecord.id}`, editForm);
            toast.success('Record updated');
            setEditRecord(null);
            fetchRecords(); fetchStats();
        } catch { toast.error('Update failed'); }
        finally { setSaving(false); }
    };

    const filtered = records.filter(r =>
        !search || r.employee?.fullName?.toLowerCase().includes(search.toLowerCase())
    );

    const getDaysLeftColor = (days: number) => {
        if (days < 0) return 'text-rose-600';
        if (days <= 14) return 'text-amber-600';
        return 'text-slate-600';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Probation Tracker</h1>
                    <p className="text-slate-500 mt-1">Monitor employee probation periods and schedule reviews</p>
                </div>
                {rank >= 70 && (
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                        <Plus size={16} /> Add Probation
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-4">
                {[
                    { label: 'Total', value: stats.total ?? 0, color: 'text-slate-800' },
                    { label: 'In Progress', value: stats.inProgress ?? 0, color: 'text-blue-600' },
                    { label: 'Expiring Soon', value: stats.expiringSoon ?? 0, color: 'text-amber-600' },
                    { label: 'Passed', value: stats.passed ?? 0, color: 'text-emerald-600' },
                    { label: 'Failed', value: stats.failed ?? 0, color: 'text-rose-600' },
                ].map(s => (
                    <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                        <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search employee..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                    />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                >
                    <option value="">All Statuses</option>
                    {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
            </div>

            {/* Records */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-700">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</h2>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                        <Clock size={36} className="mb-2 opacity-30" />
                        <p className="text-sm">No probation records found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filtered.map(r => {
                            const cfg = statusConfig[r.status] || statusConfig.IN_PROGRESS;
                            const progress = Math.min(100, Math.max(0, ((r.period - r.daysLeft) / r.period) * 100));
                            return (
                                <div key={r.id} className="px-6 py-5 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 overflow-hidden flex-shrink-0">
                                                {r.employee?.avatarUrl || r.employee?.profilePhoto
                                                    ? <img src={r.employee.avatarUrl || r.employee.profilePhoto} alt="" className="w-full h-full object-cover" />
                                                    : r.employee?.fullName?.charAt(0)
                                                }
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <p className="text-sm font-bold text-slate-800">{r.employee?.fullName}</p>
                                                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', cfg.bg, cfg.color)}>
                                                        <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1', cfg.dot)} />
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 mb-3">
                                                    {r.employee?.jobTitle} · {r.employee?.departmentObj?.name}
                                                </p>

                                                {/* Progress bar */}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn('h-full rounded-full transition-all', r.status === 'PASSED' ? 'bg-emerald-500' : r.daysLeft <= 14 ? 'bg-amber-500' : 'bg-blue-500')}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <span className={cn('text-xs font-semibold whitespace-nowrap', getDaysLeftColor(r.daysLeft))}>
                                                        {r.status === 'IN_PROGRESS'
                                                            ? (r.daysLeft > 0 ? `${r.daysLeft}d left` : `${Math.abs(r.daysLeft)}d overdue`)
                                                            : cfg.label
                                                        }
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                                    <span><Calendar size={10} className="inline mr-0.5" />Started {new Date(r.startDate).toLocaleDateString()}</span>
                                                    <span>Ends {new Date(r.endDate).toLocaleDateString()}</span>
                                                    {r.reviewDate && <span>Review: {new Date(r.reviewDate).toLocaleDateString()}</span>}
                                                    <span>{r.period}-day probation</span>
                                                </div>
                                            </div>
                                        </div>

                                        {rank >= 70 && (
                                            <button onClick={() => { setEditRecord(r); setEditForm({ status: r.status, outcome: r.outcome || '', reviewDate: r.reviewDate ? r.reviewDate.slice(0, 10) : '', notes: r.notes || '' }); }}
                                                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors flex-shrink-0"
                                            >Update</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200"
                        >
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                                <h3 className="text-base font-bold text-slate-800">Add Probation Record</h3>
                                <button onClick={() => setShowCreate(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={16} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Employee *</label>
                                    <select value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                                    >
                                        <option value="">Select employee...</option>
                                        {employees.map((e: any) => <option key={e.id} value={e.id}>{e.fullName} — {e.jobTitle}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Start Date *</label>
                                        <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Duration (days)</label>
                                        <select value={form.period} onChange={e => setForm(p => ({ ...p, period: Number(e.target.value) }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                                        >
                                            <option value={30}>30 days</option>
                                            <option value={60}>60 days</option>
                                            <option value={90}>90 days</option>
                                            <option value={180}>180 days</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Review Date</label>
                                    <input type="date" value={form.reviewDate} onChange={e => setForm(p => ({ ...p, reviewDate: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Notes</label>
                                    <textarea rows={2} placeholder="Performance goals or notes..."
                                        value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)] resize-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 px-6 pb-6">
                                <button onClick={() => setShowCreate(false)}
                                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                                >Cancel</button>
                                <button onClick={handleCreate} disabled={saving}
                                    className="flex-[2] py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                                >{saving ? 'Creating...' : 'Add Probation'}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Update Modal */}
            <AnimatePresence>
                {editRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditRecord(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200"
                        >
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">Update Probation</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{editRecord.employee?.fullName}</p>
                                </div>
                                <button onClick={() => setEditRecord(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={16} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Status</label>
                                    <select value={editForm.status} onChange={e => setEditForm((p: any) => ({ ...p, status: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                                    >
                                        {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Review Date</label>
                                    <input type="date" value={editForm.reviewDate || ''} onChange={e => setEditForm((p: any) => ({ ...p, reviewDate: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Outcome</label>
                                    <textarea rows={3} placeholder="Summary of performance and outcome decision..."
                                        value={editForm.outcome || ''} onChange={e => setEditForm((p: any) => ({ ...p, outcome: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)] resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Notes</label>
                                    <textarea rows={2} value={editForm.notes || ''} onChange={e => setEditForm((p: any) => ({ ...p, notes: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)] resize-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 px-6 pb-6">
                                <button onClick={() => setEditRecord(null)}
                                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                                >Cancel</button>
                                <button onClick={handleUpdate} disabled={saving}
                                    className="flex-[2] py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                                >{saving ? 'Saving...' : 'Save Changes'}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProbationTracker;
