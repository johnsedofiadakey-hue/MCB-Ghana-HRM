import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from '../utils/toast';
import { 
  Users, Package, Plus, RotateCcw, Shield, 
  Search, Loader2, AlertTriangle, 
  ShieldCheck, Zap, Activity, Fingerprint,
  Database, Key, Lock, Server, Cpu, ArrowRight, ArrowLeft, UserX,
  Mail, Phone, Linkedin, Github, Globe, QrCode, Save, Download, ExternalLink, Eye, Sparkles
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getStoredUser } from '../utils/session';
import EmployeeIDCard from '../components/it/EmployeeIDCard';

const roleLabel: Record<string, string> = {
  DEV: 'Management', 
  MD: 'Managing Director', 
  DIRECTOR: 'Director',
  IT_ADMIN: 'IT Admin',
  HR_MANAGER: 'HR Manager',
  HR_OFFICER: 'HR Officer', 
  IT_MANAGER: 'IT Manager',
  MANAGER: 'Manager', 
  SUPERVISOR: 'Supervisor', 
  STAFF: 'Staff Member', 
  CASUAL: 'Casual Staff'
};

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-[var(--success)]/5 text-[var(--success)] border-[var(--success)]/10',
  PROBATION: 'bg-[var(--warning)]/5 text-[var(--warning)] border-[var(--warning)]/10',
  NOTICE_PERIOD: 'bg-[var(--info)]/5 text-[var(--info)] border-[var(--info)]/10',
  TERMINATED: 'bg-[var(--error)]/5 text-[var(--error)] border-[var(--error)]/10'
};

