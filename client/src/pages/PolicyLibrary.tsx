import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, X, CheckCircle2, Clock, Eye, Trash2, Search, Upload, Users, FileText } from 'lucide-react';
import api from '../services/api';
import { toast } from '../utils/toast';
import { cn } from '../utils/cn';
import { getStoredUser, hasPermission } from '../utils/session';

const CATEGORIES = ['GENERAL', 'HR', 'IT', 'SAFETY', 'FINANCE', 'CONDUCT'];

const catColors: Record<string, string> = {
    GENERAL: 'badge-neutral',
    HR:      'badge-info',
    IT:      'badge-info',
    SAFETY:  'badge-warning',
    FINANCE: 'badge-success',
    CONDUCT: 'badge-error',
};

const PolicyLibrary: React.FC = () => {
    const user = getStoredUser();
    const canManage = hasPermission(user, 'employee.write');
    const canViewAcknowledgments = hasPermission(user, 'employee.read');
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');
    // Managers see everything (including their own drafts) by default; regular staff default to Published only.
    const [filterStatus, setFilterStatus] = useState(canManage ? '' : 'PUBLISHED');
    const [showCreate, setShowCreate] = useState(false);
    const [showAckModal, setShowAckModal] = useState<any>(null);
    const [acks, setAcks] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        title: '', description: '', content: '', category: 'GENERAL',
        version: '1.0', isRequired: true,
    });

    useEffect(() => { fetchPolicies(); }, [filterCat, filterStatus]);

    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterCat) params.category = filterCat;
            if (filterStatus) params.status = filterStatus;
            const res = await api.get('/hr/policies', { params });
            setPolicies(Array.isArray(res.data) ? res.data : []);
        } catch { toast.error('Failed to load policies'); }
        finally { setLoading(false); }
    };

    const handleCreate = async () => {
        if (!form.title) return toast.error('Title is required');
        setSaving(true);
        try {
            await api.post('/hr/policies', form);
            toast.success('Policy created as a draft — click the eye icon to publish it to employees');
            setShowCreate(false);
            setForm({ title: '', description: '', content: '', category: 'GENERAL', version: '1.0', isRequired: true });
            fetchPolicies();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create policy');
        } finally { setSaving(false); }
    };

    const handlePublish = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
        try {
            await api.patch(`/hr/policies/${id}`, { status: newStatus });
            toast.success(newStatus === 'PUBLISHED' ? 'Policy published' : 'Policy unpublished');
            fetchPolicies();
        } catch { toast.error('Failed to update'); }
    };

    const handleAcknowledge = async (policyId: string) => {
        try {
            await api.post(`/hr/policies/${policyId}/acknowledge`);
            toast.success('Policy acknowledged');
            fetchPolicies();
        } catch { toast.error('Failed to acknowledge'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this policy?')) return;
        try {
            await api.delete(`/hr/policies/${id}`);
            toast.success('Policy deleted');
            fetchPolicies();
        } catch { toast.error('Delete failed'); }
    };

    const loadAcks = async (policy: any) => {
        setShowAckModal(policy);
        try {
            const res = await api.get(`/hr/policies/${policy.id}/acknowledgments`);
            setAcks(res.data);
        } catch { toast.error('Failed to load acknowledgments'); }
    };

    const filtered = policies.filter(p =>
        !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
    );

    const myAcked = policies.filter(p => p.acknowledgments?.length > 0).length;
    const myPending = policies.filter(p => p.isRequired && p.status === 'PUBLISHED' && p.acknowledgments?.length === 0).length;

    return (
        <div className="space-y-5 pb-24 lg:pb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Policy & Handbook Library</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">Company policies, procedures, and compliance documents</p>
                </div>
                {canManage && (
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm w-full sm:w-auto"
                    >
                        <Plus size={16} /> Add Policy
                    </button>
                )}
            </div>

            {/* Stats row — full width cols on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Total Policies</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{policies.length}</p>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Acknowledged by You</p>
                    <p className="text-2xl font-bold text-[var(--status-success-text)]">{myAcked}</p>
                </div>
                <div className={cn('rounded-xl p-5', myPending > 0 ? 'badge-warning border' : 'bg-[var(--bg-card)] border border-[var(--border-subtle)]')}>
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Pending Acknowledgment</p>
                    <p className={cn('text-2xl font-bold', myPending > 0 ? 'text-[var(--status-warning-text)]' : 'text-[var(--text-primary)]')}>{myPending}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[160px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input type="text" placeholder="Search policies..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                    />
                </div>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                    className="px-3 py-2 border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                    <option value="">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                </select>
            </div>

            {/* Policy Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl h-40 text-[var(--text-muted)]">
                    <BookOpen size={36} className="mb-2 opacity-30" />
                    <p className="text-sm">No policies found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filtered.map(p => {
                        const hasAcked = p.acknowledgments?.length > 0;
                        const ackCount = p._count?.acknowledgments || 0;
                        return (
                            <div key={p.id} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 hover:border-[var(--border-strong)] transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="p-2.5 bg-[var(--primary-10)] rounded-xl flex-shrink-0">
                                            <BookOpen size={18} className="text-[var(--primary)]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="text-sm font-bold text-[var(--text-primary)]">{p.title}</h3>
                                                <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', catColors[p.category] || catColors.GENERAL)}>
                                                    {p.category}
                                                </span>
                                                {p.isRequired && (
                                                    <span className="badge-error px-2 py-0.5 rounded-full text-[11px] font-semibold">Required</span>
                                                )}
                                                <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold',
                                                    p.status === 'PUBLISHED' ? 'badge-success' : 'badge-neutral'
                                                )}>
                                                    {p.status}
                                                </span>
                                            </div>
                                            {p.description && <p className="text-xs text-[var(--text-muted)] mb-2">{p.description}</p>}
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                                                <span>v{p.version}</span>
                                                <span>By {p.createdBy?.fullName}</span>
                                                {p.publishedAt && <span>Published {new Date(p.publishedAt).toLocaleDateString()}</span>}
                                                {canViewAcknowledgments && <span className="flex items-center gap-1"><Users size={11} />{ackCount} acknowledged</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0 pl-12 sm:pl-0">
                                        {p.status === 'PUBLISHED' && !hasAcked && (
                                            <button onClick={() => handleAcknowledge(p.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--primary)]/30 text-[var(--primary)] rounded-lg text-xs font-semibold hover:bg-[var(--primary-10)] transition-colors"
                                            >
                                                <CheckCircle2 size={13} /> Acknowledge
                                            </button>
                                        )}
                                        {hasAcked && p.status === 'PUBLISHED' && (
                                            <span className="flex items-center gap-1 text-xs text-[var(--status-success-text)] font-semibold">
                                                <CheckCircle2 size={13} /> Acknowledged
                                            </span>
                                        )}
                                        {canViewAcknowledgments && (
                                            <button onClick={() => loadAcks(p)}
                                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-10)] rounded-lg transition-colors"
                                                title="View acknowledgments"
                                            ><Users size={14} /></button>
                                        )}
                                        {canManage && (
                                            <>
                                                <button onClick={() => handlePublish(p.id, p.status)}
                                                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--status-success-text)] hover:bg-[var(--status-success-bg)] rounded-lg transition-colors"
                                                    title={p.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                                                ><Eye size={14} /></button>
                                                <button onClick={() => handleDelete(p.id)}
                                                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] rounded-lg transition-colors"
                                                ><Trash2 size={14} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                            className="relative w-full sm:max-w-lg bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[var(--border-subtle)] max-h-[92dvh] flex flex-col"
                        >
                            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] flex-shrink-0">
                                <h3 className="text-base font-bold text-[var(--text-primary)]">Create Policy</h3>
                                <button onClick={() => setShowCreate(false)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg"><X size={16} /></button>
                            </div>
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                <div>
                                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1.5">Title *</label>
                                    <input type="text" placeholder="e.g. Remote Work Policy"
                                        value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                        className="w-full border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1.5">Description</label>
                                    <input type="text" placeholder="Brief summary..."
                                        value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                        className="w-full border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1.5">Policy Content</label>
                                    <textarea rows={5} placeholder="Write or paste the full policy text here..."
                                        value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                                        className="w-full border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1.5">Category</label>
                                        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                            className="w-full border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1.5">Version</label>
                                        <input type="text" placeholder="1.0"
                                            value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                                            className="w-full border border-[var(--border-subtle)] bg-[var(--bg-input)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={form.isRequired} onChange={e => setForm(p => ({ ...p, isRequired: e.target.checked }))}
                                        className="w-4 h-4 rounded border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                    />
                                    <span className="text-sm text-[var(--text-secondary)]">Require all employees to acknowledge this policy</span>
                                </label>
                            </div>
                            <div className="flex gap-3 px-6 pb-6 pt-2 flex-shrink-0">
                                <button onClick={() => setShowCreate(false)}
                                    className="flex-1 py-2.5 border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-xl text-sm font-semibold hover:bg-[var(--bg-elevated)] transition-colors"
                                >Cancel</button>
                                <button onClick={handleCreate} disabled={saving}
                                    className="flex-[2] py-2.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                                >{saving ? 'Creating...' : 'Create Policy'}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Acknowledgments Modal */}
            <AnimatePresence>
                {showAckModal && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowAckModal(null); setAcks(null); }} />
                        <motion.div
                            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                            className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[var(--border-subtle)] max-h-[90dvh] flex flex-col"
                        >
                            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] flex-shrink-0">
                                <div>
                                    <h3 className="text-base font-bold text-[var(--text-primary)]">Acknowledgments</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{showAckModal.title}</p>
                                </div>
                                <button onClick={() => { setShowAckModal(null); setAcks(null); }} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg"><X size={16} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {!acks ? (
                                    <div className="flex items-center justify-center h-20">
                                        <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm text-[var(--text-muted)]">{acks.acknowledged} of {acks.totalEmployees} acknowledged</span>
                                            <div className="w-32 bg-[var(--bg-elevated)] rounded-full h-1.5">
                                                <div className="bg-[var(--primary)] h-1.5 rounded-full" style={{ width: `${(acks.acknowledged / Math.max(acks.totalEmployees, 1)) * 100}%` }} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {acks.acknowledgments.map((a: any) => (
                                                <div key={a.id} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                                                    <span className="text-sm font-medium text-[var(--text-primary)]">{a.employee?.fullName}</span>
                                                    <span className="text-xs text-[var(--text-muted)]">{new Date(a.acknowledgedAt).toLocaleDateString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PolicyLibrary;
