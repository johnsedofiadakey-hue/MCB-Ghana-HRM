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

export interface ThemeStyles {
  bg: string;
  cardBg: string;
  cardBorder: string;
  accentText: string;
  badgeBg: string;
  primaryBtn: string;
  iconBg: string;
  textColor: string;
  titleColor: string;
  chipColor: string;
  isDark: boolean;
  styles?: {
    accentText?: React.CSSProperties;
    badgeBg?: React.CSSProperties;
    primaryBtn?: React.CSSProperties;
    iconBg?: React.CSSProperties;
    chip?: React.CSSProperties;
  };
}

export const getThemeStyles = (themeName: string, primaryColor?: string, accentColor?: string): ThemeStyles => {
  const brandPrimary = primaryColor || '#009EE3';
  const brandAccent = accentColor || '#EE7100';

  return {
    bg: "bg-gradient-to-br from-[#FAF9F6] via-[#F5F2EB] to-[#EAE6DF]",
    cardBg: "bg-white/85 backdrop-blur-md",
    cardBorder: "border-zinc-200/60 shadow-xl",
    accentText: "text-zinc-600",
    badgeBg: "bg-zinc-100 border-zinc-200 text-zinc-600",
    primaryBtn: "text-white hover:shadow-lg",
    iconBg: "bg-zinc-50 border border-zinc-200 text-zinc-600 hover:bg-zinc-100",
    textColor: "text-zinc-500",
    titleColor: "text-zinc-800",
    chipColor: "bg-zinc-100 border-zinc-200 text-zinc-600",
    isDark: false,
    styles: {
      accentText: { color: brandAccent },
      badgeBg: { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)', color: '#333' },
      primaryBtn: { background: `linear-gradient(135deg, ${brandPrimary}, ${brandAccent})`, color: '#ffffff' },
      iconBg: { color: brandPrimary },
      chip: { borderColor: brandPrimary, color: brandPrimary }
    }
  };
};