const ITAdmin = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { refreshSettings } = useTheme();
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [securityPulse, setSecurityPulse] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentUser = getStoredUser();
  const normalizedRole = (currentUser?.role || '').toUpperCase().replace(/ /g, '_');
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'call-cards' | 'assets' | 'integrations'>(
    (currentUser?.rank || 0) >= 85 ? 'accounts' : 'overview'
  );

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showIdModal, setShowIdModal] = useState(false);
  const [orgSettings, setOrgSettings] = useState<any>(null);

  // 📇 Call Card Tab States
  const [selectedCardEmployee, setSelectedCardEmployee] = useState<any>(null);
  const [cardData, setCardData] = useState<any>({
    employeeId: '',
    fullName: '',
    jobTitle: '',
    department: '',
    bio: '',
    phone: '',
    email: '',
    whatsapp: '',
    linkedin: '',
    github: '',
    website: '',
    theme: 'MCB_GOLD',
    isActive: true
  });
  const [loadingCard, setLoadingCard] = useState(false);
  const [savingCard, setSavingCard] = useState(false);

  useEffect(() => {
    const fetchCardDetails = async () => {
      if (!selectedCardEmployee) return;
      try {
        setLoadingCard(true);
        const res = await api.get(`/call-cards/employee/${selectedCardEmployee.id}`);
        setCardData(res.data);
      } catch (err: any) {
        toast.error('Failed to load employee call card settings.');
      } finally {
        setLoadingCard(false);
      }
    };
    fetchCardDetails();
  }, [selectedCardEmployee]);

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardEmployee) return;
    try {
      setSavingCard(true);
      const payload = {
        ...cardData,
        employeeId: selectedCardEmployee.id
      };
      const res = await api.post('/call-cards/upsert', payload);
      setCardData(res.data);
      toast.success(`Successfully configured digital business card for ${cardData.fullName}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save call card settings.');
    } finally {
      setSavingCard(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, uRes, sRes, lRes, pRes] = await Promise.all([
        api.get('/it/overview'), 
        api.get('/it/users'),
        api.get('/settings'),
        api.get('/it/live-logs'),
        api.get('/it/security-threats')
      ]);
      setOverview(oRes.data || null);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      setOrgSettings(sRes.data || null);
      setLiveLogs(Array.isArray(lRes.data) ? lRes.data : []);
      setSecurityPulse(pRes.data || null);
      
      console.log('[ITAdmin] Active Org Context:', sRes.data?.organizationId || 'default');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const refreshLivePulse = async () => {
     setIsRefreshing(true);
     try {
        const [lRes, pRes] = await Promise.all([
           api.get('/it/live-logs'),
           api.get('/it/security-threats')
        ]);
        setLiveLogs(lRes.data);
        setSecurityPulse(pRes.data);
     } catch {}
     finally { setIsRefreshing(false); }
  };

  useEffect(() => {
     const interval = setInterval(refreshLivePulse, 30000); // Pulse every 30s
     return () => clearInterval(interval);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrintId = (user: any) => {
    setSelectedUser(user);
    setShowIdModal(true);
  };

  const handlePasswordReset = async (userId: string, name: string) => {
    setResettingId(userId);
    try {
      await api.post(`/it/users/${userId}/reset-password`);
      toast.success(`${t('it_admin.success_reset')}: ${name}`);
    } catch (err: any) { toast.error(String(err?.response?.data?.error || t('common.error'))); }
    finally { setResettingId(null); }
  };

  const handleDeactivate = async (userId: string, name: string) => {
    try {
      await api.patch(`/it/users/${userId}/deactivate`);
      fetchData();
      toast.success(`${t('it_admin.success_deactivate')}: ${name}`);
    } catch (err: any) { toast.error(String(err?.response?.data?.error || t('common.error'))); }
  };

  const filtered = users.filter(u =>
    `${u.fullName} ${u.email} ${u.jobTitle} ${u.role}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-32 overflow-y-visible min-h-screen">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-3 px-6 py-3 bg-[var(--bg-card)] hover:bg-[var(--bg-sidebar-active)] border border-[var(--border-subtle)] rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all shadow-sm"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Overview
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tighter uppercase italic leading-tight">
            {currentUser?.rank >= 85 ? 'Strategic Systems Hub' : 'IT Infrastructure Admin'}
          </h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--primary)] opacity-60" />
            Managing identity nodes and technical infrastructure for {orgSettings?.companyName || 'the institution'}.
          </p>
        </motion.div>

        <div className="flex bg-[var(--bg-elevated)]/50 p-1 rounded-2xl border border-[var(--border-subtle)] overflow-x-auto no-scrollbar max-w-full">
           {(['overview', 'accounts', 'call-cards', 'assets', 'integrations'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                 className={cn("px-4 sm:px-6 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                 activeTab === tab ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                {tab === 'overview' ? 'Overview' : tab === 'accounts' ? 'ID Registry' : tab === 'call-cards' ? 'Digital Call Cards' : tab === 'assets' ? 'Infrastructure' : 'Integrations'}
              </button>
           ))}
        </div>
      </div>

      <AnimatePresence>
        {loading ? (
             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-40 flex flex-col items-center gap-6">
                <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Accessing Identity Grid</p>
             </motion.div>
        ) : (
          <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
            {activeTab === 'overview' && overview && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                      { label: 'Total Personnel', value: overview.totalUsers, icon: Users, color: 'text-[var(--primary)] bg-[var(--primary)]/5' },
                      { label: 'Active Sessions', value: overview.activeUsers, icon: Zap, color: 'text-[var(--success)] bg-[var(--success)]/5' },
                      { label: 'Hardware Assets', value: overview.assets, icon: Package, color: 'text-[var(--info)] bg-[var(--info)]/5' },
                      { label: 'Audit Log Volume', value: overview.systemHealth?.totalAuditLogs || 0, icon: Activity, color: 'text-[var(--warning)] bg-[var(--warning)]/5' },
                    ].map((s, idx) => (
                      <motion.div key={s.label} className="nx-card p-8 bg-[var(--bg-card)] border-[var(--border-subtle)] group">
                         <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-[var(--border-subtle)]", s.color)}>
                             <s.icon size={20} />
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-60">{s.label}</p>
                         <h4 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">{s.value}</h4>
                      </motion.div>
                    ))}
                  </div>

                  {/* STRATEGIC SECURITY HUB */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                     <div className="lg:col-span-4 space-y-6">
                        <div className="nx-card p-8 bg-[var(--bg-card)] border-[var(--border-subtle)] relative overflow-hidden shadow-sm">
                           <div className="flex items-center justify-between mb-8">
                              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">Security Threat Matrix</h3>
                              <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter", 
                                 securityPulse?.threatLevel === 'CRITICAL' ? "bg-rose-500 text-white animate-pulse" : "bg-emerald-500 text-white")}>
                                 {securityPulse?.threatLevel || 'STABLE'}
                              </div>
                           </div>
                           <div className="space-y-4">
                              {securityPulse?.alerts?.length > 0 ? securityPulse.alerts.map((a: string, i: number) => (
                                 <div key={i} className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-start gap-3">
                                    <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] font-bold text-rose-600 leading-tight">{a}</p>
                                 </div>
                              )) : (
                                 <div className="p-8 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl opacity-40">
                                    <ShieldCheck size={32} className="mx-auto mb-3 text-emerald-500" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">No active threats detected</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>

                     <div className="lg:col-span-8">
                        <div className="nx-card bg-[var(--bg-card)] border-[var(--border-subtle)] h-full flex flex-col overflow-hidden shadow-sm">
                           <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 flex justify-between items-center">
                              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] flex items-center gap-2">
                                 <Activity size={14} className="text-[var(--primary)]" /> Real-Time Observability Pulse
                              </h3>
                              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                 <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                                 Live Feed
                              </div>
                           </div>
                           <div className="flex-grow max-h-[400px] overflow-y-auto p-4 space-y-3 custom-scrollbar font-mono bg-black/5">
                              {liveLogs.map((log: any, idx: number) => (
                                 <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={log.id || idx} 
                                    className="p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-subtle)]/50 flex items-center justify-between group hover:border-[var(--primary)]/30 transition-all">
                                    <div className="flex items-center gap-4">
                                       <span className="text-[9px] font-black text-[var(--text-muted)] w-16 opacity-40">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                       <div className="space-y-0.5">
                                          <p className="text-[10px] font-black text-[var(--text-primary)] tracking-tight uppercase group-hover:text-[var(--primary)] transition-colors">{log.action?.replace(/_/g, ' ')}</p>
                                          <p className="text-[9px] font-bold text-[var(--text-muted)]">{log.user?.fullName} · {log.user?.role}</p>
                                       </div>
                                    </div>
                                    <div className="text-[9px] font-black text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">{log.targetModel}</div>
                                 </motion.div>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                      <div className="nx-card p-10 border-[var(--border-subtle)] bg-[var(--bg-card)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12"><ShieldCheck size={160} /></div>
                        <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-8">IT Manager Mandate</h3>
                        <p className="text-sm font-medium text-[var(--text-secondary)] leading-relaxed max-w-2xl mb-10">
                          As the Strategic Systems Hub controller, you are the final arbiter of organizational identity. 
                          Your mandate includes the verification of biometric nodes, the issuance of official personnel tags, and the absolute security of the cloud data vault.
                        </p>
                        <button onClick={() => setActiveTab('accounts')} className="px-8 h-14 rounded-2xl bg-[var(--primary)] text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20 hover:scale-[1.02] transition-transform">
                          Initialize Identity Registry
                        </button>
                      </div>

                      <div className="nx-card border-[var(--border-subtle)] overflow-hidden">
                        <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20">
                           <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Recently Added Personnel</h3>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="nx-table">
                              <thead>
                                 <tr><th className="px-10 py-6">Name</th><th>Level</th><th>Status</th><th className="px-10 text-right">Date</th></tr>
                              </thead>
                              <tbody>
                                 {overview.recentAccounts?.map((u: any) => (
                                    <tr key={u.id} className="border-b border-[var(--border-subtle)]/30 hover:bg-[var(--bg-elevated)]/10">
                                       <td className="px-10 py-6 font-bold text-[13px]">{u.fullName}</td>
                                       <td><span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-[var(--bg-elevated)]">{u.role}</span></td>
                                       <td><span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase border", statusBadge[u.status])}>{u.status}</span></td>
                                       <td className="px-10 text-right font-mono text-[10px]">{new Date(u.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 space-y-8">
                       <div className="nx-card p-10 border-[var(--border-subtle)] bg-[var(--bg-card)]">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] mb-8 flex items-center gap-3"><Activity size={16} className="text-[var(--primary)]" /> System Pulse</h4>
                          <div className="space-y-6">
                             {[
                               { label: 'DB Engine', value: overview.systemHealth?.dbConnectivity ? 'READY' : 'DEGRADED', color: 'text-[var(--success)]' },
                               { label: 'Sync State', value: overview.systemHealth?.syncState || 'STABLE', color: 'text-[var(--success)]' },
                               { label: 'Uptime', value: `${Math.floor((overview.systemHealth?.uptime || 0) / 3600)}h Active`, color: 'text-[var(--text-primary)]' }
                             ].map(item => (
                               <div key={item.label} className="flex justify-between items-center py-3 border-b border-[var(--border-subtle)]/50 last:border-0">
                                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{item.label}</span>
                                  <span className={cn("text-[11px] font-black uppercase", item.color)}>{item.value}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>
                </>
            )}

            {activeTab === 'accounts' && (
                <div className="nx-card border-[var(--border-subtle)] overflow-hidden flex flex-col min-h-[600px]">
                   <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 flex flex-col sm:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                            <Database size={20} />
                         </div>
                         <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Personnel Identity Registry</h3>
                      </div>
                      <div className="relative w-full max-w-sm group">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                        <input 
                           type="text" 
                           className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl pl-12 pr-4 py-2.5 text-[11px] font-bold focus:border-[var(--primary)] outline-none" 
                           placeholder="Search registry..." 
                           value={search} 
                           onChange={e => setSearch(e.target.value)} 
                        />
                      </div>
                   </div>

                   <div className="overflow-x-auto flex-grow">
                      <table className="nx-table">
                         <thead>
                            <tr className="bg-[var(--bg-elevated)]/10 text-left">
                               <th className="px-10 py-6">Staff Name</th>
                               <th>Access Level</th>
                               <th>Status</th>
                               <th>Strategic Unit</th>
                               <th className="px-10 py-6 text-right">Actions</th>
                            </tr>
                         </thead>
                         <tbody>
                            {filtered.filter(u => (u.rank || 0) < 100 || currentUser?.rank === 100).map((u: any) => (
                               <tr key={u.id} className="border-b border-[var(--border-subtle)]/30 hover:bg-[var(--bg-elevated)]/10">
                                  <td className="px-10 py-6">
                                     <div className="flex items-center gap-4 text-left">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-black text-xs uppercase">{u.fullName[0]}</div>
                                        <div>
                                           <p className="text-[13px] font-black text-[var(--text-primary)] uppercase">{u.fullName}</p>
                                           <p className="text-[9px] font-bold text-[var(--text-muted)] italic">{u.email}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td><span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-[var(--bg-elevated)] text-[var(--primary)] border border-[var(--primary)]/10">{roleLabel[u.role] || u.role}</span></td>
                                  <td><span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase border", statusBadge[u.status])}>{u.status}</span></td>
                                  <td className="text-[11px] font-bold uppercase text-[var(--text-secondary)]">{u.departmentObj?.name || 'CENTRAL_HUB'}</td>
                                  <td className="px-10 py-6 text-right">
                                     <div className="flex justify-end gap-3">
                                        {(normalizedRole === 'IT_MANAGER' || normalizedRole === 'IT_ADMIN' || normalizedRole === 'DEV') && (
                                           <button onClick={() => handlePrintId(u)} title="Print ID Card" className="p-2.5 rounded-xl bg-[var(--primary)]/5 text-[var(--primary)] border border-[var(--primary)]/10 hover:bg-[var(--primary)] hover:text-white transition-all"><Key size={14} /></button>
                                        )}
                                        <button onClick={() => handlePasswordReset(u.id, u.fullName)} disabled={resettingId === u.id} title="Force Password Reset" className="p-2.5 rounded-xl bg-amber-500/5 text-amber-500 border border-amber-500/10 hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50">
                                           {resettingId === u.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                        </button>
                                        {currentUser?.id !== u.id && (
                                            <button onClick={() => handleDeactivate(u.id, u.fullName)} title="Deactivate Account" className="p-2.5 rounded-xl bg-rose-500/5 text-rose-500 border border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all"><UserX size={14} /></button>
                                        )}
                                     </div>
                                  </td>
                                </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
            )}

            {activeTab === 'call-cards' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                   {/* Left Pane: Registry List */}
                   <div className="lg:col-span-4 nx-card border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col h-[650px] overflow-hidden">
                      <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20">
                         <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <Users size={14} className="text-[var(--primary)]" /> Select Personnel
                         </h4>
                         <div className="relative w-full group">
                            <Search size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                            <input 
                               type="text" 
                               className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl pl-10 pr-4 py-2 text-[10px] font-bold focus:border-[var(--primary)] outline-none" 
                               placeholder="Filter employee list..." 
                               value={search} 
                               onChange={e => setSearch(e.target.value)} 
                            />
                         </div>
                      </div>
                      
                      <div className="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar">
                         {filtered.map((u: any) => {
                            const isSelected = selectedCardEmployee?.id === u.id;
                            const initials = u.fullName.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase();
                            return (
                               <button 
                                  key={u.id}
                                  type="button"
                                  onClick={() => setSelectedCardEmployee(u)}
                                  className={cn(
                                     "w-full p-4 rounded-xl border flex items-center gap-4 text-left transition-all duration-200",
                                     isSelected 
                                        ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]" 
                                        : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]/20"
                                  )}
                               >
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-black text-[10px] uppercase">
                                     {initials}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <p className="text-[11px] font-black uppercase truncate text-[var(--text-primary)]">{u.fullName}</p>
                                     <p className="text-[9px] font-bold text-[var(--text-muted)] truncate">{u.jobTitle || 'No Title Set'}</p>
                                  </div>
                               </button>
                            );
                         })}
                      </div>
                   </div>

                   {/* Right Pane: Customizer / Preview split */}
                   <div className="lg:col-span-8 space-y-8">
                      {!selectedCardEmployee ? (
                          <div className="nx-card p-24 border-[var(--border-subtle)] bg-[var(--bg-card)] text-center flex flex-col items-center justify-center h-[650px] relative overflow-hidden group">
                             <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--primary)]/5 to-transparent pointer-events-none opacity-40" />
                             <div className="w-20 h-20 rounded-[2rem] bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] mb-8 shadow-xl group-hover:scale-105 transition-transform duration-300">
                                <QrCode size={36} className="animate-pulse" />
                             </div>
                             <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-4">Digital Business Cards</h3>
                             <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] max-w-sm leading-relaxed mb-6 opacity-60">
                                Select an employee from the registry list to configure their premium NFC/QR Corporate Call Card with modern visual themes.
                             </p>
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                             {/* Form Customizer */}
                             <form onSubmit={handleSaveCard} className="xl:col-span-7 nx-card p-10 border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-8">
                                <div className="flex justify-between items-center border-b border-[var(--border-subtle)]/50 pb-6">
                                   <div>
                                      <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight">Design & Socials</h3>
                                      <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] mt-1">Configure hosted contact payload</p>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">CARD STATUS</span>
                                      <button 
                                         type="button"
                                         onClick={() => setCardData((prev: any) => ({ ...prev, isActive: !prev.isActive }))}
                                         className={cn(
                                            "w-12 h-6 rounded-full p-1 transition-all duration-300 relative border",
                                            cardData.isActive ? "bg-emerald-500/20 border-emerald-500" : "bg-rose-500/20 border-rose-500"
                                         )}
                                      >
                                         <div className={cn(
                                            "w-4 h-4 rounded-full transition-all duration-300",
                                            cardData.isActive ? "bg-emerald-500 translate-x-6" : "bg-rose-500 translate-x-0"
                                         )} />
                                      </button>
                                   </div>
                                </div>

                                {loadingCard ? (
                                    <div className="py-20 flex items-center justify-center">
                                       <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                       {/* Core fields */}
                                       <div className="grid grid-cols-2 gap-6">
                                          <div className="space-y-2">
                                             <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Full Card Name</label>
                                             <input 
                                                type="text" 
                                                required
                                                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[11px] font-bold focus:border-[var(--primary)] outline-none" 
                                                value={cardData.fullName || ''}
                                                onChange={e => setCardData((prev: any) => ({ ...prev, fullName: e.target.value }))}
                                             />
                                          </div>
                                          <div className="space-y-2">
                                             <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Job Title</label>
                                             <input 
                                                type="text" 
                                                required
                                                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[11px] font-bold focus:border-[var(--primary)] outline-none" 
                                                value={cardData.jobTitle || ''}
                                                onChange={e => setCardData((prev: any) => ({ ...prev, jobTitle: e.target.value }))}
                                             />
                                          </div>
                                       </div>

                                       <div className="grid grid-cols-2 gap-6">
                                          <div className="space-y-2">
                                             <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Strategic Department</label>
                                             <input 
                                                type="text" 
                                                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[11px] font-bold focus:border-[var(--primary)] outline-none" 
                                                value={cardData.department || ''}
                                                onChange={e => setCardData((prev: any) => ({ ...prev, department: e.target.value }))}
                                             />
                                          </div>
                                          <div className="space-y-2">
                                             <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Corporate Theme</label>
                                             <select 
                                                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[11px] font-bold focus:border-[var(--primary)] outline-none"
                                                value={cardData.theme || 'MCB_GOLD'}
                                                onChange={e => setCardData((prev: any) => ({ ...prev, theme: e.target.value }))}
                                             >
                                                <option value="MCB_GOLD">MCB Corporate Gold</option>
                                                <option value="MIDNIGHT_LUXURY">Midnight Luxury</option>
                                                <option value="GHANA_SUNSHINE">Ghana Sunshine</option>
                                             </select>
                                          </div>
                                       </div>

                                       <div className="space-y-2">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Personal Bio Statement</label>
                                          <textarea 
                                             rows={2}
                                             className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[11px] font-bold focus:border-[var(--primary)] outline-none resize-none" 
                                             placeholder="Brief professional profile statement..."
                                             value={cardData.bio || ''}
                                             onChange={e => setCardData((prev: any) => ({ ...prev, bio: e.target.value }))}
                                          />
                                       </div>

                                       <div className="border-t border-[var(--border-subtle)]/50 pt-6 space-y-4">
                                          <h4 className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Contact Channels & Social Handles</h4>
                                          <div className="grid grid-cols-2 gap-6">
                                             <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Email Address</label>
                                                <input 
                                                   type="email" 
                                                   required
                                                   className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[11px] font-bold focus:border-[var(--primary)] outline-none" 
                                                   value={cardData.email || ''}
                                                   onChange={e => setCardData((prev: any) => ({ ...prev, email: e.target.value }))}
                                                />
                                             </div>
                                             <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Phone Number</label>
                                                <input 
                                                   type="text" 
                                                   className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[11px] font-bold focus:border-[var(--primary)] outline-none" 
                                                   value={cardData.phone || ''}
                                                   onChange={e => setCardData((prev: any) => ({ ...prev, phone: e.target.value }))}
                                                />
                                             </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-6">
                                             <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">WhatsApp Number</label>
                                                <input 
                                                   type="text" 
                                                   placeholder="e.g. +23354XXXXXXX"
                                                   className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[11px] font-bold focus:border-[var(--primary)] outline-none" 
                                                   value={cardData.whatsapp || ''}
                                                   onChange={e => setCardData((prev: any) => ({ ...prev, whatsapp: e.target.value }))}
                                                />
                                             </div>
                                             <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">LinkedIn Profile URL</label>
                                                <input 
                                                   type="text" 
                                                   placeholder="https://linkedin.com/in/..."
                                                   className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[11px] font-bold focus:border-[var(--primary)] outline-none" 
                                                   value={cardData.linkedin || ''}
                                                   onChange={e => setCardData((prev: any) => ({ ...prev, linkedin: e.target.value }))}
                                                />
                                             </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-6">
                                             <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">GitHub Profile URL</label>
                                                <input 
                                                   type="text" 
                                                   placeholder="https://github.com/..."
                                                   className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[11px] font-bold focus:border-[var(--primary)] outline-none" 
                                                   value={cardData.github || ''}
                                                   onChange={e => setCardData((prev: any) => ({ ...prev, github: e.target.value }))}
                                                />
                                             </div>
                                             <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Portfolio Website URL</label>
                                                <input 
                                                   type="text" 
                                                   placeholder="https://..."
                                                   className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[11px] font-bold focus:border-[var(--primary)] outline-none" 
                                                   value={cardData.website || ''}
                                                   onChange={e => setCardData((prev: any) => ({ ...prev, website: e.target.value }))}
                                                />
                                             </div>
                                          </div>
                                       </div>

                                       <button 
                                          type="submit"
                                          disabled={savingCard}
                                          className="w-full h-14 bg-[var(--primary)] text-white hover:scale-[1.01] transition-transform font-black text-[10px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50"
                                       >
                                          {savingCard ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                          Commit Card Configurations
                                       </button>
                                    </div>
                                )}
                             </form>

                             {/* Live Theme Preview & QR Hub */}
                             <div className="xl:col-span-5 space-y-8">
                                {/* Visual Card Mini Preview */}
                                <div className={cn(
                                   "p-6 rounded-[2.5rem] border relative overflow-hidden space-y-6 shadow-xl transition-all duration-500",
                                   cardData.theme === 'MCB_GOLD' ? "bg-gradient-to-br from-[#0c1c15] to-[#040605] border-[#dfb76c]/30 text-white" :
                                   cardData.theme === 'GHANA_SUNSHINE' ? "bg-gradient-to-br from-[#1c0808] to-[#050202] border-red-500/30 text-white" :
                                   "bg-[#171a21] border-white/10 text-white"
                                )}>
                                   <div className="flex justify-between items-start">
                                      <span className={cn(
                                         "px-2 py-0.5 rounded-full border text-[6px] font-black uppercase tracking-widest",
                                         cardData.theme === 'MCB_GOLD' ? "bg-[#dfb76c]/10 border-[#dfb76c]/20 text-[#dfb76c]" :
                                         cardData.theme === 'GHANA_SUNSHINE' ? "bg-[#f97316]/10 border-[#f97316]/20 text-[#f97316]" :
                                         "bg-blue-400/10 border-blue-400/20 text-blue-400"
                                      )}>
                                         Preview Frame
                                      </span>
                                      <div className="text-right">
                                         <h4 className="text-[10px] font-black tracking-widest uppercase">MCB</h4>
                                         <p className="text-[5px] font-black uppercase text-gray-500">Ghana</p>
                                      </div>
                                   </div>

                                   <div className="flex items-center gap-4">
                                      <div className={cn(
                                         "w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs border p-0.5",
                                         cardData.theme === 'MCB_GOLD' ? "border-[#dfb76c] bg-[#dfb76c]/5 text-[#dfb76c]" :
                                         cardData.theme === 'GHANA_SUNSHINE' ? "border-orange-500 bg-[#f97316]/5 text-[#f97316]" :
                                         "border-blue-400 bg-white/5 text-white"
                                      )}>
                                         {cardData.fullName?.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase() || 'CC'}
                                      </div>
                                      <div className="min-w-0">
                                         <h4 className="font-black text-[14px] uppercase truncate">{cardData.fullName || 'Name Placeholder'}</h4>
                                         <p className={cn(
                                            "text-[9px] font-bold uppercase",
                                            cardData.theme === 'MCB_GOLD' ? "text-[#dfb76c]" :
                                            cardData.theme === 'GHANA_SUNSHINE' ? "text-[#f97316]" :
                                            "text-blue-400"
                                         )}>{cardData.jobTitle || 'Role Title'}</p>
                                      </div>
                                   </div>

                                   {cardData.bio && (
                                       <p className="text-[9px] leading-relaxed italic opacity-80 border-l border-white/20 pl-3">
                                          "{cardData.bio}"
                                       </p>
                                   )}

                                   <div className="grid grid-cols-2 gap-2 text-[8px] font-bold text-gray-400">
                                      {cardData.email && <div className="truncate flex items-center gap-1.5"><Mail size={10} /> {cardData.email}</div>}
                                      {cardData.phone && <div className="truncate flex items-center gap-1.5"><Phone size={10} /> {cardData.phone}</div>}
                                   </div>
                                </div>

                                {/* QR Code & Export Card */}
                                <div className="nx-card p-8 border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col items-center text-center space-y-6">
                                   <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">QR/NFC Asset Portal</h4>
                                   
                                   {cardData.id ? (
                                       <div className="space-y-6 flex flex-col items-center w-full">
                                          <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100 relative group">
                                             <QRCodeCanvas 
                                                id="card-qr-canvas"
                                                value={`${window.location.origin}/shared-card/${cardData.id}`}
                                                size={160}
                                                level="H"
                                                includeMargin={true}
                                             />
                                          </div>
                                          
                                          <p className="text-[9px] font-bold text-[var(--text-muted)] leading-relaxed max-w-[200px]">
                                             Scan this QR to open the mobile-optimized business card in real-time.
                                          </p>

                                          <div className="flex gap-3 w-full">
                                             <button 
                                                type="button"
                                                onClick={() => {
                                                   const canvas = document.getElementById('card-qr-canvas') as HTMLCanvasElement;
                                                   if (!canvas) return;
                                                   const url = canvas.toDataURL('image/png');
                                                   const link = document.createElement('a');
                                                   link.href = url;
                                                   link.download = `QR_${cardData.fullName.replace(/\s+/g, '_')}.png`;
                                                   document.body.appendChild(link);
                                                   link.click();
                                                   document.body.removeChild(link);
                                                }}
                                                className="flex-1 h-12 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[9px] font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center justify-center gap-2 hover:bg-[var(--bg-sidebar-active)] transition-all"
                                             >
                                                <Download size={12} /> Export PNG
                                             </button>
                                             
                                             <Link 
                                                to={`/shared-card/${cardData.id}`}
                                                target="_blank"
                                                className="flex-1 h-12 rounded-xl bg-[var(--primary)] text-white text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-transform"
                                             >
                                                <Eye size={12} /> View Card
                                             </Link>
                                          </div>
                                       </div>
                                   ) : (
                                       <div className="py-8 flex flex-col items-center gap-4">
                                          <QrCode className="text-[var(--text-muted)] opacity-30" size={48} />
                                          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[8px] font-black uppercase tracking-wider">
                                             Pending Generation
                                          </span>
                                          <p className="text-[9px] font-bold text-[var(--text-muted)] leading-relaxed max-w-[200px]">
                                             Please commit the card configuration first to generate the hosted QR / NFC target link.
                                          </p>
                                       </div>
                                   )}
                                </div>
                             </div>
                          </div>
                      )}
                   </div>
                </div>
            )}

            {activeTab === 'assets' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                   <div className="lg:col-span-8">
                      <div className="nx-card p-24 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] text-center relative overflow-hidden group">
                        <Server size={80} className="mx-auto mb-10 text-[var(--primary)] opacity-20" />
                        <h3 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-4">Hardware Management</h3>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-12 max-w-sm mx-auto opacity-60">Manage company laptops, biometric devices, and server hardware.</p>
                        <Link to="/assets" className="inline-flex items-center gap-4 px-10 h-14 rounded-2xl bg-[var(--primary)] text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[var(--primary)]/30 hover:gap-6 transition-all">
                           Go to Hardware Hub <ArrowRight size={18} />
                        </Link>
                      </div>
                   </div>

                   <div className="lg:col-span-4 space-y-8">
                       <div className="nx-card p-10 border-[var(--border-subtle)] bg-[var(--bg-card)]">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] mb-8">Active Hardware Nodes</h4>
                          <div className="space-y-4">
                             {(overview.nodes && overview.nodes.length > 0) ? overview.nodes.map((n: any) => (
                                <div key={n.id} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 flex items-center justify-between">
                                   <div>
                                      <p className="text-[11px] font-black text-[var(--text-primary)] uppercase">{n.name}</p>
                                      <p className="text-[9px] text-[var(--text-muted)] font-bold">{n.description || 'Hardware Node'} • {n.id.split('-')[0]}</p>
                                   </div>
                                   <div className={cn("w-2 h-2 rounded-full", n.status === 'AVAILABLE' || n.status === 'ACTIVE' ? "bg-[var(--success)] animate-pulse" : "bg-[var(--error)]")} />
                                </div>
                             )) : (
                                <div className="p-8 text-center border border-dashed border-[var(--border-subtle)] rounded-xl opacity-40">
                                   <p className="text-[9px] font-black uppercase tracking-widest">{t('common.no_data_available')}</p>
                                </div>
                             )}
                          </div>
                       </div>
                   </div>
                </div>
            )}

            {activeTab === 'integrations' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                   <div className="lg:col-span-8 nx-card p-12 border-[var(--border-subtle)] bg-[var(--bg-card)]">
                      <div className="flex items-center gap-4 mb-10">
                          <div className="w-14 h-14 rounded-2xl bg-[var(--info)]/10 flex items-center justify-center text-[var(--info)]"><Server size={28} /></div>
                          <div>
                              <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">Email Integration</h3>
                              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">SMTP Gateway Configuration</p>
                          </div>
                      </div>
                      <div className="space-y-10">
                         {[
                           { step: 1, title: 'SMTP Preparation', desc: 'Gather corporate mail server credentials. We recommend a dedicated app password.' },
                           { step: 2, title: 'Deploy in Settings', desc: 'Navigate to Admin Settings and input your host (e.g., smtp.office365.com) and user credentials.' }
                         ].map(s => (
                           <div key={s.step} className="flex gap-8">
                              <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-black flex-shrink-0">{s.step}</div>
                              <div>
                                 <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-2">{s.title}</h4>
                                 <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="lg:col-span-4 space-y-8">
                      <div className="nx-card p-8 bg-[var(--primary)] text-white border-none shadow-2xl">
                         <Shield className="mb-6 opacity-40" size={32} />
                         <h4 className="text-lg font-black uppercase tracking-tight mb-4">Node Runtime</h4>
                         <div className="space-y-4">
                            <div className="flex justify-between py-2 border-b border-white/10 text-[10px] uppercase font-black"><span>Engine</span><span>NODE {overview.systemHealth?.nodeVersion?.replace('v','')}</span></div>
                            <div className="flex justify-between py-2 border-b border-white/10 text-[10px] uppercase font-black"><span>Sync</span><span className="text-emerald-300">ACTIVE</span></div>
                         </div>
                      </div>
                   </div>
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIdModal && selectedUser && orgSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-5xl h-[90vh] bg-white rounded-[3rem] overflow-hidden flex flex-col relative text-left">
              <button onClick={() => setShowIdModal(false)} className="absolute top-8 right-8 z-20 p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"><ArrowLeft className="rotate-90" /></button>
              <div className="flex-grow overflow-y-auto p-12">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    <div className="space-y-12">
                       <h2 className="text-4xl font-black text-gray-900 tracking-tight uppercase italic leading-tight">Personnel Identity <br /><span className="text-[var(--primary)]">Tag Generation</span></h2>
                       <div className="space-y-8">
                          <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100"><p className="text-sm font-medium text-gray-700 leading-relaxed">Printing this card will finalize the digital-to-physical identity link for {selectedUser.fullName}. Standard CR80 Dimensions.</p></div>
                          <button onClick={() => window.print()} className="w-full h-16 rounded-2xl bg-gray-900 text-white font-black text-[12px] uppercase tracking-[0.3em] flex items-center justify-center gap-4">Print ID Card</button>
                       </div>
                    </div>
                    <div className="flex justify-center items-start lg:pt-12"><EmployeeIDCard employee={selectedUser} organization={orgSettings} /></div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ITAdmin;
