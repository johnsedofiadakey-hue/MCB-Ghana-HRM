import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldAlert, Plus, X, CheckCircle2,
    AlertTriangle, FileText, Search, Eye, Trash2
} from 'lucide-react';
import api from '../services/api';
import { toast } from '../utils/toast';
import { cn } from '../utils/cn';
import { getStoredUser, hasPermission } from '../utils/session';

const CASE_TYPES = ['WARNING', 'FINAL_WARNING', 'SUSPENSION', 'DISMISSAL', 'GRIEVANCE'];
const CATEGORIES = ['CONDUCT', 'PERFORMANCE', 'ATTENDANCE', 'POLICY', 'SAFETY', 'GRIEVANCE'];
const STATUSES = ['OPEN', 'ACKNOWLEDGED', 'APPEALED', 'CLOSED'];

const statusConfig: Record<string, { label: string; cls: string }> = {
    OPEN:         { label: 'Open',         cls: 'badge-warning' },
    ACKNOWLEDGED: { label: 'Acknowledged', cls: 'badge-info' },
    APPEALED:     { label: 'Appealed',     cls: 'badge-neutral' },
    CLOSED:       { label: 'Closed',       cls: 'badge-neutral' },
};

const typeConfig: Record<string, { label: string; color: string }> = {
    WARNING:       { label: 'Written Warning', color: 'text-[var(--status-warning-text)]' },
    FINAL_WARNING: { label: 'Final Warning',   color: 'text-[var(--status-warning-text)]' },
    SUSPENSION:    { label: 'Suspension',      color: 'text-[var(--status-error-text)]' },
    DISMISSAL:     { label: 'Dismissal',       color: 'text-[var(--status-error-text)]' },
    GRIEVANCE:     { label: 'Grievance',       color: 'text-[var(--primary)]' },
};

const inputCls = 'w-full border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] bg-[var(--bg-input)] focus:outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)]';
const labelCls = 'text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1.5';

const StatCard = ({ label, value, icon: Icon, iconCls }: { label: string; value: number; icon: any; iconCls: string }) => (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-center gap-3">
        <div className={cn('p-2 rounded-lg flex-shrink-0', iconCls)}>
            <Icon size={16} className="text-white" />
        </div>
        <div>
            <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
            <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
        </div>
    </div>
);