const ITAdmin = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { settings, refreshSettings } = useTheme();
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
  const [isFlipped, setIsFlipped] = useState(false);

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
            {currentUser?.rank >= 85 ? 'IT Administration' : 'IT Infrastructure'}
          </h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--primary)] opacity-60" />
            Manage user accounts and IT systems for {orgSettings?.companyName || 'your organisation'}.
          </p>
        </motion.div>

        <div className="flex bg-[var(--bg-elevated)]/50 p-1 rounded-2xl border border-[var(--border-subtle)] overflow-x-auto no-scrollbar max-w-full">
           {(['overview', 'accounts', 'call-cards', 'assets', 'integrations'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                 className={cn("px-4 sm:px-6 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                 activeTab === tab ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                {tab === 'overview' ? 'Overview' : tab === 'accounts' ? 'User Accounts' : tab === 'call-cards' ? 'Digital Call Cards' : tab === 'assets' ? 'Infrastructure' : 'Integrations'}
              </button>
           ))}
        </div>
      </div>

      <AnimatePresence>
        {loading ? (
             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-40 flex flex-col items-center gap-6">
                <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Loading...</p>
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
                      { label: 'System Log Entries', value: overview.systemHealth?.totalAuditLogs || 0, icon: Activity, color: 'text-[var(--warning)] bg-[var(--warning)]/5' },
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
                              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">Security Alerts</h3>
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
                                 <Activity size={14} className="text-[var(--primary)]" /> Activity Feed
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
                          As the IT Manager, you are responsible for managing user accounts, issuing employee ID cards, and maintaining system security. Use the accounts tab to create or update user profiles and manage access permissions.
                        </p>
                        <button onClick={() => setActiveTab('accounts')} className="px-8 h-14 rounded-2xl bg-[var(--primary)] text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20 hover:scale-[1.02] transition-transform">
                          Manage User Accounts
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
                                             <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Card Orientation</label>
                                             <select 
                                                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[11px] font-bold focus:border-[var(--primary)] outline-none"
                                                value={cardData.theme || 'horizontal'}
                                                onChange={e => setCardData((prev: any) => ({ ...prev, theme: e.target.value }))}
                                             >
                                                <option value="horizontal">💳 Horizontal Card Layout</option>
                                                <option value="vertical">📱 Vertical Card Layout</option>
                                             </select>
                                          </div>
                                       </div>

                                       <div className="space-y-2">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Bilateral Sync Settings</label>
                                          <div className="flex items-center gap-3 h-11 px-4 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl">
                                             <input 
                                                type="checkbox"
                                                id="enableContactCollection"
                                                className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)] border-[var(--border-subtle)] cursor-pointer"
                                                checked={cardData.enableContactCollection || false}
                                                onChange={e => setCardData((prev: any) => ({ ...prev, enableContactCollection: e.target.checked }))}
                                             />
                                             <label htmlFor="enableContactCollection" className="text-[9px] font-black uppercase tracking-wider text-[var(--text-primary)] cursor-pointer select-none">
                                                Enable visitor contact capture & sync (Bilateral Sync)
                                             </label>
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
                                 {(() => {
                                    const primaryCol = settings?.primaryColor || '#009EE3';
                                    const accentCol = settings?.accentColor || '#EE7100';
                                    const logoSrc = settings?.logoUrl || settings?.companyLogoUrl || '';
                                    const themeStyles = getThemeStyles(cardData.theme || 'MCB_LIGHT_GOLD', primaryCol, accentCol);

                                    return (
                                       <div className="flex flex-col items-center space-y-4">
                                          <div className="flex justify-between items-center w-full px-2">
                                             <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[8px] font-black uppercase tracking-widest text-[var(--primary)]">
                                                3D Interactive Card Preview
                                             </span>
                                             <button 
                                                type="button"
                                                onClick={() => setIsFlipped(prev => !prev)}
                                                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[var(--primary)] hover:underline"
                                             >
                                                <Sparkles size={11} className="animate-pulse" /> Flip Card
                                             </button>
                                          </div>

                                          <div 
                                             className="card-flip-container w-full cursor-pointer select-none"
                                             onClick={() => setIsFlipped(prev => !prev)}
                                          >
                                             <div className={cn("card-flip-inner shadow-2xl rounded-[24px] transition-transform duration-700", isFlipped && "card-flipped")}>
                                                {/* Front Side */}
                                                {cardData.theme === 'vertical' ? (
                                                   /* Vertical Design */
                                                   <div className="card-flip-front w-full h-full bg-white relative rounded-[24px] overflow-hidden border border-zinc-200/60 shadow-xl flex flex-col items-center justify-between p-5 text-center">
                                                      {/* Bezier Curve Swooshes using Brand Colors */}
                                                      <svg className="absolute bottom-0 right-0 left-0 w-full h-[65px] overflow-hidden pointer-events-none" viewBox="0 0 500 150" preserveAspectRatio="none">
                                                         <path d="M0,80 C150,170 350,20 500,80 L500,150 L0,150 Z" fill={primaryCol} opacity="0.15"></path>
                                                         <path d="M0,100 C150,180 350,50 500,120 L500,150 L0,150 Z" fill={primaryCol} opacity="0.85"></path>
                                                         <path d="M0,120 C180,180 320,100 500,140 L500,150 L0,150 Z" fill={accentCol} opacity="0.75"></path>
                                                      </svg>

                                                      <div className="flex justify-between items-center w-full z-10">
                                                         <span className="px-2.5 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest bg-zinc-100 border border-zinc-200 text-zinc-600">
                                                            {cardData.isActive !== false ? "Active Member" : "Suspended"}
                                                         </span>
                                                         {logoSrc ? (
                                                            <img src={logoSrc} alt="Company Logo" className="h-5 max-w-[80px] object-contain" />
                                                         ) : (
                                                            <h4 className="text-[10px] font-black tracking-widest uppercase text-zinc-800">MCB</h4>
                                                         )}
                                                      </div>

                                                      <div className="flex flex-col items-center z-10 mt-1 space-y-1">
                                                         <div 
                                                            className="w-14 h-14 rounded-full flex-shrink-0 bg-zinc-50 border-2 p-0.5 shadow-sm overflow-hidden" 
                                                            style={{ borderColor: accentCol }}
                                                         >
                                                            {selectedCardEmployee?.profilePhotoUrl ? (
                                                               <img src={selectedCardEmployee.profilePhotoUrl} alt={cardData.fullName} className="w-full h-full object-cover rounded-full" />
                                                            ) : (
                                                               <div className="w-full h-full bg-zinc-100 rounded-full flex items-center justify-center font-black text-[14px] text-zinc-500">
                                                                  {cardData.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'CC'}
                                                               </div>
                                                            )}
                                                         </div>
                                                         <div>
                                                            <h4 className="font-black text-[13px] uppercase truncate tracking-wide text-zinc-900 leading-tight">{cardData.fullName || 'Name Placeholder'}</h4>
                                                            <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: accentCol }}>{cardData.jobTitle || 'Role Title'}</p>
                                                            {cardData.department && <p className="text-[7px] text-zinc-500 font-bold uppercase">{cardData.department}</p>}
                                                         </div>
                                                      </div>

                                                      <div className="w-full flex justify-center gap-4 z-10 pt-2 border-t border-zinc-100 text-[8px] font-bold text-zinc-500 mt-1">
                                                         <div className="flex items-center gap-1.5">
                                                            <Mail size={10} style={{ color: primaryCol }} />
                                                            <span className="truncate max-w-[90px]">{cardData.email || 'No Email'}</span>
                                                         </div>
                                                         <div className="flex items-center gap-1.5">
                                                            <Phone size={10} style={{ color: primaryCol }} />
                                                            <span className="truncate max-w-[90px]">{cardData.phone || 'No Phone'}</span>
                                                         </div>
                                                      </div>
                                                   </div>
                                                ) : (
                                                   /* Horizontal Design (Default) */
                                                   <div className="card-flip-front w-full h-full bg-white relative rounded-[24px] overflow-hidden border border-zinc-200/60 shadow-xl flex flex-col justify-between p-6">
                                                      {/* Bezier Curve Swooshes using Brand Colors */}
                                                      <svg className="absolute bottom-0 right-0 left-0 w-full h-[70px] overflow-hidden pointer-events-none" viewBox="0 0 500 150" preserveAspectRatio="none">
                                                         <path d="M0,80 C150,170 350,20 500,80 L500,150 L0,150 Z" fill={primaryCol} opacity="0.15"></path>
                                                         <path d="M0,100 C150,180 350,50 500,120 L500,150 L0,150 Z" fill={primaryCol} opacity="0.85"></path>
                                                         <path d="M0,120 C180,180 320,100 500,140 L500,150 L0,150 Z" fill={accentCol} opacity="0.75"></path>
                                                      </svg>

                                                      <div className="flex justify-between items-start z-10">
                                                         <span className="px-2.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest bg-zinc-100 border border-zinc-200 text-zinc-600">
                                                            {cardData.isActive !== false ? "Active Member" : "Suspended"}
                                                         </span>
                                                         {logoSrc ? (
                                                            <img src={logoSrc} alt="Company Logo" className="h-6 max-w-[90px] object-contain" />
                                                         ) : (
                                                            <div className="text-right">
                                                               <h4 className="text-[11px] font-black tracking-widest uppercase text-zinc-800">MCB</h4>
                                                               <p className="text-[5px] font-black uppercase text-zinc-400">Ghana</p>
                                                            </div>
                                                         )}
                                                      </div>

                                                      <div className="flex items-center gap-4 z-10 mt-2">
                                                         <div 
                                                            className="w-16 h-16 rounded-2xl flex-shrink-0 bg-zinc-50 border p-1 shadow-sm overflow-hidden" 
                                                            style={{ borderColor: accentCol }}
                                                         >
                                                            {selectedCardEmployee?.profilePhotoUrl ? (
                                                               <img src={selectedCardEmployee.profilePhotoUrl} alt={cardData.fullName} className="w-full h-full object-cover rounded-xl" />
                                                            ) : (
                                                               <div className="w-full h-full bg-zinc-100 rounded-xl flex items-center justify-center font-black text-[15px] text-zinc-500">
                                                                  {cardData.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'CC'}
                                                               </div>
                                                            )}
                                                         </div>
                                                         <div className="min-w-0">
                                                            <h4 className="font-black text-[14px] uppercase truncate tracking-wide text-zinc-900">{cardData.fullName || 'Name Placeholder'}</h4>
                                                            <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: accentCol }}>{cardData.jobTitle || 'Role Title'}</p>
                                                            {cardData.department && <p className="text-[8px] text-zinc-500 font-bold uppercase">{cardData.department}</p>}
                                                         </div>
                                                      </div>

                                                      <div className="flex justify-between items-center z-10 border-t border-zinc-100 pt-2 text-[8px] font-bold text-zinc-500 mt-2">
                                                         <div className="truncate flex items-center gap-1.5 max-w-[48%]">
                                                            <Mail size={10} style={{ color: primaryCol }} /> 
                                                            <span className="truncate">{cardData.email || 'No Email'}</span>
                                                         </div>
                                                         <div className="truncate flex items-center gap-1.5 max-w-[48%]">
                                                            <Phone size={10} style={{ color: primaryCol }} /> 
                                                            <span className="truncate">{cardData.phone || 'No Phone'}</span>
                                                         </div>
                                                      </div>
                                                   </div>
                                                )}

                                                {/* Back Side */}
                                                <div 
                                                   className="card-flip-back w-full h-full relative rounded-[24px] overflow-hidden border shadow-xl flex flex-col items-center justify-between p-6"
                                                   style={{ 
                                                      backgroundColor: primaryCol,
                                                      borderColor: primaryCol + "30"
                                                   }}
                                                >
                                                   <svg className="absolute bottom-0 right-0 left-0 w-full h-[60px] overflow-hidden pointer-events-none" viewBox="0 0 500 150" preserveAspectRatio="none">
                                                      <path d="M0,100 C150,180 350,50 500,120 L500,150 L0,150 Z" fill={accentCol} opacity="0.25"></path>
                                                      <path d="M0,120 C180,180 320,100 500,140 L500,150 L0,150 Z" fill={accentCol} opacity="0.45"></path>
                                                   </svg>

                                                   <div className="flex justify-between items-center w-full z-10">
                                                      <div className="flex items-center gap-1">
                                                         <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                                                         <span className="text-[6px] uppercase font-black tracking-widest text-white/80">NFC Contactless</span>
                                                      </div>
                                                      {logoSrc ? (
                                                         <img src={logoSrc} alt="Company Logo" className="h-5 max-w-[80px] object-contain brightness-0 invert" />
                                                      ) : (
                                                         <h4 className="text-[10px] font-black tracking-widest uppercase text-white">MCB</h4>
                                                      )}
                                                   </div>

                                                   <div className="flex flex-col items-center justify-center my-auto space-y-2 z-10">
                                                      <div className="p-2 bg-white rounded-2xl shadow-inner flex items-center justify-center border border-white/20">
                                                         {(() => {
                                                            const qrValue = cardData.id 
                                                               ? (cardData.id.indexOf("http") === 0 ? cardData.id : window.location.origin + "/shared-card/" + cardData.id)
                                                               : window.location.origin + "/shared-card/preview/" + (selectedCardEmployee?.id || "temp_preview");
                                                            return (
                                                               <QRCodeCanvas 
                                                                  id="card-qr-canvas"
                                                                  value={qrValue}
                                                                  size={75}
                                                                  level="H"
                                                                  includeMargin={true}
                                                               />
                                                            );
                                                         })()}
                                                      </div>
                                                   </div>

                                                   <div className="z-10 text-[7px] font-black tracking-widest uppercase text-white/80 pb-1 flex items-center gap-1.5">
                                                      <QrCode size={10} style={{ color: accentCol }} /> Scan to Connect & Save
                                                   </div>
                                                </div>
                                             </div>
                                          </div>

                                          {/* Hidden High-Resolution QR Canvas for Instant Crisp PNG Download */}
                                          <div style={{ display: 'none' }}>
                                             <QRCodeCanvas
                                                id="card-qr-hidden-canvas"
                                                value={cardData.id 
                                                   ? `${window.location.origin}/shared-card/${cardData.id}`
                                                   : `${window.location.origin}/shared-card/preview/${selectedCardEmployee?.id || 'temp_preview'}`}
                                                size={256}
                                                level="H"
                                                includeMargin={true}
                                             />
                                          </div>
                                          
                                          <p className="text-[9px] font-bold text-[var(--text-muted)] italic flex items-center gap-1.5 justify-center animate-pulse mt-2">
                                             🔄 Click anywhere on the card to flip between Front & Back
                                          </p>

                                          {/* QR Code & Export Card */}
                                          <div className="nx-card p-6 border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col items-center text-center space-y-4 w-full rounded-3xl mt-4">
                                             <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">QR & NFC Assets</h4>
                                             
                                             {(() => {
                                                const hasId = !!cardData.id;
                                                return (
                                                   <div className="space-y-4 flex flex-col items-center w-full">
                                                      <p className="text-[9px] font-bold text-[var(--text-muted)] leading-relaxed max-w-[240px]">
                                                         {hasId 
                                                            ? "Scan this QR to open the mobile-optimized business card in real-time."
                                                            : "Workable preview QR code. Once committed, this points to the hosted profile."}
                                                      </p>

                                                      <div className="flex gap-3 w-full">
                                                         <button 
                                                            type="button"
                                                            onClick={() => {
                                                               const canvas = document.getElementById('card-qr-hidden-canvas') as HTMLCanvasElement;
                                                               if (!canvas) {
                                                                  toast.error("QR Code generator not ready yet. Please try again.");
                                                                  return;
                                                               }
                                                               const url = canvas.toDataURL('image/png');
                                                               const link = document.createElement('a');
                                                               link.href = url;
                                                               link.download = `QR_${(cardData.fullName || 'Employee').replace(/\s+/g, '_')}.png`;
                                                               document.body.appendChild(link);
                                                               link.click();
                                                               document.body.removeChild(link);
                                                               toast.success("Crisp high-resolution QR downloaded!");
                                                            }}
                                                            className="flex-1 h-12 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[9px] font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center justify-center gap-2 hover:bg-[var(--bg-sidebar-active)] transition-all"
                                                         >
                                                            <Download size={12} /> Export QR PNG
                                                         </button>
                                                         
                                                         <Link 
                                                            to={hasId ? `/shared-card/${cardData.id}` : '#'}
                                                            onClick={(e) => {
                                                               if (!hasId) {
                                                                  e.preventDefault();
                                                                  toast.info("Please click 'Commit Card Configurations' first to save and enable live hosting.");
                                                               }
                                                            }}
                                                            target={hasId ? "_blank" : undefined}
                                                            className={cn(
                                                               "flex-1 h-12 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-transform",
                                                               hasId 
                                                                  ? "bg-[var(--primary)] text-white" 
                                                                  : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
                                                            )}
                                                         >
                                                            <Eye size={12} /> View Card
                                                         </Link>
                                                      </div>
                                                   </div>
                                                );
                                             })()}
                                          </div>
                                       </div>
                                    );
                                 })()}
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
