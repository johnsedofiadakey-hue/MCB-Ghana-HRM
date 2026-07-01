import { useEffect, useState, useCallback } from 'react';
import { Shield, Search, ChevronLeft, ChevronRight, Loader2, Activity, Terminal, Download, User, Filter, X } from 'lucide-react';
import api from '../services/api';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

const actionColor: Record<string, string> = {
  LEAVE_APPLIED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  LEAVE_APPROVED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  LEAVE_REJECTED: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  LEAVE_CANCELLED: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  LEAVE_BALANCE_ADJUSTED: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  KPI_ASSIGNED: 'text-[var(--primary)] bg-[var(--primary)]/10 border-[var(--primary)]/20',
  KPI_SUBMITTED: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  KPI_REVIEW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  APPRAISAL_SELF_SUBMIT: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  APPRAISAL_MANAGER_REVIEW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  CREATE_ASSET: 'text-slate-400 bg-white/5 border-white/10',
  ASSIGN_ASSET: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  PAYROLL_RELEASED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  PAYROLL_CREATED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  SUPPORT_TICKET_CREATED: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  SUPPORT_TICKET_CLOSED: 'text-slate-400 bg-white/5 border-white/10',
  MEDICAL_CERT_UPLOADED: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  EMPLOYEE_CREATED: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  EMPLOYEE_UPDATED: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const ACTION_TYPES = [
  'LEAVE_APPLIED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'LEAVE_BALANCE_ADJUSTED',
  'KPI_ASSIGNED', 'KPI_SUBMITTED', 'KPI_REVIEW',
  'APPRAISAL_SELF_SUBMIT', 'APPRAISAL_MANAGER_REVIEW',
  'CREATE_ASSET', 'ASSIGN_ASSET',
  'PAYROLL_RELEASED', 'PAYROLL_CREATED',
  'SUPPORT_TICKET_CREATED', 'SUPPORT_TICKET_CLOSED',
  'MEDICAL_CERT_UPLOADED', 'EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED',
];

const AuditLogs = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<any>({ logs: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [filterUserId, setFilterUserId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [auditUsers, setAuditUsers] = useState<{ id: string; fullName: string; email: string }[]>([]);

  const activeFilterCount = [filterUserId, filterAction, filterDateFrom, filterDateTo].filter(Boolean).length;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterUserId) params.set('userId', filterUserId);
      if (filterAction) params.set('action', filterAction);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);
      const res = await api.get(`/audit/logs?${params.toString()}`);
      const payload = res.data || {};
      if (Array.isArray(payload)) {
        setData({ logs: payload, total: payload.length, pages: 1 });
      } else {
        setData({
          logs: Array.isArray(payload.logs) ? payload.logs : [],
          total: Number(payload.total || 0),
          pages: Number(payload.pages || 1),
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, filterUserId, filterAction, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    api.get('/audit/users').then(res => setAuditUsers(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  const clearFilters = () => {
    setFilterUserId(''); setFilterAction(''); setFilterDateFrom(''); setFilterDateTo(''); setPage(1);
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/audit/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) { console.error('Export failed:', e); }
  };

  const logs = data.logs?.filter((l: any) => {
    const q = search?.toLowerCase() || '';
    return `${l.action} ${l.entity} ${l.user?.fullName || ''} ${l.ipAddress || ''}`.toLowerCase().includes(q);
  }) || [];

  return (
    <div className="space-y-6 page-enter min-h-[80vh] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
        <div>
          <h1 className="text-4xl font-black text-[var(--text-primary)] font-display tracking-tight flex items-center gap-3">
            <Terminal size={32} className="text-[var(--primary)]" /> {t('audit.title')}
          </h1>
          <p className="text-sm font-medium text-[var(--text-muted)] mt-2">
            {t('audit.records_found', { count: data.total.toLocaleString() })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(f => !f)}
            className={cn(
              "px-5 py-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all",
              showFilters
                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            )}
          >
            <Filter size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-[var(--primary)] flex items-center justify-center text-[9px] font-black ml-1">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg shadow-[var(--primary)]/20 hover:scale-105 transition-all"
          >
            <Download size={16} /> {t('audit.export_csv', 'Export CSV')}
          </button>
          <div className="flex items-center gap-4 px-6 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <Activity size={16} className="text-[var(--primary)] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--primary)]">Live</span>
          </div>
        </div>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="nx-card p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-1 mb-2"><User size={10} /> User</label>
            <select value={filterUserId} onChange={e => { setFilterUserId(e.target.value); setPage(1); }} className="nx-input text-xs w-full">
              <option value="">All Users</option>
              {auditUsers.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-1 mb-2"><Shield size={10} /> Action Type</label>
            <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }} className="nx-input text-xs w-full">
              <option value="">All Actions</option>
              {ACTION_TYPES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2 block">From Date</label>
            <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }} className="nx-input text-xs w-full" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2 block">To Date</label>
            <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(1); }} className="nx-input text-xs w-full" />
          </div>
          {activeFilterCount > 0 && (
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button onClick={clearFilters} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 hover:text-rose-300 transition-all">
                <X size={12} /> Clear All Filters
              </button>
            </div>
          )}
        </motion.div>
      )}

      <div className="nx-card overflow-hidden flex flex-col flex-grow">
        <div className="p-6 md:p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] flex items-center gap-2">
            <Shield size={14} className="text-[var(--text-muted)]" /> {t('audit.all_events')}
          </h2>
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50" />
            <input
              type="text"
              className="nx-input nx-input-l py-3 text-xs w-full bg-[var(--bg-input)] border-[var(--border-subtle)] font-bold focus:border-[var(--primary)] transition-all"
              placeholder={t('audit.search_placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={32} className="animate-spin text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/70">{t('audit.loading')}</p>
          </div>
        ) : (
          <>
            <div className="nx-table-container">
              <table className="nx-table">
                <thead>
                  <tr>
                    {['Timestamp', 'User', 'Action', 'Target Entity', 'Details', 'IP Address'].map(h => (
                      <th key={h} className="px-6 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {logs.map((log: any, idx: number) => (
                    <motion.tr
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                      key={log.id}
                      className="hover:bg-[var(--bg-elevated)] transition-colors font-mono text-[11px]"
                    >
                      <td className="px-6 py-4 text-[var(--text-secondary)] whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{format(new Date(log.createdAt), 'dd MMM yyyy')}</span>
                          <span className="text-[9px] text-[var(--text-muted)] tracking-wider">{format(new Date(log.createdAt), 'HH:mm:ss')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.user ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-300">{log.user.fullName}</span>
                            <span className="text-[9px] text-slate-600 tracking-wider">{log.user.email}</span>
                          </div>
                        ) : <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">SYSTEM</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn("px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border", actionColor[log.action] || 'text-slate-400 bg-white/5 border-white/10')}>
                          {log.action?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--primary)] font-bold tracking-wider">{log.entity}</td>
                      <td className="px-6 py-4 max-w-[250px] truncate">
                        {log.details && (
                          <span className="text-slate-400 bg-black/60 px-2.5 py-1.5 rounded border border-white/5 whitespace-nowrap">
                            {typeof log.details === 'object' ? JSON.stringify(log.details).slice(0, 60) + '...' : String(log.details).slice(0, 60)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 tracking-widest">[{log.ipAddress || '0.0.0.0'}]</td>
                    </motion.tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-20 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/40 border-none">{t('audit.no_logs')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {data.pages > 1 && (
              <div className="px-8 py-5 border-t border-white/[0.05] bg-black/40 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60">
                  {t('audit.page_info', { page, pages: data.pages })}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-10 h-10 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 disabled:opacity-30 flex items-center justify-center text-emerald-400 transition-all">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
                    className="w-10 h-10 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 disabled:opacity-30 flex items-center justify-center text-emerald-400 transition-all">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
