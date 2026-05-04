import React, { useEffect, useState, useCallback } from 'react';
import { toast } from '../utils/toast';
import {
  DollarSign, Plus, Download, FileText,
  X, Edit2, Save, BarChart3, Globe,
  TrendingUp, CreditCard, ShieldCheck, Wallet,
  TrendingDown, PieChart, Activity, Calendar, Users, AlertCircle, Trash2
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRoleRankValue } from '../utils/session';
import { useTranslation } from 'react-i18next';

const statusColors: Record<string, { badge: string; dot: string }> = {
  DRAFT: { badge: 'bg-slate-500/10 text-slate-600 border-slate-500/20', dot: 'bg-slate-500' },
  PENDING_HR: { badge: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20', dot: 'bg-[var(--warning)]' },
  PENDING_MD: { badge: 'bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20', dot: 'bg-[var(--info)]' },
  APPROVED: { badge: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20', dot: 'bg-[var(--success)]' },
  PAID: { badge: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20', dot: 'bg-[var(--primary)]' },
  CANCELLED: { badge: 'bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/20', dot: 'bg-[var(--error)]' },
};

const currencyGradients: Record<string, string> = {
  GHS: 'from-emerald-500/10 to-emerald-500/5',
  USD: 'from-blue-500/10 to-blue-500/5',
  GNF: 'from-rose-500/10 to-rose-500/5',
  EUR: 'from-amber-500/10 to-amber-500/5',
  GBP: 'from-[var(--primary)]/10 to-[var(--primary)]/5',
};

const fmt = (n: number | string, currency = '', lang = 'en') =>
  `${currency ? currency + ' ' : ''}${Number(n).toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface EditingItem { id: string; overtime: string; bonus: string; allowances: string; otherDeductions: string; notes: string; }

const Payroll = () => {
  const { t, i18n } = useTranslation();
  const [runs, setRuns] = useState<any[]>([]);
  const [myPayslips, setMyPayslips] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [yearlySummary, setYearlySummary] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [activeView, setActiveView] = useState<'runs' | 'payslips' | 'summary'>('runs');

  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({ month: String(new Date().getMonth() + 1), year: String(currentYear) });

  const user = getStoredUser();
  const rank = getRoleRankValue(user.role);
  const isAdmin = rank >= 87; // Finance Manager or above
  const isFinance = rank >= 87;
  const isHR = rank >= 88;
  const isMD = rank >= 95;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [slipRes] = await Promise.all([api.get('/payroll/my-payslips')]);
      setMyPayslips(Array.isArray(slipRes.data) ? slipRes.data : []);

      if (isAdmin) {
        const [runRes, summaryRes] = await Promise.all([
          api.get('/payroll'),
          api.get(`/payroll/summary?year=${currentYear}`)
        ]);
        setRuns(Array.isArray(runRes.data?.runs) ? runRes.data.runs : []);
        setYearlySummary(summaryRes.data && typeof summaryRes.data === 'object' ? summaryRes.data : {});
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [isAdmin, currentYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadRunDetail = async (runId: string) => {
    const res = await api.get(`/payroll/${runId}`);
    setSelectedRun(res.data && typeof res.data === "object" ? res.data : null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/payroll/run', form);
      setShowCreate(false); fetchData();
      toast.success('Payroll cycle initialized');
    } catch (err: any) { setError(err?.response?.data?.error || t('payroll.initiation_failure')); }
    finally { setSaving(false); }
  };

  const handleApprove = async (runId: string) => {
    try {
      await api.post(`/payroll/${runId}/approve`);
      fetchData(); if (selectedRun?.id === runId) loadRunDetail(runId);
      toast.success('Payroll cycle authorized');
    } catch (err: any) { toast.error(err?.response?.data?.error || t('common.error')); }
  };

  const handleVoid = async (runId: string) => {
    try {
      await api.post(`/payroll/${runId}/void`);
      fetchData(); setSelectedRun(null);
      toast.success('Payroll cycle voided');
    } catch (err: any) { toast.error(err?.response?.data?.error || t('common.error')); }
  };

  const handleDelete = async (runId: string) => {
    if (!window.confirm('PERMANENT DELETION: Are you sure you want to delete this payroll cycle? This will unlink all associated expenses and loan installments.')) return;
    try {
      await api.delete(`/payroll/${runId}`);
      fetchData(); setSelectedRun(null);
      toast.success('Payroll cycle permanently removed');
    } catch (err: any) { toast.error(err?.response?.data?.error || t('common.error')); }
  };

  const startEditItem = (item: any) => {
    setEditingItem({
      id: item.id,
      overtime: String(item.overtime || 0),
      bonus: String(item.bonus || 0),
      allowances: String(item.allowances || 0),
      otherDeductions: String(item.otherDeductions || 0),
      notes: item.notes || ''
    });
  };

  const saveItem = async () => {
    if (!editingItem) return;
    setSavingItem(true);
    try {
      await api.patch(`/payroll/items/${editingItem.id}`, {
        overtime: parseFloat(editingItem.overtime) || 0,
        bonus: parseFloat(editingItem.bonus) || 0,
        allowances: parseFloat(editingItem.allowances) || 0,
        otherDeductions: parseFloat(editingItem.otherDeductions) || 0,
        notes: editingItem.notes
      });
      setEditingItem(null);
      if (selectedRun) loadRunDetail(selectedRun.id);
      toast.success('Ledger updated');
    } catch (err: any) { toast.error(err?.response?.data?.error || t('common.error')); }
    finally { setSavingItem(false); }
  };

  const downloadCSV = (runId: string) => window.open(`/api/payroll/${runId}/export/csv?lang=${i18n.language}`, '_blank');
  const downloadBankCSV = (runId: string) => window.open(`/api/payroll/${runId}/bank-export/csv?lang=${i18n.language}`, '_blank');
  const downloadPayslip = (runId: string, empId: string) => window.open(`/api/payroll/payslip/${runId}/${empId}/pdf?lang=${i18n.language}`, '_blank');

  const handleExportFullCSV = async () => {
    try {
        const res = await api.get('/payroll/csv', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Fiscal_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-12 pb-32">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{t('payroll.title')}</h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <CreditCard size={18} className="text-[var(--primary)] opacity-60" />
            {t('payroll.subtitle', 'Payroll and Salary Records')}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-4">
            <button 
              onClick={handleExportFullCSV}
              className="p-4 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-sm flex items-center gap-2"
            >
              <Download size={18} />
              <div className="text-[10px] font-black uppercase">Export Full Ledger</div>
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 px-10 h-16 bg-[var(--primary)] text-white rounded-2xl transition-all font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={18} /> {t('payroll.run_payroll')}
            </motion.button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="flex bg-[var(--bg-elevated)] p-1.5 rounded-xl w-full sm:w-fit border border-[var(--border-subtle)] overflow-x-auto whitespace-nowrap px-2">
          {([['runs', t('payroll.cycles', 'Payroll Cycles')], ['payslips', t('payroll.my_payslips', 'My Payslips')], ['summary', t('payroll.summary', 'Payroll Summary')]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setActiveView(v)}
              className={cn(
                "px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                activeView === v 
                  ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}>
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] animate-pulse">{t('payroll.syncing')}</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* My Payslips View */}
            {(!isAdmin || activeView === 'payslips') && (
              <div className="nx-card overflow-hidden">
                <div className="px-10 py-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex items-center justify-between">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] flex items-center gap-3">
                    <Wallet size={16} className="text-[var(--primary)]" /> {t('payroll.my_payslips_title', 'My Official Payslips')}
                  </h2>
                </div>
                {myPayslips.length === 0 ? (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-6">
                        <Wallet size={32} className="opacity-20" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">{t('payroll.no_payslips', 'No payslips found')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="nx-table nexus-responsive-table">
                      <thead>
                        <tr className="bg-[var(--bg-elevated)]/20">
                          <th className="px-10">{t('payroll.headers.period')}</th>
                          <th>{t('payroll.headers.gross')}</th>
                          <th>{t('payroll.headers.tax')}</th>
                          <th>{t('payroll.headers.ss')}</th>
                          <th>{t('payroll.headers.net')}</th>
                          <th className="text-right">{t('payroll.headers.action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]/50">
                        {(myPayslips || []).map((slip: any) => (
                          <tr key={slip.id} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                            <td className="px-10 py-6" data-label={t('payroll.headers.period')}>
                              <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-[var(--primary)]/5 text-[var(--primary)] group-hover:bg-[var(--primary)]/10 transition-colors">
                                    <Calendar size={14} />
                                </div>
                                <span className="text-[14px] font-bold tracking-tight text-[var(--text-primary)]">{slip.run?.period}</span>
                              </div>
                            </td>
                            <td className="text-[13px] font-medium text-[var(--text-secondary)]" data-label={t('payroll.headers.gross')}>{fmt(slip.grossPay, slip.currency, i18n.language)}</td>
                             <td className="text-[13px] font-bold text-[var(--error)]" data-label={t('payroll.headers.tax')}>-{fmt(slip.tax, slip.currency, i18n.language)}</td>
                            <td className="text-[13px] font-bold text-[var(--warning)]" data-label={t('payroll.headers.ss')}>-{fmt(slip.ssnit, slip.currency, i18n.language)}</td>
                            <td className="py-6" data-label={t('payroll.headers.net')}>
                              <div className="px-4 py-2 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/10 text-[var(--success)] font-black text-[15px] w-fit">
                                {fmt(slip.netPay, slip.currency, i18n.language)}
                              </div>
                            </td>
                            <td className="text-right px-10" data-label={t('payroll.headers.action')}>
                              <button
                                onClick={() => downloadPayslip(slip.runId, user?.id || '')}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)] transition-all"
                              >
                                <FileText size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Summary View */}
            {isAdmin && activeView === 'summary' && (
              <div className="space-y-10">
                <div className="flex items-center gap-4 px-2">
                  <div className="p-2.5 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">{t('payroll.summary_title', 'Payroll Summary')}</h2>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest opacity-60">{t('payroll.ytd', { year: currentYear })}</p>
                  </div>
                </div>

                {Object.keys(yearlySummary).length === 0 ? (
                  <div className="nx-card p-32 text-center border-dashed border-2 border-[var(--border-subtle)] bg-transparent">
                    <PieChart size={48} className="mx-auto mb-6 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">{t('payroll.no_summary')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Object.entries(yearlySummary || {}).map(([currency, s]: any) => (
                      <motion.div
                        key={currency}
                        whileHover={{ y: -5 }}
                        className="nx-card p-6 sm:p-10 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] relative overflow-hidden group"
                      >
                        <div className={cn("absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[60px] opacity-20 transition-transform group-hover:scale-110", (currencyGradients[currency] || 'bg-slate-500/10') as string)} />
                        
                        <div className="flex items-center justify-between mb-10">
                           <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", 
                             currency === 'USD' ? 'text-blue-600 border-blue-200' :
                             currency === 'GHS' ? 'text-emerald-600 border-emerald-200' : 
                             'text-[var(--text-primary)] border-[var(--border-subtle)]'
                           )}>
                             {t('payroll.payouts', { currency })}
                           </div>
                           <Globe size={18} className="text-[var(--text-muted)] opacity-30" />
                        </div>

                        <div className="space-y-6">
                           {[
                             { label: t('payroll.gross_reserve'), value: s.gross, icon: TrendingUp, color: 'text-[var(--text-primary)]' },
                             { label: t('payroll.fiscal_tax'), value: s.tax, icon: TrendingDown, color: 'text-rose-500' },
                             { label: t('payroll.ss_commitment'), value: s.ssnit, icon: ShieldCheck, color: 'text-amber-500' },
                             { label: t('payroll.net_total', 'Net Total Paid'), value: s.net, icon: DollarSign, color: 'text-emerald-600' },
                           ].map(row => (
                             <div key={row.label} className="flex items-center justify-between">
                               <div className="flex items-center gap-3 opacity-60">
                                 <row.icon size={13} />
                                 <span className="text-[10px] font-bold uppercase tracking-widest">{row.label}</span>
                               </div>
                               <span className={cn("text-[15px] font-black tracking-tight", row.color)}>
                                 {fmt(row.value, currency, i18n.language)}
                               </span>
                             </div>
                           ))}
                        </div>

                        <div className="mt-10 pt-8 border-t border-[var(--border-subtle)]/50 flex justify-between items-center opacity-40">
                           <span className="text-[10px] font-black uppercase tracking-widest italic">{t('payroll.total_payslips', { count: s.count })}</span>
                           <Activity size={12} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cycles View (Runs) */}
            {isAdmin && activeView === 'runs' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Cycles Navigator */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="flex items-center gap-3 px-2">
                    <Activity size={18} className="text-[var(--primary)]" />
                    <h2 className="text-[11px] font-black uppercase tracking-[0.3em]">{t('payroll.history_title', 'Payroll History')}</h2>
                  </div>
                  <div className="space-y-4">
                    {(runs || []).map((run: any) => (
                      <motion.button
                        key={run.id}
                        whileHover={{ x: 4 }}
                        onClick={() => loadRunDetail(run.id)}
                        className={cn(
                          "w-full p-8 nx-card text-left transition-all relative overflow-hidden group",
                          selectedRun?.id === run.id
                            ? "border-2 border-[var(--primary)] shadow-2xl shadow-[var(--primary)]/5"
                            : "bg-[var(--bg-elevated)]/50 border-2 border-transparent"
                        )}>
                        <div className="flex items-center justify-between mb-4">
                           <p className="text-xl font-black tracking-tighter text-[var(--text-primary)]">{run.period}</p>
                           <div className={cn("w-2 h-2 rounded-full", statusColors[run.status]?.dot.replace('bg-', 'bg-'))} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg border", statusColors[run.status]?.badge)}>
                            {run.status}
                          </span>
                          <p className="text-[11px] font-bold text-[var(--text-muted)] tracking-tight">Σ {fmt(run.totalNet, '', i18n.language)}</p>
                        </div>
                      </motion.button>
                    ))}
                    {runs.length === 0 && (
                      <div className="nx-card p-20 text-center bg-transparent border-dashed border-2 border-[var(--border-subtle)]">
                        <DollarSign size={32} className="mx-auto mb-4 opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t('payroll.no_active_cycles')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detail Orchestrator */}
                <div className="lg:col-span-8">
                  {selectedRun ? (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="nx-card p-6 sm:p-10 lg:p-14 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/5 blur-[80px] rounded-full" />
                      
                      <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-14 relative z-10">
                        <div>
                           <div className="flex items-center gap-3 mb-2">
                             <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", statusColors[selectedRun.status]?.dot)} />
                             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">{t('payroll.cycle_status', { status: selectedRun.status })}</span>
                           </div>
                           <h2 className="text-5xl font-black text-[var(--text-primary)] tracking-tighter uppercase">{selectedRun.period}</h2>
                        </div>
                        <div className="flex items-center flex-wrap gap-3">
                            <button 
                             onClick={() => downloadCSV(selectedRun.id)}
                             className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] transition-all text-[var(--text-primary)] flex items-center gap-2 group"
                             title={t('payroll.export_ledger_csv')}
                            >
                              <Download size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                            <button 
                             onClick={() => downloadBankCSV(selectedRun.id)}
                             className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all text-amber-600 flex items-center gap-2 group"
                             title={t('payroll.export_bank_csv')}
                            >
                              <CreditCard size={20} className="group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{t('payroll.bank_transfer', 'Bank Batch')}</span>
                            </button>
                           <div className="flex items-center gap-3">
                               {selectedRun.status === 'DRAFT' && isFinance && (
                                 <button 
                                  onClick={() => handleApprove(selectedRun.id)}
                                  className="px-8 h-[52px] rounded-2xl bg-amber-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-amber-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                                 >
                                   Request HR Review
                                 </button>
                               )}
                               {selectedRun.status === 'PENDING_HR' && isHR && (
                                 <button 
                                  onClick={() => handleApprove(selectedRun.id)}
                                  className="px-8 h-[52px] rounded-2xl bg-[var(--primary)] text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-95 transition-all"
                                 >
                                   Approve & Send to MD
                                 </button>
                               )}
                               {selectedRun.status === 'PENDING_MD' && isMD && (
                                 <button 
                                  onClick={() => handleApprove(selectedRun.id)}
                                  className="px-8 h-[52px] rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                                 >
                                   Final MD Authorization
                                 </button>
                               )}

                               {selectedRun.status !== 'PAID' && (
                                 <button 
                                  onClick={() => handleDelete(selectedRun.id)}
                                  className="w-[52px] h-[52px] rounded-2xl bg-rose-500/5 text-rose-500 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                                  title="Permanently Delete Cycle"
                                 >
                                   <Trash2 size={20} />
                                 </button>
                               )}
                             </div>
                        </div>
                      </div>

                      {/* Triage Dashboard */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-14 relative z-10">
                        {[
                          { label: t('payroll.personnel_ledger_count'), value: selectedRun.items?.length || 0, icon: Users, color: 'text-[var(--primary)]' },
                          { label: t('payroll.gross_total', 'Total Gross'), value: fmt(selectedRun.totalGross as number, '', i18n.language), icon: TrendingUp, color: 'text-[var(--text-primary)]' },
                          { label: t('payroll.net_payout', 'Total Net Payout'), value: fmt(selectedRun.totalNet as number, '', i18n.language), icon: DollarSign, color: 'text-emerald-600' },
                        ].map(s => (
                          <div key={s.label} className="p-8 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] group">
                            <div className="flex items-center gap-2 mb-4 opacity-40">
                              <s.icon size={12} />
                              <p className="text-[9px] font-black uppercase tracking-[0.2em]">{s.label}</p>
                            </div>
                            <p className={cn("text-3xl font-black tracking-tight", s.color)}>{s.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Payroll Records List */}
                      <div className="space-y-6 relative z-10">
                         <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] ml-2">{t('payroll.list_title', 'Staff Payroll Records')}</h3>
                         <div className="overflow-x-auto">
                            <table className="nx-table nexus-responsive-table">
                               <thead>
                                 <tr>
                                   <th className="px-8">{t('payroll.headers.associate')}</th>
                                   <th>{t('payroll.headers.baseline')}</th>
                                   <th>{t('payroll.headers.adjustments')}</th>
                                   <th>{t('payroll.headers.bonuses', 'Bonuses')}</th>
                                   <th>{t('payroll.headers.fiscal_withholding')}</th>
                                   <th>{t('payroll.headers.net_payout')}</th>
                                   <th className="text-right">{t('payroll.headers.action')}</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-[var(--border-subtle)]/50">
                                 {(selectedRun.items || []).map((item: any) => {
                                   const isEditing = editingItem?.id === item.id;
                                   const extras = Number(item.overtime) + Number(item.allowances);
                                   const bonus = Number(item.bonus);
                                   return (
                                     <tr key={item.id} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                                       <td className="px-8 py-6" data-label={t('payroll.headers.associate')}>
                                         <p className="text-[14px] font-bold text-[var(--text-primary)] tracking-tight">{item.employee.fullName}</p>
                                         <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5 opacity-60">{item.employee.jobTitle}</p>
                                       </td>
                                       <td className="text-[13px] font-medium text-[var(--text-secondary)]" data-label={t('payroll.headers.baseline')}>{fmt(item.baseSalary, item.currency, i18n.language)}</td>
                                       <td data-label={t('payroll.headers.adjustments')}>
                                         {extras > 0 ? (
                                           <div className="px-3 py-1 rounded-lg bg-[var(--primary)]/5 text-[var(--primary)] border border-[var(--primary)]/10 text-[10px] font-black w-fit">+{fmt(extras, '', i18n.language)}</div>
                                         ) : <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase opacity-30">—</span>}
                                       </td>
                                       <td data-label={t('payroll.headers.bonuses')}>
                                         {bonus > 0 ? (
                                            <div className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black w-fit shadow-sm flex items-center gap-1.5">
                                               <TrendingUp size={10} /> {fmt(bonus, '', i18n.language)}
                                            </div>
                                         ) : <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase opacity-30">—</span>}
                                       </td>
                                       <td className="text-[10px] font-bold text-rose-500" data-label={t('payroll.headers.fiscal_withholding')}>-{fmt(Number(item.tax) + Number(item.ssnit), '', i18n.language)}</td>
                                       <td className="text-[14px] font-black text-[var(--text-primary)]" data-label={t('payroll.headers.net_payout')}>{fmt(item.netPay, item.currency, i18n.language)}</td>
                                       <td className="text-right px-8" data-label={t('payroll.headers.action')}>
                                          <div className="flex justify-end gap-2 pr-2">
                                            {selectedRun.status === 'DRAFT' && (isFinance || isHR || isMD) && (
                                              !isEditing ? (
                                                <button onClick={() => startEditItem(item)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)] transition-all"><Edit2 size={13} /></button>
                                              ) : (
                                                <div className="flex gap-2">
                                                  <button onClick={saveItem} className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><Save size={13} /></button>
                                                  <button onClick={() => setEditingItem(null)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20"><X size={13} /></button>
                                                </div>
                                              )
                                            )}
                                            <button onClick={() => downloadPayslip(selectedRun.id, item.employeeId)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)] transition-all"><FileText size={13} /></button>
                                          </div>
                                       </td>
                                     </tr>
                                   );
                                 })}
                               </tbody>
                            </table>
                         </div>
                      </div>

                      {/* Adjustment Overlay */}
                      <AnimatePresence>
                        {editingItem && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="mt-16 p-10 nx-card border-2 border-[var(--primary)]/20 shadow-2xl relative bg-white/50 backdrop-blur-xl"
                          >
                             <div className="flex items-center gap-3 mb-10">
                               <ShieldCheck size={20} className="text-[var(--primary)]" />
                               <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Adjustment Suite — {selectedRun.items?.find((i: any) => i.id === editingItem.id)?.employee.fullName}</p>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                                {(['overtime', 'bonus', 'allowances', 'otherDeductions'] as const).map(field => (
                                  <div key={field} className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                                      {field === 'otherDeductions' ? t('payroll.labels.net_deductions') : field}
                                    </label>
                                    <input type="number" className="w-full bg-white/50 rounded-xl border-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none py-4 px-5 text-[16px] font-black transition-all"
                                      value={editingItem[field]}
                                      onChange={e => setEditingItem(prev => prev ? { ...prev, [field]: e.target.value } : null)}
                                    />
                                  </div>
                                ))}
                             </div>
                             <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">{t('payroll.ledger_justification')}</label>
                                <input className="w-full bg-white/50 border border-[var(--border-subtle)] rounded-2xl p-4 text-[14px] font-medium focus:border-[var(--primary)] outline-none transition-all" placeholder={t('payroll.rationale_placeholder')} value={editingItem.notes}
                                   onChange={e => setEditingItem(prev => prev ? { ...prev, notes: e.target.value } : null)} />
                             </div>
                             <div className="mt-12 flex justify-end">
                                <button 
                                  onClick={saveItem} disabled={savingItem}
                                  className="px-10 py-5 rounded-2xl bg-[var(--primary)] text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[var(--primary)]/30 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                  {savingItem ? t('payroll.syncing_ledger') : t('payroll.commit_adjustments')}
                                </button>
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <div className="nx-card h-full min-h-[500px] flex flex-col items-center justify-center p-20 text-center border-dashed border-2 border-[var(--border-subtle)] bg-transparent">
                      <div className="w-24 h-24 rounded-[2.5rem] bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] flex items-center justify-center mb-8">
                        <Activity size={32} className="text-[var(--text-muted)] opacity-20" />
                      </div>
                      <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-2">{t('payroll.select_cycle', 'Select a Cycle')}</h3>
                      <p className="text-[11px] text-[var(--text-muted)] max-w-xs leading-relaxed uppercase tracking-widest font-black opacity-40">{t('payroll.select_cycle_tip', 'Choose a payroll run from the list to view details')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Initialize Run Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-xl bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-subtle)] shadow-2xl overflow-hidden relative z-10"
            >
              <div className="px-10 py-10 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex justify-between items-center">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20 shadow-lg relative">
                      <Wallet className="text-[var(--primary)]" size={24} />
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                   </div>
                   <div>
                     <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">{t('payroll.new_run', 'New Payroll Run')}</h2>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1 opacity-60">Authorize Payment Process</p>
                   </div>
                </div>
                <button onClick={() => setShowCreate(false)} className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={20} /></button>
              </div>

              <div className="p-10 space-y-10">
                {error && (
                  <div className="px-5 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[11px] font-black uppercase tracking-widest flex items-center gap-3">
                    <AlertCircle size={18} /> {error}
                  </div>
                )}
                <form onSubmit={handleCreate} className="space-y-10">
                   <div className="bg-[var(--bg-elevated)]/50 p-8 rounded-[2.5rem] border border-[var(--border-subtle)]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] ml-1 flex items-center gap-2">
                            <Calendar size={14} className="text-[var(--primary)]" /> {t('payroll.temporal_month')}
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                             {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                               <button 
                                key={m}
                                type="button"
                                onClick={() => setForm({ ...form, month: String(m) })}
                                className={cn(
                                  "h-10 rounded-xl text-[10px] font-black transition-all border",
                                  form.month === String(m)
                                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                                )}
                               >
                                 {new Date(2024, m-1).toLocaleString('default', { month: 'short' }).toUpperCase()}
                               </button>
                             ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] ml-1 flex items-center gap-2">
                            <BarChart3 size={14} className="text-[var(--primary)]" /> {t('payroll.fiscal_year')}
                          </label>
                          <div className="flex items-center gap-3">
                            <button 
                              type="button" 
                              onClick={() => setForm(f => ({ ...f, year: String(parseInt(f.year) - 1) }))}
                              className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center hover:bg-[var(--bg-elevated)] transition-all font-black"
                            >-</button>
                            <input 
                              type="number" 
                              className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border-subtle)] rounded-xl h-12 text-center text-[16px] font-black focus:border-[var(--primary)] outline-none transition-all" 
                              value={form.year}
                              onChange={e => setForm({ ...form, year: e.target.value })} 
                              min="2020" max="2099" 
                            />
                            <button 
                              type="button" 
                              onClick={() => setForm(f => ({ ...f, year: String(parseInt(f.year) + 1) }))}
                              className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center hover:bg-[var(--bg-elevated)] transition-all font-black"
                            >+</button>
                          </div>
                        </div>
                      </div>
                   </div>

                   <div className="p-8 rounded-[2rem] bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck size={16} className="text-[var(--primary)]" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">{t('payroll.compliance_safeguards')}</p>
                      </div>
                      <p className="text-[11px] font-bold text-[var(--text-muted)] leading-relaxed flex items-center gap-3 opacity-60">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" /> {t('payroll.auto_tax', 'Automated PAYE Tax Calculation')}
                      </p>
                      <p className="text-[11px] font-bold text-[var(--text-muted)] leading-relaxed flex items-center gap-3 opacity-60">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" /> {t('payroll.auto_ss', 'Mandatory Social Security Withholding')}
                      </p>
                   </div>

                   <div className="flex justify-end gap-4 pt-6">
                      <button type="submit" className="w-full h-16 rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 hover:scale-[1.02] active:scale-95 transition-all">
                        {saving ? t('payroll.starting', 'Starting Process...') : t('payroll.start_run', 'Start Payroll Run')}
                      </button>
                   </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Payroll;
