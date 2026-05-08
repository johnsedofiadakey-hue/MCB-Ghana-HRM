import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import { 
  Plus, CheckCircle, XCircle, Clock, 
  ShieldCheck, Umbrella, HeartPulse, Baby, 
  UserMinus, HelpingHand, Users, Send,
  ChevronRight, Printer, Trash2, Calendar, X,
  AlertTriangle, Zap
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRoleRankValue } from '../utils/session';
import { format } from 'date-fns';
import { useAI } from '../context/AIContext';

const statusConfig: Record<string, { label: string; badge: string; icon: React.ElementType; color: string }> = {
  SUBMITTED: { label: 'leave.status.SUBMITTED', badge: 'bg-[var(--warning)]/5 text-[var(--warning)] border-[var(--warning)]/10', icon: Clock, color: 'text-[var(--warning)]' },
  PENDING_RELIEVER: { label: 'leave.status.PENDING_RELIEVER', badge: 'bg-[var(--warning)]/5 text-[var(--warning)] border-[var(--warning)]/10', icon: Clock, color: 'text-[var(--warning)]' },
  RELIEVER_ACCEPTED: { label: 'leave.status.RELIEVER_ACCEPTED', badge: 'bg-[var(--info)]/5 text-[var(--info)] border-[var(--info)]/10', icon: CheckCircle, color: 'text-[var(--info)]' },
  RELIEVER_DECLINED: { label: 'leave.status.RELIEVER_DECLINED', badge: 'bg-[var(--error)]/5 text-[var(--error)] border-[var(--error)]/10', icon: XCircle, color: 'text-[var(--error)]' },
  MANAGER_REVIEW: { label: 'leave.status.MANAGER_REVIEW', badge: 'bg-[var(--primary)]/5 text-[var(--primary)] border-[var(--primary)]/10', icon: Clock, color: 'text-[var(--primary)]' },
  MANAGER_APPROVED: { label: 'leave.status.MANAGER_APPROVED', badge: 'bg-[var(--info)]/5 text-[var(--info)] border-[var(--info)]/10', icon: CheckCircle, color: 'text-[var(--info)]' },
  MANAGER_REJECTED: { label: 'leave.status.MANAGER_REJECTED', badge: 'bg-[var(--error)]/5 text-[var(--error)] border-[var(--error)]/10', icon: XCircle, color: 'text-[var(--error)]' },
  HR_REVIEW: { label: 'leave.status.HR_REVIEW', badge: 'bg-[var(--primary)]/5 text-[var(--primary)] border-[var(--primary)]/10', icon: ShieldCheck, color: 'text-[var(--primary)]' },
  HR_REJECTED: { label: 'leave.status.HR_REJECTED', badge: 'bg-[var(--error)]/5 text-[var(--error)] border-[var(--error)]/10', icon: XCircle, color: 'text-[var(--error)]' },
  MD_REVIEW: { label: 'leave.status.MD_REVIEW', badge: 'bg-[var(--primary)]/5 text-[var(--primary)] border-[var(--primary)]/10', icon: ShieldCheck, color: 'text-[var(--primary)]' },
  APPROVED: { label: 'leave.status.APPROVED', badge: 'bg-[var(--success)]/5 text-[var(--success)] border-[var(--success)]/10', icon: CheckCircle, color: 'text-[var(--success)]' },
  MD_REJECTED: { label: 'leave.status.MD_REJECTED', badge: 'bg-[var(--error)]/5 text-[var(--error)] border-[var(--error)]/10', icon: XCircle, color: 'text-[var(--error)]' },
  CANCELLED: { label: 'leave.status.CANCELLED', badge: 'bg-[var(--text-muted)]/5 text-[var(--text-muted)] border-[var(--border-subtle)]/10', icon: XCircle, color: 'text-[var(--text-muted)]' },
};

const leaveTypeIcons: Record<string, React.ElementType> = {
  Annual: Umbrella,
  Paid: Umbrella,
  Sick: HeartPulse,
  Maternity: Baby,
  Paternity: Baby,
  Compassionate: HelpingHand,
  Unpaid: UserMinus,
};

