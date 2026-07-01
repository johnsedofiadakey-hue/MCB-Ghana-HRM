import React, { useState, useEffect } from 'react';
import { toast } from '../utils/toast';
import { Wallet, DollarSign, Receipt, Plus, Loader2, CheckCircle, XCircle, ChevronDown, ShieldCheck, History as FinanceHistory, X, FileText, Calendar, Eye } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';
import { getStoredUser, hasPermission } from '../utils/session';
import { useTheme } from '../context/ThemeContext';

const fmt = (n: number | string, currency = '', lang = 'en') =>
  `${currency ? currency + ' ' : ''}${Number(n).toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FinanceHub = () => {
    const { t, i18n } = useTranslation();
    const { settings } = useTheme();
    // BUG N3 FIX: Added 'payslips' to activeTab state
    const [activeTab, setActiveTab] = useState<'loans' | 'expenses' | 'payslips'>('loans');
    const [viewScope, setViewScope] = useState<'my' | 'all'>('my');

    const [items, setItems] = useState<any[]>([]);
    const [payslips, setPayslips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [error, setError] = useState('');
    const [loadingPayslipId, setLoadingPayslipId] = useState<string | null>(null);

    const user = getStoredUser();
    const canManageLoans = hasPermission(user, 'finance.loan.manage');
    const canManageExpenses = hasPermission(user, 'finance.expense.manage');
    const isAdmin = activeTab === 'loans' ? canManageLoans : canManageExpenses;

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'payslips') {
                const res = await api.get('/payroll/my-payslips');
                setPayslips(Array.isArray(res.data) ? res.data : []);
            } else {
                const endpoint = `/${activeTab}${viewScope === 'all' && isAdmin ? '' : '/me'}`;
                const res = await api.get('/finance' + endpoint);
                setItems(Array.isArray(res.data) ? res.data : []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, viewScope, isAdmin]);

    useEffect(() => {
        if (!isAdmin && viewScope === 'all') setViewScope('my');
    }, [isAdmin, viewScope]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading('submit');
        setError('');
        try {
            await api.post(`/finance/${activeTab}`, formData);
            setShowModal(false);
            setFormData({});
            fetchData();
        } catch (err: any) {
            setError(err?.response?.data?.error || t('finance.submission_failed'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleStatusUpdate = async (id: string, action: 'approve' | 'reject') => {
        setActionLoading(id);
        try {
            await api.post(`/finance/${activeTab}/${id}/${action}`);
            fetchData();
        } catch (err: any) {
            toast.info(String(err?.response?.data?.error || t('finance.action_failed')));
        } finally {
            setActionLoading(null);
        }
    };

    const viewPayslip = async (runId: string, empId: string, periodLabel?: string) => {
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(
                '<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;font-family:Inter,sans-serif">' +
                '<p style="color:#94a3b8;font-size:14px">Generating payslip…</p></body></html>'
            );
        }
        const key = `${runId}-${empId}`;
        setLoadingPayslipId(key);
        try {
            const res = await api.get(`/payroll/payslip/${runId}/${empId}/pdf?lang=${i18n.language}`, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            if (win && !win.closed) {
                win.location.href = blobUrl;
            } else {
                window.open(blobUrl, '_blank');
            }
        } catch {
            if (win && !win.closed) win.close();
            toast.error('Failed to load payslip. Please try again.');
        } finally {
            setLoadingPayslipId(null);
        }
    };

    return (
        <div className="space-y-10 page-enter min-h-screen pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
                <div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--text-primary)] font-display tracking-tight flex items-center gap-4">
                        <Wallet size={36} className="text-[var(--primary)]" /> <span>{t('finance.title').split(' ')[0]}</span> {t('finance.title').split(' ')[1]}
                    </h1>
                    <p className="text-sm font-medium text-[var(--text-muted)] mt-2 flex items-center gap-2">
                        <DollarSign size={14} className="text-[var(--primary)]" />
                        {t('finance.subtitle')}
                    </p>
                </div>

                {activeTab !== 'payslips' && (
                  <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => { setFormData({}); setShowModal(true); }}
                      className="btn-primary px-6 sm:px-10 py-3 sm:py-5 rounded-2xl shadow-xl text-[10px] sm:text-[11px]"
                  >
                      <Plus size={18} /> {activeTab === 'loans' ? t('finance.new_advance') : t('finance.new_expense')}
                  </motion.button>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-between items-end">
                <div className="flex gap-2 p-1 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] w-fit overflow-x-auto no-scrollbar max-w-full">
                    <button onClick={() => setActiveTab('loans')} className={cn("px-6 sm:px-10 py-3 sm:py-4 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap", activeTab === 'loans' ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]")}>{t('finance.strategic_advances')}</button>
                    <button onClick={() => setActiveTab('expenses')} className={cn("px-6 sm:px-10 py-3 sm:py-4 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap", activeTab === 'expenses' ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]")}>{t('finance.expense_audits')}</button>
                    <button onClick={() => setActiveTab('payslips')} className={cn("px-6 sm:px-10 py-3 sm:py-4 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap", activeTab === 'payslips' ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]")}>{t('payroll.my_payslips', 'My Payslips')}</button>
                </div>

                {isAdmin && activeTab !== 'payslips' && (
                    <div className="flex gap-2 p-1.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] w-fit">
                        <button onClick={() => setViewScope('my')} className={cn("px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all", viewScope === 'my' ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}>{t('finance.internal_view')}</button>
                        <button onClick={() => setViewScope('all')} className={cn("px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all", viewScope === 'all' ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}>{t('finance.global_matrix')}</button>
                    </div>
                )}
            </div>

            <div className="nx-card overflow-hidden flex flex-col min-h-[500px]">
                <div className="overflow-x-auto custom-scrollbar flex-grow">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-[400px] gap-6">
                            <Loader2 size={32} className="text-[var(--primary)] animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] animate-pulse">{t('finance.syncing_ledger')}</p>
                        </div>
                    ) : (activeTab === 'payslips' ? payslips : items).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-[var(--text-muted)] opacity-40">
                            <FinanceHistory size={64} className="mb-6" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t('finance.void_history')}</p>
                        </div>
                    ) : activeTab === 'payslips' ? (
                        <table className="nx-table">
                            <thead>
                                <tr className="bg-[var(--bg-elevated)]/50">
                                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] text-left">{t('payroll.headers.period')}</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('payroll.headers.gross')}</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('payroll.headers.tax')}</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('payroll.headers.net')}</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] text-right">{t('payroll.headers.action')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]/30">
                                {payslips.map((slip: any) => (
                                    <tr key={slip.id} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-lg bg-[var(--primary)]/5 text-[var(--primary)]">
                                                    <Calendar size={14} />
                                                </div>
                                                <span className="text-[14px] font-bold tracking-tight text-[var(--text-primary)]">{slip.run?.period}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-[13px] font-medium text-[var(--text-secondary)]">
                                            {fmt(slip.grossPay, slip.currency, i18n.language)}
                                        </td>
                                        <td className="px-8 py-6 text-[13px] font-bold text-[var(--error)]">
                                            -{fmt(Number(slip.tax) + Number(slip.ssnit), slip.currency, i18n.language)}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="px-4 py-2 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/10 text-[var(--success)] font-black text-[15px] w-fit">
                                                {fmt(slip.netPay, slip.currency, i18n.language)}
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <button
                                                onClick={() => viewPayslip(slip.runId, user?.id || '', slip.run?.period)}
                                                disabled={loadingPayslipId === `${slip.runId}-${user?.id}`}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--primary)]/5 text-[var(--primary)] hover:bg-[var(--primary)]/15 border border-[var(--primary)]/20 hover:border-[var(--primary)]/40 transition-all ml-auto disabled:opacity-50"
                                                title="View Payslip"
                                            >
                                                {loadingPayslipId === `${slip.runId}-${user?.id}` ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="nx-table">
                            <thead>
                                <tr className="bg-[var(--bg-elevated)]/50">
                                    {viewScope === 'all' && <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] text-left">{t('finance.entity')}</th>}
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('finance.magnitude')}</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('finance.strategic_purpose')}</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('finance.registry_status')}</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('finance.timestamp')}</th>
                                    {viewScope === 'all' && <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] text-right">{t('finance.approvals')}</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]/30">
                                {(items || []).map((item) => (
                                    <tr key={item.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors group">
                                        {viewScope === 'all' && (
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] font-black text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:border-[var(--primary)]/30 transition-all">
                                                        {item.employee?.fullName?.charAt(0)}
                                                    </div>
                                                    <p className="font-bold text-sm text-[var(--text-primary)] uppercase tracking-tight">{item.employee?.fullName || '—'}</p>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xl font-black font-display tracking-tight text-[var(--primary)]">
                                                    {activeTab === 'loans' ? item.principalAmount : item.amount} <span className="text-[10px] opacity-60 font-mono tracking-normal">{activeTab === 'expenses' ? item.currency : (settings?.currency || 'USD')}</span>
                                                </span>
                                                {activeTab === 'loans' && <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 mt-1">{t('finance.horizon')}: {item.monthsDuration} {t('finance.months')}</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors uppercase tracking-tight">{activeTab === 'loans' ? item.purpose || item.type : item.title}</span>
                                                {activeTab === 'expenses' && <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1 opacity-60">{t(`finance.categories.${item.category}`)}</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={cn("px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                                item.status === 'APPROVED' ? "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20" :
                                                    item.status === 'REJECTED' ? "bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/20" :
                                                        item.status === 'PAID' ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20" :
                                                            "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20"
                                            )}>{t(`finance.status.${item.status}`)}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">
                                                {new Date(item.requestedAt || item.submittedAt).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                                            </span>
                                        </td>
                                        {viewScope === 'all' && (
                                            <td className="px-8 py-5 text-right">
                                                {item.status === 'PENDING' ? (
                                                    <div className="flex items-center justify-end gap-3">
                                                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleStatusUpdate(item.id, 'approve')} disabled={actionLoading === item.id} className="w-10 h-10 rounded-xl bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 hover:bg-[var(--success)] hover:text-white transition-all flex items-center justify-center shadow-lg"><CheckCircle size={18} /></motion.button>
                                                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleStatusUpdate(item.id, 'reject')} disabled={actionLoading === item.id} className="w-10 h-10 rounded-xl bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20 hover:bg-[var(--error)] hover:text-white transition-all flex items-center justify-center shadow-lg"><XCircle size={18} /></motion.button>
                                                    </div>
                                                ) : <ShieldCheck size={18} className="text-[var(--text-muted)] opacity-20 inline-block" />}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Creation Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-[var(--bg-main)]/80 backdrop-blur-xl" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="nx-card w-full max-w-lg bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-4 sm:p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20 text-[var(--primary)] shadow-lg"><Receipt size={28} /></div>
                                    <div>
                                        <h2 className="text-3xl font-black text-[var(--text-primary)] font-display tracking-tight uppercase">{t('finance.strategic_request')}</h2>
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mt-1 opacity-60">
                                            {activeTab === 'loans' ? t('finance.advance_registry') : t('finance.expense_audit')}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={20} /></button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                                {error && <div className="p-5 rounded-2xl bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] text-[10px] font-black uppercase tracking-[0.2em]">{error}</div>}

                                {activeTab === 'loans' ? (
                                    <>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">{t('finance.magnitude_label')}</label>
                                            <input type="number" required className="nx-input p-5 font-bold text-lg" value={formData.principalAmount || ''} onChange={e => setFormData({ ...formData, principalAmount: e.target.value })} placeholder="0.00" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">{t('finance.repayment_horizon')}</label>
                                            <input type="number" required max={24} className="nx-input p-5 font-bold" value={formData.monthsDuration || ''} onChange={e => setFormData({ ...formData, monthsDuration: e.target.value })} placeholder={t('finance.max_months')} />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">{t('finance.operational_purpose')}</label>
                                            <textarea required className="nx-input p-5 font-bold h-32" value={formData.purpose || ''} onChange={e => setFormData({ ...formData, purpose: e.target.value })} placeholder={t('finance.purpose_placeholder')} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">{t('finance.audit_amount')}</label>
                                            <input type="number" required className="nx-input p-5 font-bold text-lg" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">{t('finance.manifest_title')}</label>
                                            <input type="text" required className="nx-input p-5 font-bold" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder={t('finance.operational_title')} />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">{t('finance.domain_category')}</label>
                                            <div className="relative">
                                                <select required className="nx-input p-5 font-bold appearance-none" value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                                    <option value="">{t('finance.select_domain')}</option>
                                                    {['TRAVEL', 'SUPPLIES', 'MEALS', 'OTHER'].map(cat => (
                                                        <option key={cat} value={cat}>{t(`finance.categories.${cat}`)}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                                                    <ChevronDown size={18} />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="flex gap-5 pt-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">{t('finance.discard')}</button>
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={!!actionLoading} className="btn-primary flex-[2] py-5 shadow-2xl shadow-[var(--primary)]/20">
                                        {actionLoading === 'submit' ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                                        <span>{actionLoading === 'submit' ? t('finance.transmitting') : t('finance.authorize_request')}</span>
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FinanceHub;