const Disciplinary: React.FC = () => {
    const user = getStoredUser();
    const canManage = hasPermission(user, 'employee.history.write');
    const [cases, setCases] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        employeeId: '', type: 'WARNING', category: 'CONDUCT',
        reason: '', details: '', hearingDate: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchCases(); fetchEmployees(); }, []);

    const fetchCases = async () => {
        setLoading(true);
        try {
            const res = await api.get('/hr/disciplinary');
            setCases(Array.isArray(res.data) ? res.data : []);
        } catch { toast.error('Failed to load cases'); }
        finally { setLoading(false); }
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/users?status=ACTIVE');
            setEmployees(Array.isArray(res.data) ? res.data : res.data?.employees || []);
        } catch {}
    };

    const handleSubmit = async () => {
        if (!form.employeeId || !form.reason) return toast.error('Employee and reason are required');
        setSaving(true);
        try {
            await api.post('/hr/disciplinary', form);
            toast.success('Case created');
            setShowModal(false);
            setForm({ employeeId: '', type: 'WARNING', category: 'CONDUCT', reason: '', details: '', hearingDate: '' });
            fetchCases();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create case');
        } finally { setSaving(false); }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await api.patch(`/hr/disciplinary/${id}`, { status });
            toast.success('Case updated');
            fetchCases();
        } catch { toast.error('Update failed'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this case permanently?')) return;
        try {
            await api.delete(`/hr/disciplinary/${id}`);
            toast.success('Case deleted');
            fetchCases();
        } catch { toast.error('Delete failed'); }
    };

    const filtered = cases.filter(c =>
        (!search || c.employee?.fullName?.toLowerCase().includes(search.toLowerCase()) || c.reason?.toLowerCase().includes(search.toLowerCase())) &&
        (!filterStatus || c.status === filterStatus) &&
        (!filterType || c.type === filterType)
    );

    const stats = {
        total:      cases.length,
        open:       cases.filter(c => c.status === 'OPEN').length,
        warnings:   cases.filter(c => c.type === 'WARNING' || c.type === 'FINAL_WARNING').length,
        grievances: cases.filter(c => c.type === 'GRIEVANCE').length,
    };

    return (
        <div className="space-y-5 pb-24 lg:pb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Disciplinary & Grievance</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">Manage formal disciplinary actions and employee grievances</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-all shadow-sm w-full sm:w-auto"
                    >
                        <Plus size={16} /> New Case
                    </button>
                )}
            </div>

            {/* Stats — 2 cols on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Total Cases"  value={stats.total}      icon={ShieldAlert}    iconCls="bg-[var(--text-muted)]" />
                <StatCard label="Open Cases"   value={stats.open}       icon={AlertTriangle}  iconCls="bg-[var(--status-warning-text)]" />
                <StatCard label="Warnings"     value={stats.warnings}   icon={FileText}       iconCls="bg-[var(--status-error-text)]" />
                <StatCard label="Grievances"   value={stats.grievances} icon={Eye}            iconCls="bg-[var(--primary)]" />
            </div>

            {/* Filters */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[160px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input type="text" placeholder="Search employee or reason..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                    />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                    <option value="">All Statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                    <option value="">All Types</option>
                    {CASE_TYPES.map(t => <option key={t} value={t}>{typeConfig[t]?.label}</option>)}
                </select>
            </div>

            {/* Cases List */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
                        {filtered.length} case{filtered.length !== 1 ? 's' : ''}
                    </h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)]">
                        <ShieldAlert size={36} className="mb-2 opacity-30" />
                        <p className="text-sm">No cases found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {filtered.map(c => (
                            <div key={c.id} className="px-5 py-4 hover:bg-[var(--bg-hover)] transition-colors">
                                {/* Mobile: stacked; Desktop: single row */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    {/* Employee info */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-sm font-bold text-[var(--text-secondary)] overflow-hidden flex-shrink-0">
                                            {c.employee?.avatarUrl || c.employee?.profilePhoto
                                                ? <img src={c.employee.avatarUrl || c.employee.profilePhoto} alt="" className="w-full h-full object-cover" />
                                                : c.employee?.fullName?.charAt(0)
                                            }
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{c.employee?.fullName}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{c.employee?.jobTitle}</p>
                                        </div>
                                    </div>

                                    {/* Meta + actions */}
                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 pl-12 sm:pl-0">
                                        <div>
                                            <p className={cn('text-xs font-semibold', typeConfig[c.type]?.color)}>{typeConfig[c.type]?.label}</p>
                                            <p className="text-xs text-[var(--text-muted)] truncate max-w-[180px]">{c.reason}</p>
                                        </div>
                                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', statusConfig[c.status]?.cls)}>
                                            {statusConfig[c.status]?.label}
                                        </span>
                                        <p className="text-xs text-[var(--text-muted)]">{new Date(c.createdAt).toLocaleDateString()}</p>
                                        {canManage && (
                                            <div className="flex items-center gap-1">
                                                {c.status === 'OPEN' && (
                                                    <button onClick={() => handleStatusUpdate(c.id, 'ACKNOWLEDGED')}
                                                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-10)] rounded-lg transition-colors"
                                                        title="Mark Acknowledged"
                                                    ><CheckCircle2 size={14} /></button>
                                                )}
                                                {c.status !== 'CLOSED' && (
                                                    <button onClick={() => handleStatusUpdate(c.id, 'CLOSED')}
                                                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--status-success-text)] hover:bg-[var(--status-success-bg)] rounded-lg transition-colors"
                                                        title="Close Case"
                                                    ><X size={14} /></button>
                                                )}
                                                <button onClick={() => handleDelete(c.id)}
                                                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] rounded-lg transition-colors"
                                                    title="Delete"
                                                ><Trash2 size={14} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* New Case Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                            className="relative w-full sm:max-w-lg bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[var(--border-subtle)] max-h-[92dvh] flex flex-col"
                        >
                            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] flex-shrink-0">
                                <h3 className="text-base font-bold text-[var(--text-primary)]">Open Disciplinary / Grievance Case</h3>
                                <button onClick={() => setShowModal(false)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg"><X size={16} /></button>
                            </div>
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                <div>
                                    <label className={labelCls}>Employee *</label>
                                    <select value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} className={inputCls}>
                                        <option value="">Select employee...</option>
                                        {employees.map((e: any) => <option key={e.id} value={e.id}>{e.fullName} — {e.jobTitle}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Type *</label>
                                        <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                                            {CASE_TYPES.map(t => <option key={t} value={t}>{typeConfig[t]?.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Category</label>
                                        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Reason *</label>
                                    <input type="text" placeholder="Brief reason for this case"
                                        value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Details (optional)</label>
                                    <textarea rows={3} placeholder="Full description of the incident..."
                                        value={form.details} onChange={e => setForm(p => ({ ...p, details: e.target.value }))}
                                        className={cn(inputCls, 'resize-none')}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Hearing Date (optional)</label>
                                    <input type="date"
                                        value={form.hearingDate} onChange={e => setForm(p => ({ ...p, hearingDate: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 px-6 pb-6 pt-2 flex-shrink-0">
                                <button onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-xl text-sm font-semibold hover:bg-[var(--bg-elevated)] transition-colors"
                                >Cancel</button>
                                <button onClick={handleSubmit} disabled={saving}
                                    className="flex-[2] py-2.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                                >{saving ? 'Opening Case...' : 'Open Case'}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Disciplinary;
