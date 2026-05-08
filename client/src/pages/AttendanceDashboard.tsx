import { useState, useEffect } from 'react';
import { toast } from '../utils/toast';
import { Clock, CheckCircle, LogIn, LogOut, Loader2, Calendar, Search, Activity, History, Download } from 'lucide-react';
import api from '../services/api';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRoleRankValue } from '../utils/session';
import { useTranslation } from 'react-i18next';

const AttendanceDashboard = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [search, setSearch] = useState('');

    const user = getStoredUser();
    const isAdmin = getRoleRankValue(user.role) >= 70;

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'all' && isAdmin ? '/attendance' : '/attendance/me';
            const res = await api.get(endpoint);
            setLogs(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [activeTab]);

    const handleClockAction = async (type: 'in' | 'out') => {
        setActionLoading(true);
        try {
            if (type === 'in') {
                await api.post('/attendance/clock-in');
                toast.success(t('attendance.success_clock_in'));
            } else {
                await api.post('/attendance/clock-out');
                toast.success(t('attendance.success_clock_out'));
            }
            fetchLogs();
        } catch (err: any) {
            toast.error(String(err?.response?.data?.error || t('attendance.error_action')));
        } finally {
            setActionLoading(false);
        }
    };

    const todayLog = logs.find(l =>
        new Date(l.date).toDateString() === new Date().toDateString() && l.employeeId === user.id
    );

    const handleExportCSV = async () => {
        try {
            const res = await api.get('/attendance/csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Attendance_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(t('attendance.error_export', 'Export failed'));
        }
    };

    const hasClockedIn = !!todayLog;
    const hasClockedOut = !!todayLog?.clockOut;

    const filteredLogs = logs.filter(l =>
        l.employee?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        l.status?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-12 pb-32 pb-32">
            {/* Header Architecture */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{t('attendance.title')}</h1>
                    <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
                        <Clock size={18} className="text-[var(--primary)] opacity-60" />
                        {t('attendance.subtitle')}
                    </p>
                </motion.div>

                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <div className="flex bg-[var(--bg-elevated)]/50 p-1.5 rounded-2xl border border-[var(--border-subtle)]">
                            {(['my', 'all'] as const).map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === tab ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}
                                    >
                                    {tab === 'my' ? t('attendance.my_logs') : t('attendance.all_logs')}
                                </button>
                            ))}
                        </div>
                    )}
                    {isAdmin && activeTab === 'all' && (
                        <button onClick={handleExportCSV} className="p-3 rounded-xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--success)] hover:border-[var(--success)]/30 transition-all shadow-sm" title={t('common.export_csv', 'Export CSV Ledger')}>
                            <div className="text-[9px] font-black uppercase flex items-center gap-2"><Download size={14} /> CSV</div>
                        </button>
                    )}
                </div>
            </div>

            {/* Main Action Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 {/* Clock-In Card */}
                 <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-1 nx-card group relative overflow-hidden bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] p-10 flex flex-col justify-between min-h-[400px]"
                 >
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[var(--primary)]/5 blur-[60px] group-hover:scale-150 transition-transform duration-700" />
                    
                    <div className="relative">
                        <div className="w-16 h-16 rounded-[2rem] bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center mb-8 shadow-lg">
                            <Activity className="text-[var(--primary)]" size={28} />
                        </div>
                        <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2">{t('attendance.shift_status')}</h2>
                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em] opacity-60 italic">{t('attendance.operational_status')}: {hasClockedIn ? (hasClockedOut ? t('attendance.completed') : t('attendance.active')) : t('attendance.idle')}</p>
                    </div>

                    <div className="relative space-y-6">
                        {!hasClockedIn ? (
                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                                onClick={() => handleClockAction('in')}
                                disabled={actionLoading}
                                className="w-full h-20 rounded-3xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 flex items-center justify-center gap-4 group/btn"
                            >
                                {actionLoading ? <Loader2 size={24} className="animate-spin" /> : <LogIn size={24} className="group-hover/btn:translate-x-1 transition-transform" />}
                                {t('attendance.initiate_clock_in')}
                            </motion.button>
                        ) : !hasClockedOut ? (
                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                                onClick={() => handleClockAction('out')}
                                disabled={actionLoading}
                                className="w-full h-20 rounded-3xl bg-[var(--error)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--error)]/30 flex items-center justify-center gap-4 group/btn"
                            >
                                {actionLoading ? <Loader2 size={24} className="animate-spin" /> : <LogOut size={24} className="group-hover/btn:translate-x-1 transition-transform" />}
                                {t('attendance.terminate_session')}
                            </motion.button>
                        ) : (
                            <div className="h-20 rounded-3xl bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-inner">
                                <CheckCircle size={20} /> {t('attendance.day_complete')}
                            </div>
                        )}
                        <p className="text-center text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-50">{t('attendance.timestamp_verified')}</p>
                    </div>
                 </motion.div>

                 {/* History Table */}
                 <motion.div 
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2 nx-card border-[var(--border-subtle)] overflow-hidden flex flex-col"
                 >
                    <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                                <History size={20} />
                            </div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Activity Feed</h3>
                        </div>
                        {activeTab === 'all' && (
                            <div className="relative w-full max-w-xs group">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                                <input type="text" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl pl-12 pr-4 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" placeholder={t('attendance.search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto custom-scrollbar flex-1">
                        {loading ? (
                            <div className="py-40 flex justify-center items-center h-64"><Loader2 size={32} className="text-[var(--primary)] animate-spin" /></div>
                        ) : logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 text-[var(--text-muted)] opacity-30">
                                <Calendar size={64} className="mb-6" />
                                <p className="text-[11px] font-black uppercase tracking-[0.3em]">{t('attendance.no_logs')}</p>
                            </div>
                        ) : (
                            <table className="nexus-responsive-table nx-table">
                                <thead>
                                    <tr className="bg-[var(--bg-elevated)]/10">
                                        {activeTab === 'all' && <th className="px-8 py-5">Personnel</th>}
                                        <th className="px-8 py-5">Uplink Date</th>
                                        <th className="py-5">Clock In</th>
                                        <th className="py-5">Clock Out</th>
                                        <th className="px-8 py-5 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]/30">
                                    {(activeTab === 'all' ? filteredLogs : logs).map((log, i) => (
                                        <motion.tr 
                                            key={log.id} 
                                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            className="hover:bg-[var(--bg-elevated)]/30 transition-all group"
                                        >
                                            {activeTab === 'all' && (
                                                <td className="px-8 py-5 font-bold text-[13px] text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors italic" data-label="Personnel">{log.employee?.fullName || '—'}</td>
                                            )}
                                            <td className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)]" data-label="Uplink Date">{new Date(log.date).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                                            <td className="py-5 text-[13px] font-bold text-[var(--success)]" data-label="Clock In">
                                                {log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                                            </td>
                                            <td className="py-5 text-[13px] font-bold text-[var(--error)]" data-label="Clock Out">
                                                {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                                            </td>
                                            <td className="px-8 py-5 text-right" data-label="Status">
                                                <span className={cn("px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm",
                                                    log.status === 'PRESENT' ? "bg-[var(--success)]/5 text-[var(--success)] border-[var(--success)]/10" :
                                                        "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]"
                                                )}>{t(`attendance.status_types.${log.status}`)}</span>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                 </motion.div>
            </div>
        </div>
    );
};

export default AttendanceDashboard;
