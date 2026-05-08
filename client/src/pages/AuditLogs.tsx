import { useEffect, useState } from 'react';
<<<<<<< HEAD
import { Shield, Search, ChevronLeft, ChevronRight, Loader2, Activity, Terminal, Download } from 'lucide-react';
=======
import { Shield, Search, ChevronLeft, ChevronRight, Loader2, Activity, Terminal } from 'lucide-react';
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
import api from '../services/api';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';

const actionColor: Record<string, string> = {
  LEAVE_APPLIED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  LEAVE_APPROVED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  LEAVE_REJECTED: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  KPI_ASSIGNED: 'text-[var(--primary)] bg-[var(--primary)]/10 border-[var(--primary)]/20',
  KPI_SUBMITTED: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  KPI_REVIEW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  APPRAISAL_SELF_SUBMIT: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  APPRAISAL_MANAGER_REVIEW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  CREATE_ASSET: 'text-slate-400 bg-white/5 border-white/10',
  ASSIGN_ASSET: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const AuditLogs = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<any>({ logs: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/audit/logs?page=${page}&limit=50`);
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
  };

  useEffect(() => { fetchLogs(); }, [page]);

<<<<<<< HEAD
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
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

=======
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
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
        <div className="flex items-center gap-4">
          <button 
<<<<<<< HEAD
             onClick={handleExport}
=======
             onClick={() => window.open(`${api.defaults.baseURL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/audit/export?token=${localStorage.getItem('mcb_token')}`, '_blank')}
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
             className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg shadow-[var(--primary)]/20 hover:scale-105 transition-all"
          >
             <Download size={16} /> {t('audit.export_csv', 'Export CSV')}
          </button>
          <div className="flex items-center gap-4 px-6 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] relative overflow-hidden group">
            <Activity size={16} className="text-[var(--primary)] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--primary)]">Live</span>
          </div>
        </div>
      </div>

      <div className="nx-card overflow-hidden flex flex-col flex-grow">
        <div className="p-6 md:p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] flex items-center gap-2">
             <Shield size={14} className="text-[var(--text-muted)]" /> {t('audit.all_events')}
          </h2>
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50" />
            <input 
               type="text" 
               className="nx-input pl-10 py-3 text-xs w-full bg-[var(--bg-input)] border-[var(--border-subtle)] font-bold focus:border-[var(--primary)] transition-all" 
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
                    {[
                      t('audit.headers.timestamp'),
                      t('audit.headers.user'),
                      t('audit.headers.action'),
                      t('audit.headers.target'),
                      t('audit.headers.details'),
                      t('audit.headers.ip_address')
                    ].map(h => (
                      <th key={h} className="px-6 py-4">
                        {h}
                      </th>
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
                        {new Date(log.createdAt).toLocaleString(undefined, {
                           year: 'numeric', month: '2-digit', day: '2-digit',
                           hour: '2-digit', minute: '2-digit', second: '2-digit',
                           hour12: false
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {log.user ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-300">{log.user.fullName}</span>
                            <span className="text-[9px] text-slate-600 tracking-wider mix-blend-screen">{log.user.email}</span>
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
                            {typeof log.details === 'object' ? JSON.stringify(log.details).slice(0, 50) + '...' : String(log.details).slice(0, 50)}
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
                    className="w-10 h-10 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 disabled:opacity-30 disabled:hover:bg-white/[0.02] flex items-center justify-center text-emerald-400 transition-all">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
                    className="w-10 h-10 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 disabled:opacity-30 disabled:hover:bg-white/[0.02] flex items-center justify-center text-emerald-400 transition-all">
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
