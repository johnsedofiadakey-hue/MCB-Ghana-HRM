import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, X, Calendar } from 'lucide-react';
import api from '../services/api';
import { toast } from '../utils/toast';
import { cn } from '../utils/cn';
import { getStoredUser, hasPermission } from '../utils/session';

const statusConfig: Record<string, { label: string; badgeCls: string; barCls: string; dot: string }> = {
    IN_PROGRESS: { label: 'In Progress', badgeCls: 'badge-info',    barCls: 'bg-[var(--primary)]',               dot: 'bg-[var(--primary)]' },
    PASSED:      { label: 'Passed',      badgeCls: 'badge-success', barCls: 'bg-[var(--status-success-text)]',   dot: 'bg-[var(--status-success-text)]' },
    EXTENDED:    { label: 'Extended',    badgeCls: 'badge-warning', barCls: 'bg-[var(--status-warning-text)]',   dot: 'bg-[var(--status-warning-text)]' },
    FAILED:      { label: 'Failed',      badgeCls: 'badge-error',   barCls: 'bg-[var(--status-error-text)]',     dot: 'bg-[var(--status-error-text)]' },
};

const inputCls = 'w-full border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] bg-[var(--bg-input)] focus:outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)]';
const labelCls = 'text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1.5';

const ProbationTracker: React.FC = () => {
    const user = getStoredUser();
    const canManage = hasPermission(user, 'employee.history.write');
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

    const daysLeftColor = (days: number) => {
        if (days < 0) return 'text-[var(--status-error-text)]';
        if (days <= 14) return 'text-[var(--status-warning-text)]';
        return 'text-[var(--text-muted)]';
    };

    const statItems = [
        { label: 'Total',         value: stats.total        ?? 0, cls: 'text-[var(--text-primary)]' },
        { label: 'In Progress',   value: stats.inProgress   ?? 0, cls: 'text-[var(--primary)]' },
        { label: 'Expiring Soon', value: stats.expiringSoon ?? 0, cls: 'text-[var(--status-warning-text)]' },
        { label: 'Passed',        value: stats.passed       ?? 0, cls: 'text-[var(--status-success-text)]' },
        { label: 'Failed',        value: stats.failed       ?? 0, cls: 'text-[var(--status-error-text)]' },
    ];

    const ModalShell = ({ title, subtitle, onClose, onSave, saveLabel, children }: any) => (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[var(--border-subtle)] max-h-[92dvh] flex flex-col"
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] flex-shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
                        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg"><X size={16} /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">{children}</div>
                <div className="flex gap-3 px-6 pb-6 pt-2 flex-shrink-0">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-xl text-sm font-semibold hover:bg-[var(--bg-elevated)] transition-colors"
                    >Cancel</button>
                    <button onClick={onSave} disabled={saving}
                        className="flex-[2] py-2.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    >{saving ? 'Saving...' : saveLabel}</button>
                </div>
            </motion.div>
        </div>
    );

    return (
        <div className="space-y-5 pb-24 lg:pb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Probation Tracker</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">Monitor employee probation periods and schedule reviews</p>
                </div>
                {canManage && (
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm w-full sm:w-auto"
                    >
                        <Plus size={16} /> Add Probation
                    </button>
                )}
            </div>

            {/* Stats — 2 cols mobile, 3 tablet, 5 desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {statItems.map(s => (
                    <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
                        <p className={cn('text-2xl font-bold', s.cls)}>{s.value}</p>
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[160px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Search employee..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                    />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                    <option value="">All Statuses</option>
                    {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
            </div>

            {/* Records List */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
                        {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                    </h2>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)]">
                        <Clock size={36} className="mb-2 opacity-30" />
                        <p className="text-sm">No probation records found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {filtered.map(r => {
                            const cfg = statusConfig[r.status] || statusConfig.IN_PROGRESS;
                            const progress = Math.min(100, Math.max(0, ((r.period - r.daysLeft) / r.period) * 100));
                            return (
                                <div key={r.id} className="px-5 py-5 hover:bg-[var(--bg-hover)] transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-sm font-bold text-[var(--text-secondary)] overflow-hidden flex-shrink-0">
                                                {r.employee?.avatarUrl || r.employee?.profilePhoto
                                                    ? <img src={r.employee.avatarUrl || r.employee.profilePhoto} alt="" className="w-full h-full object-cover" />
                                                    : r.employee?.fullName?.charAt(0)
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <p className="text-sm font-bold text-[var(--text-primary)]">{r.employee?.fullName}</p>
                                                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1', cfg.badgeCls)}>
                                                        <span className={cn('inline-block w-1.5 h-1.5 rounded-full', cfg.dot)} />
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[var(--text-muted)] mb-3 truncate">
                                                    {r.employee?.jobTitle} · {r.employee?.departmentObj?.name}
                                                </p>
                                                {/* Progress bar */}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                                        <div className={cn('h-full rounded-full transition-all', cfg.barCls)} style={{ width: `${progress}%` }} />
                                                    </div>
                                                    <span className={cn('text-xs font-semibold whitespace-nowrap', daysLeftColor(r.daysLeft))}>
                                                        {r.status === 'IN_PROGRESS'
                                                            ? (r.daysLeft > 0 ? `${r.daysLeft}d left` : `${Math.abs(r.daysLeft)}d overdue`)
                                                            : cfg.label
                                                        }
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                                                    <span className="flex items-center gap-1"><Calendar size={10} />Started {new Date(r.startDate).toLocaleDateString()}</span>
                                                    <span>Ends {new Date(r.endDate).toLocaleDateString()}</span>
                                                    {r.reviewDate && <span>Review: {new Date(r.reviewDate).toLocaleDateString()}</span>}
                                                    <span>{r.period}-day period</span>
                                                </div>
                                            </div>
                                        </div>
                                        {canManage && (
                                            <button
                                                onClick={() => { setEditRecord(r); setEditForm({ status: r.status, outcome: r.outcome || '', reviewDate: r.reviewDate ? r.reviewDate.slice(0, 10) : '', notes: r.notes || '' }); }}
                                                className="px-3 py-1.5 border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-lg text-xs font-semibold hover:bg-[var(--bg-elevated)] transition-colors flex-shrink-0"
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
                    <ModalShell title="Add Probation Record" onClose={() => setShowCreate(false)} onSave={handleCreate} saveLabel="Add Probation">
                        <div>
                            <label className={labelCls}>Employee *</label>
                            <select value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} className={inputCls}>
                                <option value="">Select employee...</option>
                                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.fullName} — {e.jobTitle}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Start Date *</label>
                                <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Duration (days)</label>
                                <select value={form.period} onChange={e => setForm(p => ({ ...p, period: Number(e.target.value) }))} className={inputCls}>
                                    <option value={30}>30 days</option>
                                    <option value={60}>60 days</option>
                                    <option value={90}>90 days</option>
                                    <option value={180}>180 days</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Review Date</label>
                            <input type="date" value={form.reviewDate} onChange={e => setForm(p => ({ ...p, reviewDate: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Notes</label>
                            <textarea rows={2} placeholder="Performance goals or notes..."
                                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                className={cn(inputCls, 'resize-none')}
                            />
                        </div>
                    </ModalShell>
                )}
            </AnimatePresence>

            {/* Update Modal */}
            <AnimatePresence>
                {editRecord && (
                    <ModalShell title="Update Probation" subtitle={editRecord.employee?.fullName} onClose={() => setEditRecord(null)} onSave={handleUpdate} saveLabel="Save Changes">
                        <div>
                            <label className={labelCls}>Status</label>
                            <select value={editForm.status} onChange={e => setEditForm((p: any) => ({ ...p, status: e.target.value }))} className={inputCls}>
                                {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Review Date</label>
                            <input type="date" value={editForm.reviewDate || ''} onChange={e => setEditForm((p: any) => ({ ...p, reviewDate: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Outcome</label>
                            <textarea rows={3} placeholder="Summary of performance and outcome decision..."
                                value={editForm.outcome || ''} onChange={e => setEditForm((p: any) => ({ ...p, outcome: e.target.value }))}
                                className={cn(inputCls, 'resize-none')}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Notes</label>
                            <textarea rows={2} value={editForm.notes || ''} onChange={e => setEditForm((p: any) => ({ ...p, notes: e.target.value }))}
                                className={cn(inputCls, 'resize-none')}
                            />
                        </div>
                    </ModalShell>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProbationTracker;
