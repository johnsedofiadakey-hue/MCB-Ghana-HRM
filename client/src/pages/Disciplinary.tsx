import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldAlert, Plus, X, ChevronDown, Clock, CheckCircle2,
    AlertTriangle, FileText, Search, Filter, Eye, Edit2, Trash2
} from 'lucide-react';
import api from '../services/api';
import { toast } from '../utils/toast';
import { cn } from '../utils/cn';
import { getStoredUser, getRankFromRole } from '../utils/session';

const CASE_TYPES = ['WARNING', 'FINAL_WARNING', 'SUSPENSION', 'DISMISSAL', 'GRIEVANCE'];
const CATEGORIES = ['CONDUCT', 'PERFORMANCE', 'ATTENDANCE', 'POLICY', 'SAFETY', 'GRIEVANCE'];
const STATUSES = ['OPEN', 'ACKNOWLEDGED', 'APPEALED', 'CLOSED'];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    OPEN: { label: 'Open', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    ACKNOWLEDGED: { label: 'Acknowledged', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    APPEALED: { label: 'Appealed', color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/5 border-[var(--primary)]/20' },
    CLOSED: { label: 'Closed', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200' },
};

const typeConfig: Record<string, { label: string; color: string }> = {
    WARNING: { label: 'Written Warning', color: 'text-amber-600' },
    FINAL_WARNING: { label: 'Final Warning', color: 'text-orange-600' },
    SUSPENSION: { label: 'Suspension', color: 'text-rose-600' },
    DISMISSAL: { label: 'Dismissal', color: 'text-red-700' },
    GRIEVANCE: { label: 'Grievance', color: 'text-[var(--primary)]' },
};

const StatCard = ({ label, value, color, icon: Icon }: any) => (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <div className={cn('p-1.5 rounded-lg', color)}>
                <Icon size={14} className="text-white" />
            </div>
        </div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
);

const Disciplinary: React.FC = () => {
    const user = getStoredUser();
    const rank = getRankFromRole(user?.role);
    const [cases, setCases] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedCase, setSelectedCase] = useState<any>(null);
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
        total: cases.length,
        open: cases.filter(c => c.status === 'OPEN').length,
        warnings: cases.filter(c => c.type === 'WARNING' || c.type === 'FINAL_WARNING').length,
        grievances: cases.filter(c => c.type === 'GRIEVANCE').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Disciplinary & Grievance</h1>
                    <p className="text-slate-500 mt-1">Manage formal disciplinary actions and employee grievances</p>
                </div>
                {rank >= 70 && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                    >
                        <Plus size={16} /> New Case
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total Cases" value={stats.total} icon={ShieldAlert} color="bg-slate-600" />
                <StatCard label="Open Cases" value={stats.open} icon={AlertTriangle} color="bg-amber-500" />
                <StatCard label="Warnings" value={stats.warnings} icon={FileText} color="bg-orange-500" />
                <StatCard label="Grievances" value={stats.grievances} icon={Eye} color="bg-[var(--primary)]" />
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search employee or reason..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                    />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                >
                    <option value="">All Statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                >
                    <option value="">All Types</option>
                    {CASE_TYPES.map(t => <option key={t} value={t}>{typeConfig[t]?.label}</option>)}
                </select>
            </div>

            {/* Cases Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-700">{filtered.length} case{filtered.length !== 1 ? 's' : ''}</h2>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                        <ShieldAlert size={36} className="mb-2 opacity-30" />
                        <p className="text-sm">No cases found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filtered.map(c => (
                            <div key={c.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 overflow-hidden flex-shrink-0">
                                        {c.employee?.avatarUrl || c.employee?.profilePhoto
                                            ? <img src={c.employee.avatarUrl || c.employee.profilePhoto} alt="" className="w-full h-full object-cover" />
                                            : c.employee?.fullName?.charAt(0)
                                        }
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{c.employee?.fullName}</p>
                                        <p className="text-xs text-slate-400">{c.employee?.jobTitle}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div>
                                        <p className={cn('text-xs font-semibold', typeConfig[c.type]?.color)}>{typeConfig[c.type]?.label}</p>
                                        <p className="text-xs text-slate-400 truncate max-w-[200px]">{c.reason}</p>
                                    </div>
                                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium border', statusConfig[c.status]?.bg, statusConfig[c.status]?.color)}>
                                        {statusConfig[c.status]?.label}
                                    </span>
                                    <p className="text-xs text-slate-400 w-24 text-right">{new Date(c.createdAt).toLocaleDateString()}</p>
                                    {rank >= 70 && (
                                        <div className="flex items-center gap-1">
                                            {c.status === 'OPEN' && (
                                                <button onClick={() => handleStatusUpdate(c.id, 'ACKNOWLEDGED')}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Mark Acknowledged"
                                                ><CheckCircle2 size={14} /></button>
                                            )}
                                            {c.status !== 'CLOSED' && (
                                                <button onClick={() => handleStatusUpdate(c.id, 'CLOSED')}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title="Close Case"
                                                ><X size={14} /></button>
                                            )}
                                            <button onClick={() => handleDelete(c.id)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Delete"
                                            ><Trash2 size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* New Case Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200"
                        >
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                                <h3 className="text-base font-bold text-slate-800">Open Disciplinary / Grievance Case</h3>
                                <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={16} /></button>
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
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Type *</label>
                                        <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                                        >
                                            {CASE_TYPES.map(t => <option key={t} value={t}>{typeConfig[t]?.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Category</label>
                                        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Reason *</label>
                                    <input type="text" placeholder="Brief reason for this case"
                                        value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Details (optional)</label>
                                    <textarea rows={3} placeholder="Full description of the incident..."
                                        value={form.details} onChange={e => setForm(p => ({ ...p, details: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)] resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Hearing Date (optional)</label>
                                    <input type="date"
                                        value={form.hearingDate} onChange={e => setForm(p => ({ ...p, hearingDate: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 px-6 pb-6">
                                <button onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
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