const Leave = () => {
  const { t, i18n: i18n_fe } = useTranslation();
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [reliefRequests, setReliefRequests] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>({ leaveBalance: 0, leaveAllowance: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // 📋 Modal Scroll Lock: Tier 3 Nuclear Implementation
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.classList.add('modal-lock');
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.classList.remove('modal-lock');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.classList.remove('modal-lock');
    };
  }, [showModal]);

  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '', relieverId: '', leaveType: 'Annual', handoverNotes: '', relieverAcceptanceRequired: false });
  const [relieverSearch, setRelieverSearch] = useState('');
  const [showRelieverOptions, setShowRelieverOptions] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'MY' | 'TEAM' | 'RELIEF' | 'HISTORY' | 'REGISTER' | 'ADMIN'>('MY');
  const [teamLeaves, setTeamLeaves] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [handoverHistory, setHandoverHistory] = useState<any[]>([]);
  const { setContextData } = useAI();

  const user = getStoredUser();
  // BUG L2 FIX: Use getRoleRankValue to prevent stale rank issues
  const userRank = getRoleRankValue(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('/leave/my'),
        api.get('/leave/balance'),
        api.get('/leave/my-relief-requests'),
        api.get('/leave/handover/history', { _noRedirect: true } as any),
        api.get('/holidays', { _noRedirect: true } as any),
      ]);

      // Map results to variables, providing fallbacks for failed requests
      const [leavesRes, balanceRes, reliefRes, historyRes, holidaysRes] = results.map(r => 
        r.status === 'fulfilled' ? r.value : { data: null }
      );

      // Extract and set data with robust validation
      const leavesData = leavesRes.data?.leaves || leavesRes.data || [];
      setLeaves(Array.isArray(leavesData) ? leavesData : []);
      
      setBalance(balanceRes.data || { leaveBalance: 0, leaveAllowance: 0 });
      setReliefRequests(Array.isArray(reliefRes.data) ? reliefRes.data : []);
      setHandoverHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      setHolidays(Array.isArray(holidaysRes.data) ? holidaysRes.data : []);

      // Log errors for failed background requests for diagnostics
      results.forEach((r, idx) => {
        if (r.status === 'rejected') {
          const endpoints = ['/leave/my', '/leave/balance', '/leave/my-relief-requests', '/leave/handover/history', '/holidays'];
          console.warn(`[Leave API Warning] Partial failure at ${endpoints[idx]}:`, r.reason);
        }
      });

      // BUG L4 FIX: Ensure rank thresholds are standardized (Rank 60+ for Team Hub)
      if (userRank >= 60) {
        const pendingRes = await api.get('/leave/pending');
        setTeamLeaves(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      }

      if (userRank >= 75) {
        const allRes = await api.get('/leave/all');
        setAllLeaves(Array.isArray(allRes.data?.leaves) ? allRes.data.leaves : Array.isArray(allRes.data) ? allRes.data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userRank]);

  const fetchEmployees = useCallback(async () => {
    try {
      if (userRank >= 80) {
        // Admins need exhaustive list for balance adjustments
        const res = await api.get('/users');
        setEmployees(Array.isArray(res.data) ? res.data : []);
      } else {
        const res = await api.get('/leave/eligible-relievers');
        setEmployees(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e) { 
      try {
        const fallback = await api.get('/users');
        setEmployees(fallback.data.filter((e: any) => e.id !== user.id));
      } catch {}
    }
  }, [user.id, userRank]);

  useEffect(() => { fetchData(); fetchEmployees(); }, [fetchData, fetchEmployees]);

  useEffect(() => {
    setContextData({ leaves, teamLeaves, allLeaves, balance });
    return () => setContextData(null);
  }, [leaves, teamLeaves, allLeaves, balance, setContextData]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/leave/apply', form);
      const { warning } = res.data;
      
      setShowModal(false); 
      setForm({ startDate: '', endDate: '', reason: '', relieverId: '', leaveType: 'Annual', handoverNotes: '', relieverAcceptanceRequired: false });
      fetchData();
      
      if (warning) {
        toast.info(warning);
      } else {
        toast.success(t('leave.alerts.initiate_success'));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('leave.alerts.initiate_error'));
    } finally { setSaving(false); }
  };

  useEffect(() => {
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        let count = 0;
        const cur = new Date(start);
        const holidayDates = new Set(holidays.map(h => new Date(h.date).toISOString().split('T')[0]));
        
        while (cur <= end) {
          const day = cur.getDay();
          const dateStr = cur.toISOString().split('T')[0];
          const isWeekend = (day === 0 || day === 6);
          const isHoliday = holidayDates.has(dateStr);
          
          if (!isWeekend && !isHoliday) count++;
          cur.setDate(cur.getDate() + 1);
        }
        setCalculatedDays(Math.max(1, count));
      } else {
        setCalculatedDays(null);
      }
    } else {
      setCalculatedDays(null);
    }
  }, [form.startDate, form.endDate, holidays]);

  const filteredEmployees = employees.filter(e => 
    e.id !== user.id && 
    (e.fullName?.toLowerCase().includes(relieverSearch.toLowerCase()) || 
     e.jobTitle?.toLowerCase().includes(relieverSearch.toLowerCase()))
  );

  const handleDeleteLeave = async (id: string) => {
    if (!window.confirm(t('leave.alerts.delete_confirm'))) return;
    try {
      setSaving(true);
      await api.delete(`/leave/request/${id}`);
      toast.success(t('leave.alerts.delete_success'));
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('leave.alerts.delete_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHandover = async (id: string) => {
    if (!window.confirm(t('leave.alerts.handover_delete_confirm'))) return;
    try {
      setSaving(true);
      await api.delete(`/leave/handover/${id}`);
      toast.success(t('leave.alerts.handover_delete_success'));
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('leave.alerts.delete_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleRelieverResponse = async (leaveId: string, approve: boolean) => {
    let comment = approve ? t('leave.protocol_accepted') : '';
    if (!approve) {
      const reason = window.prompt(t('leave.provide_rejection_reason', 'Please provide a reason for declining this request:'));
      if (!reason || reason.trim().length < 3) {
        toast.error(t('leave.reason_required', 'A valid reason (min 3 chars) is required to reject.'));
        return;
      }
      comment = reason;
    }

    try {
      await api.post('/leave/process', {
        id: leaveId,
        action: approve ? 'APPROVE' : 'REJECT',
        role: 'RELIEVER',
        comment
      });
      toast.success(approve ? t('leave.alerts.handover_accepted') : t('leave.alerts.handover_declined'));
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('leave.alerts.sync_failure'));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.delete(`/leave/${id}/cancel`);
      fetchData();
      toast.success(t('leave.alerts.revoke_success'));
    } catch (err: any) {
      toast.info(String(err?.response?.data?.error || t('leave.alerts.revoke_error')));
    }
  };

  const handleReviewAction = async (leaveId: string, approve: boolean) => {
    let role = 'MANAGER';
    if (userRank >= 90) role = 'MD';
    else if (userRank >= 85) role = 'HR';
    
    let comment = approve ? t('leave.system_verification', { role }) : '';

    if (!approve) {
      const reason = window.prompt(t('leave.provide_rejection_reason', 'Please provide a reason for rejection:'));
      if (!reason || reason.trim().length < 3) {
        toast.error(t('leave.reason_required', 'A valid reason (min 3 chars) is required to reject.'));
        return;
      }
      comment = reason;
    }

    try {
      await api.post('/leave/process', {
        id: leaveId,
        action: approve ? 'APPROVE' : 'REJECT',
        role,
        comment
      });
      toast.success(t('leave.alerts.matrix_success'));
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('leave.alerts.process_failure'));
    }
  };

  const handleDownloadPDF = async (id: string, name: string) => {
    try {
      const res = await api.get(`/export/leave/${id}/pdf?lang=${i18n_fe.language}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Leave_Request_${name.replace(/\s+/g, '_')}_${id.slice(0, 5)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(t('performance.telemetry_failure', 'Failed to generate PDF document.'));
    }
  };

  return (
    <div className="space-y-12 pb-32">
       <AnimatePresence>
        {saving && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 rounded-[2rem] border-4 border-white/10 border-t-white animate-spin mx-auto" />
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-widest">{t('common.processing')}</h3>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{t('leave.alerts.encrypting_session')}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{t('leave.title')}</h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <Umbrella size={18} className="text-[var(--primary)] opacity-60" />
            {t('leave.subtitle')}
          </p>
        </motion.div>

        <div className="flex items-center gap-4">
          <div className="flex bg-[var(--bg-elevated)]/50 p-1 rounded-2xl border border-[var(--border-subtle)] overflow-x-auto no-scrollbar max-w-full">
             <button onClick={() => setActiveTab('MY')} className={cn("px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeTab === 'MY' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>{t('leave.my_cycle')}</button>
             {userRank >= 60 && (
               <button onClick={() => setActiveTab('TEAM')} className={cn("px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap", activeTab === 'TEAM' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                 {t('leave.team_hub')}
                 {teamLeaves.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--error)] rounded-full flex items-center justify-center text-[8px] text-white animate-pulse font-black">{teamLeaves.length}</span>}
               </button>
             )}
              <button onClick={() => setActiveTab('RELIEF')} className={cn("px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap", activeTab === 'RELIEF' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
               {t('leave.handover')}
               {reliefRequests.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--warning)] rounded-full flex items-center justify-center text-[8px] text-black animate-pulse font-black">{reliefRequests.length}</span>}
              </button>
              <button onClick={() => setActiveTab('HISTORY')} className={cn("px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap", activeTab === 'HISTORY' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
               {t('leave.handover_history')}
              </button>
              {userRank >= 75 && (
                  <button onClick={() => setActiveTab('REGISTER')} className={cn("px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeTab === 'REGISTER' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                    {t('leave.register')}
                  </button>
              )}
               {userRank >= 80 && (
                  <button onClick={() => setActiveTab('ADMIN')} className={cn("px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeTab === 'ADMIN' ? "bg-[var(--warning)]/10 text-[var(--warning)] shadow-sm border border-[var(--warning)]/20" : "text-[var(--text-muted)]")}>
                    {t('leave.admin_controls', 'Company Controls')}
                  </button>
              )}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="px-8 h-[52px] rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 flex items-center gap-3"
            onClick={() => setShowModal(true)}
          >
            <Plus size={18} /> {t('leave.initiate_vector')}
          </motion.button>
        </div>
      </div>

       {/* Balance Matrix */}
       <div className="space-y-8">
         {Number(balance.leaveBalance) < 0 && (
           <motion.div 
             initial={{ opacity: 0, y: -20 }} 
             animate={{ opacity: 1, y: 0 }}
             className="nx-card p-6 bg-[var(--error)]/5 border border-[var(--error)]/20 flex flex-col md:flex-row items-center justify-between gap-6"
           >
             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl bg-[var(--error)]/10 flex items-center justify-center text-[var(--error)] shrink-0">
                 <AlertTriangle size={28} className="animate-pulse" />
               </div>
               <div className="space-y-1">
                 <h4 className="text-[14px] font-black uppercase tracking-tight text-[var(--error)]">{t('leave.debt_alert_title', 'Negative Balance / Leave Debt Detected')}</h4>
                 <p className="text-[11px] font-bold text-[var(--error)]/60 uppercase tracking-widest leading-relaxed">
                   {t('leave.debt_alert_desc', 'You are currently drawing from future leave years. ')}
                   {Math.abs(Number(balance.leaveBalance)) >= (balance.leaveAllowance || 24) * 2 
                     ? t('leave.debt_severe', 'You have no leave availability for the next 2+ years.')
                     : t('leave.debt_recovery', { years: (Math.abs(Number(balance.leaveBalance)) / (balance.leaveAllowance || 24)).toFixed(1) })}
                 </p>
               </div>
             </div>
             <button 
               onClick={() => navigate('/settings?tab=policies')}
               className="px-6 h-11 rounded-xl bg-[var(--error)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--error)]/20 hover:scale-105 active:scale-95 transition-all"
             >
               View Leave Policy
             </button>
           </motion.div>
         )}

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {userRank >= 95 && (
               <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    className="nx-card p-8 bg-gradient-to-br from-indigo-600 to-indigo-900 border-indigo-500/30 text-white col-span-1 flex flex-col justify-between relative overflow-hidden group shadow-2xl shadow-indigo-500/20"
               >
                 <ShieldCheck className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-125 transition-transform duration-1000" size={200} />
                 <div className="relative z-10 space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                       <Zap size={20} />
                    </div>
                    <div>
                       <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Oversight Pulse</h4>
                       <p className="text-xl font-black tracking-tight mt-1">Institutional Governance</p>
                    </div>
                 </div>
                 <div className="relative z-10 mt-8 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Senior Queue</p>
                    <p className="text-3xl font-black tracking-tighter">
                       {teamLeaves.filter(l => (getRoleRank(l.employee?.role) >= 85)).length} <span className="text-sm opacity-60 italic">Critical</span>
                    </p>
                 </div>
               </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                 className={cn("nx-card p-6 sm:p-10 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] relative overflow-hidden group shadow-xl", userRank >= 95 ? "lg:col-span-1" : "md:col-span-1")}
            >
             <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[var(--primary)]/5 blur-[50px] group-hover:scale-125 transition-transform" />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-60">{t('leave.resource_balance')}</p>
            {userRank >= 80 && (
              <button 
                onClick={() => navigate('/settings?tab=leave')}
                className="p-2 rounded-lg bg-[var(--primary)]/5 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all border border-[var(--primary)]/10"
                title={t('settings.manage_policy', 'Manage Policy')}
              >
                <Plus size={14} className="rotate-45" /> 
              </button>
            )}
          </div>
          <div className="flex items-end gap-3 mb-6">
            <h2 className="text-6xl font-black text-[var(--text-primary)] tracking-tighter">{Number(balance.leaveBalance || 0).toFixed(1)}</h2>

            <span className="text-lg font-black text-[var(--text-muted)] mb-2 uppercase italic tracking-widest opacity-40">{t('leave.days')}</span>
          </div>
          <div className="h-6 w-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-1 overflow-hidden shadow-inner">
            <motion.div
               initial={{ width:0 }} animate={{ width: `${(balance.leaveBalance / (balance.leaveAllowance || 24)) * 100}%` }}
               className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-xl shadow-[0_0_15px_var(--primary)]"
            />
          </div>
          <p className="mt-6 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{t('leave.allocation_tier', { days: balance.leaveAllowance || 24 })}</p>
        </motion.div>

        {reliefRequests.length > 0 && activeTab !== 'RELIEF' && (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className={cn("nx-card p-6 sm:p-10 bg-gradient-to-br from-[var(--accent)]/5 to-[var(--accent)]/10 border-[var(--accent)]/20 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden shadow-xl", userRank >= 95 ? "lg:col-span-2" : "md:col-span-2")}
           >
              <Users className="text-[var(--accent)] opacity-20 absolute -bottom-10 -right-10" size={160} />
              <div className="w-16 h-16 rounded-[2rem] bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shadow-xl">
                 <Send size={24} />
              </div>
              <div className="space-y-2 relative z-10">
                 <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tighter">{t('leave.handover_protocol_detected')}</h3>
                 <p className="text-[11px] font-medium text-[var(--text-secondary)] opacity-80 uppercase tracking-widest">{t('leave.pending_relief_count', { count: reliefRequests.length })}</p>
              </div>
              <button onClick={() => setActiveTab('RELIEF')} className="px-10 h-14 rounded-2xl bg-[var(--accent)] text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-[rgba(var(--accent-rgb),0.3)] hover:scale-[1.03] transition-all relative z-10">{t('leave.verify_requests')}</button>
           </motion.div>
        )}
      </div>
      </div>

      {/* Main Registry Matrix */}
      <AnimatePresence mode="wait">
        {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-40 flex flex-col items-center gap-6">
               <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">{t('leave.syncing_vectors')}</p>
            </motion.div>
        ) : (
          <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] flex items-center gap-4">
                    {activeTab === 'MY' ? t('leave.vector_registry') : activeTab === 'TEAM' ? t('leave.team_coordination') : activeTab === 'REGISTER' ? t('leave.organization_register') : activeTab === 'HISTORY' ? t('leave.handover_history_register') : t('leave.handover_feed')}
                    <div className="h-[2px] w-20 bg-[var(--primary)]/20" />
                </h3>
            </div>

            <div className="nx-card border-[var(--border-subtle)] overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    {activeTab === 'MY' ? (
                       <table className="nexus-responsive-table w-full">
                         <thead>
                           <tr className="bg-[var(--bg-elevated)]/10">
                             <th className="px-10 py-6">{t('leave.leave_vector')}</th>
                             <th className="py-6">{t('leave.span_timeline')}</th>
                             <th className="py-6">{t('leave.relief_node')}</th>
                             <th className="py-6">{t('leave.system_status')}</th>
                             <th className="px-10 py-6 text-right">{t('common.actions')}</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-[var(--border-subtle)]/30">
                            {leaves.map((leave, i) => {
                               const cfg = statusConfig[leave.status] || { label: leave.status, badge: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]', icon: Clock, color: 'text-[var(--text-muted)]' };
                               const Icon = cfg.icon;
                               return (
                                 <motion.tr key={leave.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                                    <td className="px-10 py-6" data-label={t('leave.leave_vector')}>
                                       <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)] shadow-sm">
                                             {React.createElement(leaveTypeIcons[leave.leaveType] || Umbrella, { size: 18 })}
                                          </div>
                                          <span className="text-[13px] font-black text-[var(--text-primary)] uppercase tracking-tight">{t(`leave.types.${leave.leaveType}`)} {t('leave.rest')}</span>
                                       </div>
                                    </td>
                                    <td className="py-6 text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)]" data-label={t('leave.span_timeline')}>
                                       <span className="underline decoration-[var(--primary)]/30 underline-offset-4">{format(new Date(leave.startDate), 'dd MMM')}</span>
                                       <ChevronRight size={12} className="inline mx-2 opacity-30" />
                                       <span className="underline decoration-[var(--primary)]/30 underline-offset-4">{format(new Date(leave.endDate), 'dd MMM yyyy')}</span>
                                    </td>
                                     <td className="py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic" data-label={t('leave.relief_node')}>{leave.reliever?.fullName || t('leave.direct_exec')}</td>
                                     <td className="py-6" data-label={t('leave.system_status')}>
                                        <div className="flex flex-col gap-2">
                                          <span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-2 w-fit", cfg.badge)}>
                                             <Icon size={12} className={cfg.color} /> {t(cfg.label)}
                                          </span>
                                          {(leave.status === 'MANAGER_REJECTED' || leave.status === 'MD_REJECTED' || leave.status === 'RELIEVER_DECLINED') && (
                                            <div className="flex items-center gap-2 text-[9px] font-bold text-[var(--error)] bg-[var(--error)]/5 px-3 py-1.5 rounded-lg border border-[var(--error)]/10 w-fit">
                                              <XCircle size={10} />
                                              <span className="opacity-90">{leave.managerComment || leave.hrComment || leave.relieverComment || t('leave.no_reason_provided')}</span>
                                            </div>
                                          )}
                                        </div>
                                     </td>
                                    <td className="px-10 py-6 text-right" data-label={t('common.actions')}>
                                       <div className="flex items-center justify-end gap-3">
                                           <button 
                                             onClick={() => leave.status === 'APPROVED' ? handleDownloadPDF(leave.id, user.name || 'Employee') : null}
                                             className={cn(
                                               "p-2 rounded-lg transition-all border",
                                               leave.status === 'APPROVED' 
                                                 ? "bg-[var(--primary)]/5 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white border-[var(--primary)]/10" 
                                                 : "bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] border-[var(--border-subtle)] cursor-not-allowed opacity-50"
                                             )}
                                             title={leave.status === 'APPROVED' ? t('leave.print_pdf') : t('leave.pending_signoff')}
                                           >
                                             <Printer size={14} />
                                           </button>
                                         {(leave.status === 'SUBMITTED' || leave.status === 'PENDING_RELIEVER') && (
                                             <button onClick={() => handleCancel(leave.id)} className="text-[10px] font-black text-[var(--error)] uppercase tracking-widest hover:underline decoration-[var(--error)]/30 underline-offset-8">{t('leave.decommission_btn')}</button>
                                         )}
                                         {userRank >= 90 && (
                                           <button 
                                             onClick={() => handleDeleteLeave(leave.id)}
                                             className="p-2 rounded-lg bg-[var(--error)]/5 text-[var(--error)] hover:bg-[var(--error)] hover:text-white transition-all border border-[var(--error)]/10"
                                             title={t('leave.administrative_delete', 'Delete Record')}
                                           >
                                             <Trash2 size={14} />
                                           </button>
                                         )}
                                       </div>
                                     </td>
                                 </motion.tr>
                               );
                            })}
                             {leaves.length === 0 && (
                                <tr><td colSpan={5} className="py-32 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30">{t('leave.no_vectors')}</td></tr>
                             )}
                         </tbody>
                       </table>
                    ) : activeTab === 'TEAM' ? (
                       <table className="nexus-responsive-table w-full">
                          <thead>
                            <tr className="bg-[var(--bg-elevated)]/10">
                             <th className="px-10 py-6">{t('leave.personnel_node')}</th>
                             <th className="py-6">{t('leave.force_dimension')}</th>
                             <th className="py-6">{t('leave.handover_partner', 'Handover Partner')}</th>
                             <th className="py-6">{t('leave.current_vector')}</th>
                             <th className="px-10 py-6 text-right">{t('leave.verifications')}</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-[var(--border-subtle)]/30">
                            {teamLeaves.map((leave, i) => (
                               <motion.tr key={leave.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="group border-b border-[var(--border-subtle)]/30 hover:bg-[var(--bg-elevated)]/30 transition-all">
                                  <td className="px-10 py-6" data-label={t('leave.personnel_node')}>
                                     <div>
                                        <p className="text-[13px] font-black text-[var(--text-primary)] uppercase">{leave.employee?.fullName}</p>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest line-clamp-1 italic">{leave.reason}</p>
                                     </div>
                                  </td>
                                  <td className="py-6" data-label={t('leave.force_dimension')}><span className="text-[13px] font-black text-[var(--primary)] uppercase italic tracking-tighter">{t('leave.rotation_days', { days: leave.leaveDays })}</span></td>
                                  <td className="py-6" data-label={t('leave.handover_partner', 'Handover Partner')}>
                                      {leave.reliever ? (
                                        <div className="flex flex-col">
                                          <p className="text-[11px] font-black text-[var(--text-primary)] uppercase">{leave.reliever.fullName}</p>
                                          <span className={cn(
                                            "text-[7px] font-black uppercase tracking-widest mt-1",
                                            leave.relieverStatus === 'ACCEPTED' ? "text-[var(--success)]" : "text-[var(--warning)]"
                                          )}>
                                            {leave.relieverStatus === 'ACCEPTED' ? t('leave.protocol_signed') : t('leave.pending_signature')}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-40 uppercase">{t('leave.none_assigned')}</span>
                                      )}
                                   </td>
                                  <td className="py-6" data-label={t('leave.current_vector')}>
                                     <div className="flex flex-col gap-1.5 md:items-start items-end">
                                        <span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border w-fit shadow-sm", (statusConfig[leave.status] || {}).badge)}>
                                           {t(statusConfig[leave.status]?.label || leave.status)}
                                         </span>
                                         <span className="text-[7px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] ml-2 opacity-50">{t('leave.stage_label')}: {(leave.status === 'MD_REVIEW' || leave.status === 'HR_REVIEW') ? t('leave.stage_final_md', 'MD Approval') : t('leave.stage_initial_manager', 'Direct Manager Review')}</span>
                                      </div>
                                  </td>
                                  <td className="px-10 py-6 text-right" data-label={t('leave.verifications')}>
                                     <div className="flex justify-end gap-4">
                                        <button 
                                           onClick={() => leave.status === 'APPROVED' ? handleDownloadPDF(leave.id, leave.employee?.fullName || 'Employee') : null}
                                           className={cn(
                                             "w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90 border",
                                             leave.status === 'APPROVED'
                                               ? "bg-[var(--primary)]/5 text-[var(--primary)] border-[var(--primary)]/10 hover:bg-[var(--primary)] hover:text-white"
                                               : "bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] border-[var(--border-subtle)] cursor-not-allowed opacity-50"
                                           )}
                                           title={leave.status === 'APPROVED' ? t('leave.print_pdf') : t('leave.not_validated')}
                                        >
                                           <Printer size={18} />
                                        </button>
                                         {((userRank >= 90 && ['MD_REVIEW', 'HR_REVIEW', 'MANAGER_REVIEW', 'RELIEVER_ACCEPTED', 'SUBMITTED'].includes(leave.status)) || 
                                            (userRank >= 85 && ['HR_REVIEW', 'MANAGER_REVIEW', 'RELIEVER_ACCEPTED', 'SUBMITTED'].includes(leave.status)) ||
                                            (userRank >= 60 && ['MANAGER_REVIEW', 'RELIEVER_ACCEPTED', 'SUBMITTED'].includes(leave.status))) && 
                                            !(leave.relieverAcceptanceRequired && leave.status === 'SUBMITTED') ? (
                                            <>
                                              <button onClick={() => handleReviewAction(leave.id, true)} className="w-11 h-11 rounded-xl bg-[var(--success)]/5 text-[var(--success)] border border-[var(--success)]/10 flex items-center justify-center hover:bg-[var(--success)] hover:text-white transition-all shadow-lg active:scale-90" title={t('common.approve')}><CheckCircle size={18} /></button>
                                              <button onClick={() => handleReviewAction(leave.id, false)} className="w-11 h-11 rounded-xl bg-[var(--error)]/5 text-[var(--error)] border border-[var(--error)]/10 flex items-center justify-center hover:bg-[var(--error)] hover:text-white transition-all shadow-lg active:scale-90" title={t('common.reject')}><XCircle size={18} /></button>
                                            </>
                                          ) : (
                                            <div className="px-5 py-2.5 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/30 flex items-center gap-2">
                                               <Clock size={12} className="text-[var(--text-muted)] animate-pulse" /> 
                                               <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">
                                                  {leave.status === 'SUBMITTED' ? t('leave.awaiting_handover') : 
                                                   leave.status === 'MANAGER_REVIEW' ? t('leave.status.MANAGER_REVIEW') :
                                                   leave.status === 'HR_REVIEW' ? t('leave.status.HR_REVIEW') :
                                                   leave.status === 'MD_REVIEW' ? t('leave.status.MD_REVIEW') :
                                                   t('leave.final_review')}
                                               </span>
                                            </div>
                                          )}
                                         {userRank >= 90 && (
                                           <button 
                                             onClick={() => handleDeleteLeave(leave.id)}
                                             className="p-2 rounded-lg bg-[var(--error)]/5 text-[var(--error)] hover:bg-[var(--error)] hover:text-white transition-all border border-[var(--error)]/10 ml-2"
                                             title={t('leave.administrative_delete', 'Delete Record')}
                                           >
                                             <Trash2 size={14} />
                                           </button>
                                         )}
                                     </div>
                                  </td>
                               </motion.tr>
                            ))}
                             {teamLeaves.length === 0 && (
                                <tr><td colSpan={5} className="py-32 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30">{t('leave.no_team_verification')}</td></tr>
                             )}
                         </tbody>
                       </table>
                     ) : activeTab === 'REGISTER' ? (
                        <table className="nexus-responsive-table w-full">
                          <thead>
                            <tr className="bg-[var(--bg-elevated)]/10">
                              <th className="px-10 py-6">{t('leave.personnel')}</th>
                              <th className="py-6">{t('leave.span_timeline')}</th>
                              <th className="py-6">{t('leave.days')}</th>
                              <th className="py-6">{t('leave.type')}</th>
                              <th className="px-10 py-6 text-right">{t('leave.system_status')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)]/30">
                             {allLeaves.map((leave, i) => {
                                const cfg = statusConfig[leave.status] || { label: leave.status, badge: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]', icon: Clock, color: 'text-[var(--text-muted)]' };
                                return (
                                  <motion.tr key={leave.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                                     <td className="px-10 py-6" data-label={t('leave.personnel')}>
                                        <div>
                                           <p className="text-[13px] font-black text-[var(--text-primary)] uppercase">{leave.employee?.fullName}</p>
                                           <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60 italic">{leave.employee?.jobTitle}</p>
                                        </div>
                                     </td>
                                     <td className="py-6 text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)]" data-label={t('leave.span_timeline')}>
                                        {format(new Date(leave.startDate), 'dd MMM')} — {format(new Date(leave.endDate), 'dd MMM yyyy')}
                                     </td>
                                      <td className="py-6 text-[13px] font-black text-[var(--primary)] uppercase italic" data-label={t('leave.days')}>{leave.leaveDays}</td>
                                      <td className="py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest" data-label={t('leave.type')}>{t(`leave.types.${leave.leaveType}`)}</td>
                                      <td className="px-10 py-6 text-right" data-label={t('leave.system_status')}>
                                         <div className="flex items-center justify-end gap-3 ml-auto w-fit">
                                            <button 
                                              onClick={() => leave.status === 'APPROVED' ? handleDownloadPDF(leave.id, leave.employee?.fullName || 'Employee') : null}
                                              className={cn(
                                                "p-2 rounded-lg transition-all border",
                                                leave.status === 'APPROVED'
                                                  ? "bg-[var(--primary)]/5 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white border-[var(--primary)]/10"
                                                  : "bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] border-[var(--border-subtle)] cursor-not-allowed opacity-50"
                                              )}
                                              title={leave.status === 'APPROVED' ? t('leave.print_request') : t('leave.awaiting_md')}
                                            >
                                              <Printer size={14} />
                                            </button>
                                            <span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm flex items-center justify-center gap-2", cfg.badge)}>
                                                {t(cfg.label)}
                                            </span>
                                            {userRank >= 90 && (
                                                <button 
                                                  onClick={() => handleDeleteLeave(leave.id)}
                                                  className="p-2 rounded-lg bg-[var(--error)]/5 text-[var(--error)] hover:bg-[var(--error)] hover:text-white transition-all border border-[var(--error)]/10"
                                                  title={t('leave.administrative_delete')}
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                             )}
                                         </div>
                                      </td>
                                  </motion.tr>
                                );
                             })}
                             {allLeaves.length === 0 && (
                                <tr><td colSpan={5} className="py-32 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30">{t('leave.no_vectors')}</td></tr>
                             )}
                          </tbody>
                        </table>
                      ) : activeTab === 'HISTORY' ? (
                        <table className="nexus-responsive-table w-full">
                          <thead>
                            <tr className="bg-[var(--bg-elevated)]/10">
                              <th className="px-10 py-6">{t('leave.handover_personnel')}</th>
                              <th className="py-6">{t('leave.leave_timeline')}</th>
                              <th className="py-6">{t('leave.accepted_on')}</th>
                              <th className="py-6">{t('leave.handover_status')}</th>
                              <th className="px-10 py-6 text-right">{t('leave.notes')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)]/30 text-left">
                             {handoverHistory.map((rec, i) => (
                               <motion.tr key={rec.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                                  <td className="px-10 py-6" data-label={t('leave.handover_personnel')}>
                                     <div className="flex items-center gap-3">
                                        <div className={cn("w-2 h-2 rounded-full", rec.relieverId === user.id ? "bg-[var(--accent)]" : "bg-[var(--info)]")} />
                                        <div>
                                          <p className="text-[12px] font-black text-[var(--text-primary)] uppercase tracking-tight">
                                            {rec.relieverId === user.id ? t('leave.covering_for', { name: rec.requester?.fullName, defaultValue: `Covering for ${rec.requester?.fullName}` }) : t('leave.covered_by', { name: rec.reliever?.fullName, defaultValue: `${rec.reliever?.fullName} covering for me` })}
                                          </p>
                                          <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{rec.relieverId === user.id ? rec.requester?.jobTitle : rec.reliever?.jobTitle}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="py-6 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]" data-label={t('leave.leave_timeline')}>
                                     {rec.leaveRequest ? `${format(new Date(rec.leaveRequest.startDate), 'dd MMM')} — ${format(new Date(rec.leaveRequest.endDate), 'dd MMM yyyy')}` : '—'}
                                  </td>
                                  <td className="py-6 text-[10px] font-bold text-[var(--text-muted)]" data-label={t('leave.accepted_on')}>
                                     {format(new Date(rec.acceptedAt), 'PPp')}
                                  </td>
                                  <td className="py-6" data-label={t('leave.handover_status')}>
                                     <span className="px-3 py-1 rounded-lg bg-[var(--success)]/5 text-[var(--success)] text-[8px] font-black uppercase tracking-widest border border-[var(--success)]/10 flex items-center gap-2 w-fit">
                                        <CheckCircle size={10} /> {rec.status}
                                     </span>
                                  </td>
                                  <td className="px-10 py-6 text-right" data-label={t('leave.notes')}>
                                     <div className="flex items-center justify-end gap-5">
                                        <button 
                                           className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest hover:underline underline-offset-4"
                                           onClick={() => toast.info(rec.handoverNotes || t('leave.handover_records_none'))}
                                         >
                                           {t('leave.view_protocol')}
                                        </button>
                                        {userRank >= 90 && (
                                           <button 
                                             onClick={() => handleDeleteHandover(rec.id)}
                                             className="p-2 rounded-lg bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/10"
                                             title={t('common.delete', 'Delete Record')}
                                           >
                                             <Trash2 size={14} />
                                           </button>
                                        )}
                                     </div>
                                  </td>
                               </motion.tr>
                             ))}
                             {handoverHistory.length === 0 && (
                                <tr><td colSpan={5} className="py-32 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30">{t('leave.no_handover_records', 'No handover history records found.')}</td></tr>
                             )}
                          </tbody>
                        </table>
                      ) : activeTab === 'ADMIN' ? (
                        <div className="p-10 space-y-10">
                           <div className="max-w-4xl mx-auto space-y-8">
                              <div className="p-8 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 space-y-4">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600 shadow-inner">
                                       <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                       <h4 className="text-xl font-black text-amber-600 uppercase tracking-tight">Company Balance Adjustments</h4>
                                       <p className="text-[10px] font-bold text-amber-600/60 uppercase tracking-widest">Manual adjustments for holiday leave or extra days.</p>
                                    </div>
                                 </div>
                                 <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed opacity-80">
                                    As an administrator, you can manually override any employee's leave balance and annual allowance. This action bypasses standard accrual logic and should only be used for corrections or specific managerial directives.
                                 </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                 <div className="space-y-6">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-2">Select Personnel</label>
                                    <div className="relative">
                                       <input 
                                          type="text" 
                                          className="nx-input pl-12" 
                                          placeholder="Search by name or department..." 
                                          value={relieverSearch}
                                          onChange={e => setRelieverSearch(e.target.value)}
                                       />
                                       <Users size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-40" />
                                    </div>
                                    
                                    <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                       {filteredEmployees.map(emp => (
                                          <button 
                                             key={emp.id}
                                             onClick={() => {
                                                setContextData((prev: any) => ({ ...prev, selectedAdminUser: emp }));
                                                setForm(prev => ({ ...prev, relieverId: emp.id })); // Borrowing relieverId for selection
                                             }}
                                             className={cn(
                                                "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                                                form.relieverId === emp.id ? "bg-[var(--primary)]/5 border-[var(--primary)] shadow-sm" : "bg-[var(--bg-elevated)]/30 border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                                             )}
                                          >
                                             <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-primary)] border border-[var(--border-subtle)]">
                                                <Users size={18} />
                                             </div>
                                             <div>
                                                <p className="text-[12px] font-black uppercase tracking-tight">{emp.fullName}</p>
                                                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{emp.jobTitle}</p>
                                             </div>
                                          </button>
                                       ))}
                                    </div>
                                 </div>

                                 {form.relieverId && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 p-8 rounded-[2rem] bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)]">
                                       <div className="space-y-6">
                                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Adjustment Vector</h4>
                                          
                                          <div className="space-y-4">
                                             <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">New Balance (Days)</label>
                                             <input 
                                                type="number" 
                                                className="nx-input text-2xl font-black" 
                                                placeholder="0.0"
                                                onChange={e => setContextData((prev: any) => ({ ...prev, adminNewBalance: Number(e.target.value) }))}
                                             />
                                          </div>

                                          <div className="space-y-4">
                                             <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">New Annual Allowance</label>
                                             <input 
                                                type="number" 
                                                className="nx-input" 
                                                placeholder="30"
                                                onChange={e => setContextData((prev: any) => ({ ...prev, adminNewAllowance: Number(e.target.value) }))}
                                             />
                                          </div>

                                          <div className="space-y-4">
                                             <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Official Reason for Override</label>
                                             <textarea 
                                                className="nx-input min-h-[100px] py-4" 
                                                placeholder="Adjustment for public holidays, policy exception, etc..."
                                                onChange={e => setContextData((prev: any) => ({ ...prev, adminReason: e.target.value }))}
                                             />
                                          </div>

                                          <button 
                                             onClick={async () => {
                                                const ctx = (window as any).antigravity_context_data || {};
                                                if (!ctx.adminReason) return toast.error("Reason is mandatory for official ledger updates.");
                                                setSaving(true);
                                                try {
                                                   await api.post('/leave/adjust-balance', {
                                                      targetUserId: form.relieverId,
                                                      leaveBalance: ctx.adminNewBalance,
                                                      leaveAllowance: ctx.adminNewAllowance,
                                                      reason: ctx.adminReason
                                                   });
                                                   toast.success("Institutional ledger updated successfully.");
                                                   fetchData();
                                                   setForm(prev => ({ ...prev, relieverId: '' }));
                                                } catch (err: any) {
                                                   toast.error(err?.response?.data?.error || "Ledger update failed.");
                                                } finally { setSaving(false); }
                                             }}
                                             className="w-full h-14 rounded-2xl bg-[var(--primary)] text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-0.98 transition-all"
                                          >
                                             Commit Adjustment
                                          </button>
                                       </div>
                                    </motion.div>
                                 )}
                              </div>
                           </div>
                        </div>
                      ) : null}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Architecture */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 lg:p-10">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-[var(--bg-main)]/90 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className="relative w-full max-w-5xl bg-[var(--bg-card)] rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] border border-[var(--border-subtle)] overflow-hidden flex flex-col md:flex-row h-full max-h-[90vh]"
            >
                {/* Left Panel: Visual Summary */}
                <div className="w-full md:w-[320px] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] p-12 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
                   <Umbrella className="absolute -top-20 -left-20 opacity-10" size={300} />
                   
                   <div className="relative z-10 space-y-6">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl">
                         <Calendar size={32} />
                      </div>
                      <div>
                         <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{t('leave.modal_title')}</h2>
                         <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-4">{t('leave.secure_vector')}</p>
                      </div>
                   </div>

                   <div className="relative z-10 space-y-8">
                      <div className="space-y-2">
                         <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('leave.resource_availability')}</p>
                         <h3 className="text-4xl font-black tracking-tighter">{Number(balance.leaveBalance || 0).toFixed(1)} <span className="text-sm opacity-60">{t('leave.days')}</span></h3>
                      </div>
                      
                      <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                         <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">{t('leave.policy_reminder')}</p>
                         <p className="text-[11px] font-bold leading-relaxed">{t('leave.policy_desc')}</p>
                      </div>
                   </div>
                </div>

                {/* Right Panel: Form Intelligence */}
                <div className="flex-1 p-8 sm:p-14 overflow-y-auto custom-scrollbar relative bg-[var(--bg-card)]">
                   <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 p-3 rounded-full hover:bg-[var(--bg-elevated)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      <X size={24} />
                   </button>

                   <form onSubmit={handleApply} className="space-y-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">{t('leave.type_label')}</label>
                            <select 
                               className="nx-input" 
                               value={form.leaveType}
                               onChange={e => setForm({...form, leaveType: e.target.value})}
                               required
                            >
                               <option value="Annual">{t('leave.types.Annual')}</option>
                               <option value="Sick">{t('leave.types.Sick')}</option>
                               <option value="Maternity">{t('leave.types.Maternity')}</option>
                               <option value="Paternity">{t('leave.types.Paternity')}</option>
                               <option value="Compassionate">{t('leave.types.Compassionate')}</option>
                               <option value="Unpaid">{t('leave.types.Unpaid')}</option>
                            </select>
                         </div>

                         <div className="space-y-4">
                             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">{t('leave.relief_matrix')}</label>
                             <div className="relative">
                                <input 
                                   type="text" 
                                   className="nx-input pl-12" 
                                   placeholder={t('leave.search_personnel')}
                                   value={relieverSearch}
                                   onChange={e => {
                                      setRelieverSearch(e.target.value);
                                      setShowRelieverOptions(true);
                                   }}
                                   onFocus={() => setShowRelieverOptions(true)}
                                />
                                <Users size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-40" />
                                
                                <AnimatePresence>
                                   {showRelieverOptions && relieverSearch.length > 0 && (
                                      <motion.div 
                                         initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                         className="absolute left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl z-[100] max-h-[240px] overflow-y-auto custom-scrollbar p-2"
                                      >
                                         {filteredEmployees.map(emp => (
                                            <button 
                                               key={emp.id} type="button"
                                               onClick={() => {
                                                  setForm({...form, relieverId: emp.id});
                                                  setRelieverSearch(emp.fullName);
                                                  setShowRelieverOptions(false);
                                               }}
                                               className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--bg-elevated)] transition-all text-left"
                                            >
                                               <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-primary)] border border-[var(--border-subtle)]">
                                                  <Users size={18} />
                                               </div>
                                               <div>
                                                  <p className="text-[12px] font-black uppercase tracking-tight">{emp.fullName}</p>
                                                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest italic">{emp.jobTitle}</p>
                                               </div>
                                            </button>
                                         ))}
                                         {filteredEmployees.length === 0 && (
                                            <div className="p-8 text-center text-[10px] font-black uppercase text-[var(--text-muted)] opacity-40">{t('leave.no_nodes_found')}</div>
                                         )}
                                      </motion.div>
                                   )}
                                </AnimatePresence>
                             </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">{t('leave.start_point')}</label>
                            <input 
                               type="date" className="nx-input" 
                               value={form.startDate}
                               onChange={e => setForm({...form, startDate: e.target.value})}
                               required
                            />
                         </div>

                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">{t('leave.end_point')}</label>
                            <input 
                               type="date" className="nx-input" 
                               value={form.endDate}
                               onChange={e => setForm({...form, endDate: e.target.value})}
                               required
                            />
                         </div>
                      </div>

                      {calculatedDays !== null && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 rounded-[2rem] bg-[var(--primary)]/5 border border-[var(--primary)]/10 flex items-center justify-between">
                           <div>
                              <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-1">{t('leave.calculated_span')}</p>
                              <h4 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">{calculatedDays} {t('leave.business_days')}</h4>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('leave.estimated_debt')}</p>
                              <h4 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">{(Number(balance.leaveBalance) - calculatedDays).toFixed(1)} <span className="text-xs opacity-50">{t('leave.remaining')}</span></h4>
                           </div>
                        </motion.div>
                      )}

                      <div className="space-y-4">
                         <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">{t('leave.mission_objectives')}</label>
                         <textarea 
                            className="nx-input min-h-[120px] py-6" 
                            placeholder={t('leave.reason_placeholder')}
                            value={form.reason}
                            onChange={e => setForm({...form, reason: e.target.value})}
                            required
                         />
                      </div>

                      {form.relieverId && (
                         <div className="space-y-6 p-8 rounded-[2.5rem] bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] border-dashed">
                            <div className="flex items-center gap-4 mb-4">
                               <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                                  <Send size={18} />
                               </div>
                               <h4 className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">{t('leave.handover_protocol')}</h4>
                            </div>
                            
                            <div className="space-y-4">
                               <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">{t('leave.protocol_notes')}</label>
                               <textarea 
                                  className="nx-input min-h-[100px] py-4" 
                                  placeholder={t('leave.handover_placeholder')}
                                  value={form.handoverNotes}
                                  onChange={e => setForm({...form, handoverNotes: e.target.value})}
                               />
                            </div>

                            <label className="flex items-center gap-4 cursor-pointer group p-2">
                               <div className="relative w-12 h-6 flex items-center">
                                  <input 
                                     type="checkbox" className="sr-only peer" 
                                     checked={form.relieverAcceptanceRequired}
                                     onChange={e => setForm({...form, relieverAcceptanceRequired: e.target.checked})}
                                  />
                                  <div className="w-full h-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-full peer-checked:bg-[var(--primary)] peer-checked:border-[var(--primary)] transition-all" />
                                  <div className="absolute left-1 top-1 w-4 h-4 bg-[var(--text-muted)] peer-checked:bg-white rounded-full transition-all peer-checked:translate-x-6" />
                               </div>
                               <span className="text-[10px] font-black text-[var(--text-muted)] group-hover:text-[var(--text-primary)] uppercase tracking-widest transition-colors">{t('leave.require_reliever_sig')}</span>
                            </label>
                         </div>
                      )}

                      <div className="pt-6">
                         <button 
                            type="submit" 
                            disabled={saving}
                            className="w-full h-18 rounded-[2rem] bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-[var(--primary)]/30 hover:scale-[1.02] active:scale-0.98 transition-all disabled:opacity-50"
                         >
                            {t('leave.initiate_vector_btn')}
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

export default Leave;
