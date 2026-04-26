import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from '../utils/toast';
import { 
  Users, Package, Plus, RotateCcw, Shield, 
  Search, Loader2, AlertTriangle, 
  ShieldCheck, Zap, Activity,
  Database, Key, Lock, Server, Cpu, ArrowRight, ArrowLeft
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';

const roleLabel: Record<string, string> = {
  DEV: 'Sys Developer (L100)', MD: 'Managing Director (L90)', DIRECTOR: 'Director (L80)',
  HR_OFFICER: 'HR Officer (L85)', IT_MANAGER: 'IT Manager (L85)',
  MANAGER: 'Global Manager (L70)', SUPERVISOR: 'Supervisor (L60)', STAFF: 'Personnel (L40)', CASUAL: 'Adjunct (L30)'
};

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10',
  PROBATION: 'bg-amber-500/5 text-amber-600 border-amber-500/10',
  NOTICE_PERIOD: 'bg-indigo-500/5 text-indigo-600 border-indigo-500/10',
  TERMINATED: 'bg-rose-500/5 text-rose-600 border-rose-500/10'
};

const emptyForm = {
  fullName: '', email: '', role: 'STAFF', department: '', jobTitle: '',
  employeeCode: '', password: '', joinDate: '', employmentType: 'Permanent',
  gender: '', contactNumber: '', supervisorId: ''
};

const ITAdmin = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'assets' | 'integrations'>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, uRes] = await Promise.all([api.get('/it/overview'), api.get('/it/users')]);
      setOverview(oRes.data || null);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);


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
    <div className="space-y-12 pb-32">
      {/* Navigation Return */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-3 px-6 py-3 bg-[var(--bg-card)] hover:bg-[var(--bg-sidebar-active)] border border-[var(--border-subtle)] rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all shadow-sm"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Overview
        </button>
      </div>

      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tighter uppercase italic">
            Identity & System Audit
          </h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--primary)] opacity-60" />
            Audit organization workforce nodes and maintain system identity integrity.
          </p>
        </motion.div>

          <div className="flex bg-[var(--bg-elevated)]/50 p-1.5 rounded-2xl border border-[var(--border-subtle)]">
             {(['overview', 'accounts', 'assets', 'integrations'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                   className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                   activeTab === tab ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                  {tab === 'overview' ? 'Network' : tab === 'accounts' ? 'Personnel' : tab === 'assets' ? 'Hardware' : 'Integrations'}
                </button>
             ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-40 flex flex-col items-center gap-6">
                <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Accessing Identity Grid</p>
             </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
            {activeTab === 'overview' && overview && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                      { label: 'Total Staff', value: overview.totalUsers, icon: Users, color: 'text-[var(--primary)] bg-[var(--primary)]/5' },
                      { label: 'Active Identity', value: overview.activeUsers, icon: Zap, color: 'text-[var(--success)] bg-[var(--success)]/5' },
                      { label: 'Inventory', value: overview.assets, icon: Package, color: 'text-[var(--info)] bg-[var(--info)]/5' },
                      { label: 'Unassigned Assets', value: overview.availableAssets, icon: Cpu, color: 'text-[var(--warning)] bg-[var(--warning)]/5' },
                    ].map((s, idx) => (
                      <motion.div 
                        key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                        className="nx-card p-8 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] relative overflow-hidden group"
                      >
                         <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[var(--primary)]/5 blur-[40px] group-hover:scale-125 transition-transform" />
                         <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-[var(--border-subtle)]/50 shadow-sm", s.color)}>
                             <s.icon size={20} />
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-60">{s.label}</p>
                         <h4 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">{s.value}</h4>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="nx-card p-8 border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 relative overflow-hidden group">
                       <div className="flex items-center justify-between mb-8">
                         <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] flex items-center gap-3">
                           <Database className="text-blue-500" size={16} /> Cloud Vault Security
                         </h3>
                         <span className={cn(
                           "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                           overview.vaultStatus?.status === 'Healthy' ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/10" : "bg-rose-500/5 text-rose-500 border-rose-500/10"
                         )}>
                           {overview.vaultStatus?.status || 'Unknown'}
                         </span>
                       </div>
                       
                       <div className="space-y-6">
                         <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                           <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest group-hover:text-[var(--primary)] transition-colors">Encryption State</span>
                           <span className="text-[12px] font-black text-[var(--text-primary)]">{overview.vaultStatus?.status === 'Healthy' ? 'ACTIVE' : 'OFFLINE'}</span>
                         </div>
                         <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                           <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest group-hover:text-[var(--primary)] transition-colors">Security Keys</span>
                           <span className="text-[12px] font-black text-[var(--text-primary)]">{overview.vaultStatus?.status === 'Disconnected' ? 'MISSING' : 'SECURED'}</span>
                         </div>
                         {overview.vaultStatus?.message && (
                           <p className="text-[10px] text-rose-500 font-bold italic pt-2">! {overview.vaultStatus.message}</p>
                         )}
                       </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="nx-card p-8 border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 relative overflow-hidden group">
                       <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] flex items-center gap-3 mb-8">
                         <Cpu className="text-amber-500" size={16} /> Operations Heartbeat
                       </h3>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                           <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Infrastructure</p>
                           <p className="text-[14px] font-black text-[var(--text-primary)]">Node {overview.systemHealth?.nodeVersion}</p>
                         </div>
                         <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                           <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Database</p>
                           <p className="text-[14px] font-black text-emerald-500">OPTIMAL</p>
                         </div>
                         <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] col-span-2">
                           <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Architecture</p>
                           <p className="text-[12px] font-black text-[var(--text-primary)]">{overview.systemHealth?.platform?.toUpperCase()} · Running for {Math.floor(overview.systemHealth?.uptime / 3600)} hours</p>
                         </div>
                       </div>
                    </motion.div>
                  </div>

                  <div className="nx-card border-[var(--border-subtle)] overflow-hidden">
                    <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 flex items-center justify-between">
                       <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] flex items-center gap-3">
                          <Activity className="text-indigo-500" size={16} /> Recently Added Personnel
                       </h3>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="nx-table nexus-responsive-table">
                           <thead>
                              <tr className="bg-[var(--bg-elevated)]/10">
                                 <th className="px-10 py-6">Staff Name</th>
                                 <th className="py-6">Access Level</th>
                                 <th className="py-6">Current Status</th>
                                 <th className="px-10 py-6 text-right">Deployment Date</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-[var(--border-subtle)]/30">
                              {overview.recentAccounts?.map((u: any, i: number) => (
                                 <motion.tr key={u.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity:1, x: 0 }} transition={{ delay: i*0.02 }} className="hover:bg-[var(--bg-elevated)]/30 transition-all group text-left">
                                    <td className="px-10 py-6">
                                       <div>
                                          <p className="text-[13px] font-black text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors uppercase">{u.fullName}</p>
                                          <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mt-1 italic">{u.email}</p>
                                       </div>
                                    </td>
                                    <td className="py-6"><span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">{roleLabel[u.role] || u.role}</span></td>
                                    <td className="py-6"><span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm", statusBadge[u.status] || 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]')}>{u.status}</span></td>
                                    <td className="px-10 py-6 text-right font-mono text-[11px] font-bold text-[var(--text-muted)] tracking-wider">{new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                                 </motion.tr>
                              ))}
                           </tbody>
                        </table>
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
                         <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Personnel Registry</h3>
                      </div>
                      <div className="relative w-full max-w-sm group">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                        <input 
                           type="text" 
                           className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl pl-12 pr-4 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" 
                           placeholder="Search registry..." 
                           value={search} 
                           onChange={e => setSearch(e.target.value)} 
                        />
                      </div>
                   </div>

                   <div className="overflow-x-auto custom-scrollbar flex-grow">
                      <table className="nx-table nexus-responsive-table">
                         <thead>
                            <tr className="bg-[var(--bg-elevated)]/10">
                               <th className="px-10 py-6">Staff Name</th>
                               <th className="py-6">Access Level</th>
                               <th className="py-6">Status</th>
                               <th className="py-6">Strategic Unit</th>
                               <th className="px-10 py-6 text-right">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-[var(--border-subtle)]/30">
                            {filtered.map((u: any, i: number) => (
                               <motion.tr key={u.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*0.02 }} className="hover:bg-[var(--bg-elevated)]/30 transition-all group text-left">
                                  <td className="px-10 py-6">
                                     <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-black text-sm shadow-xl group-hover:scale-105 transition-transform">
                                           {u.fullName[0]}
                                        </div>
                                        <div>
                                           <p className="text-[13px] font-black text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors uppercase">{u.fullName}</p>
                                           <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mt-1 italic">{u.email}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="py-6"><span className="px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-[var(--bg-elevated)] text-[var(--primary)] border border-[var(--primary)]/20 shadow-sm">{roleLabel[u.role] || u.role}</span></td>
                                  <td className="py-6"><span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm", statusBadge[u.status] || 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]')}>{u.status}</span></td>
                                  <td className="py-6 text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)] italic">{u.departmentObj?.name || 'CENTRAL_HUB'}</td>
                                  <td className="px-10 py-6 text-right">
                                     <div className="flex justify-end gap-3 text-[10px] font-black uppercase tracking-widest transition-all">
                                        <motion.button 
                                           whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                           onClick={() => handlePasswordReset(u.id, u.fullName)}
                                           disabled={resettingId === u.id}
                                           className="px-6 h-10 rounded-xl bg-indigo-500/5 text-indigo-600 border border-indigo-500/20 flex items-center gap-3 active:bg-indigo-500 active:text-white transition-all"
                                        >
                                           {resettingId === u.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                           Reset Access
                                        </motion.button>
                                        {u.status === 'ACTIVE' && (
                                           <motion.button 
                                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                              onClick={() => handleDeactivate(u.id, u.fullName)}
                                              className="px-6 h-10 rounded-xl bg-rose-500/5 text-rose-600 border border-rose-500/20 flex items-center gap-3 active:bg-rose-500 active:text-white transition-all"
                                           >
                                              <Lock size={14} /> Deactivate
                                           </motion.button>
                                        )}
                                     </div>
                                  </td>
                                </motion.tr>
                            ))}
                            {filtered.length === 0 && (
                               <tr><td colSpan={5} className="py-40 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30 italic">No identity nodes detected in registry</td></tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>
            )}

            {activeTab === 'assets' && (
                 <div className="nx-card p-24 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] text-center relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-1/2 h-full bg-[var(--primary)]/5 blur-[120px] pointer-events-none" />
                   <Server size={80} className="mx-auto mb-10 text-[var(--primary)] opacity-20 group-hover:scale-110 transition-transform duration-700" />
                   <h3 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-4">Hardware Management</h3>
                   <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-12 max-w-sm mx-auto opacity-60">Manage company laptops, biometric devices, and server hardware.</p>
                   <Link to="/assets" className="inline-flex items-center gap-4 px-10 h-14 rounded-2xl bg-[var(--primary)] text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 hover:gap-6 transition-all">
                      Go to Hardware Hub <ArrowRight size={18} />
                   </Link>
                 </div>
            )}

            {activeTab === 'integrations' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 space-y-10">
                        <div className="nx-card p-10 border-[var(--border-subtle)] bg-[var(--bg-card)]">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                    <Server size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">Company Email Integration</h3>
                                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">SMTP Gateway Configuration Guide</p>
                                </div>
                            </div>

                            <div className="space-y-12">
                                <div className="flex gap-8 relative">
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-black text-sm relative z-10">1</div>
                                        <div className="w-0.5 flex-1 bg-[var(--border-subtle)] my-2" />
                                    </div>
                                    <div className="flex-1 pb-10">
                                        <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-3">SMTP Infrastructure Preparation</h4>
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6">Gather your corporate mail server credentials. If using Microsoft 365 or Google Workspace, we recommend creating a dedicated "App Password" or a Service Account for maximum security.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                                                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">TLS Port</p>
                                                <p className="text-xs font-black text-[var(--text-primary)]">587 (Recommended)</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                                                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">SSL Port</p>
                                                <p className="text-xs font-black text-[var(--text-primary)]">465</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-8 relative">
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-black text-sm relative z-10">2</div>
                                        <div className="w-0.5 flex-1 bg-[var(--border-subtle)] my-2" />
                                    </div>
                                    <div className="flex-1 pb-10">
                                        <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-3">Deployment in Settings</h4>
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Navigate to <Link to="/settings" className="text-[var(--primary)] font-bold hover:underline">Admin Settings</Link>. Locate the "Email & SMTP" section. Input your host (e.g., smtp.office365.com), user credentials, and the preferred 'From' address that staff will see in their inboxes.</p>
                                    </div>
                                </div>

                                <div className="flex gap-8">
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm relative z-10">3</div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-3">Diagnostic Validation</h4>
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">After saving, click "Test Connection" to fire a test packet to your administrative email. Once successful, all system notifications (Payslips, Leave Approvals, Appraisals) will flow through your company domain.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-8">
                        <div className="nx-card p-8 bg-[var(--primary)] text-[var(--text-inverse)] border-none relative overflow-hidden shadow-2xl shadow-[var(--primary)]/30">
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                            <Shield className="mb-6 opacity-40" size={32} />
                            <h4 className="text-lg font-black uppercase tracking-tight mb-4">API Node Status</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-white/10">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Auth Engine</span>
                                    <span className="text-xs font-black">ENCRYPTED</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-white/10">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Mail Relay</span>
                                    <span className="text-xs font-black">ACTIVE</span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Webhooks</span>
                                    <span className="text-xs font-black">LISTENING</span>
                                </div>
                            </div>
                        </div>

                        <div className="nx-card p-8 border-[var(--border-subtle)] bg-[var(--bg-card)]">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                    <Fingerprint size={20} />
                                </div>
                                <h4 className="text-sm font-black uppercase tracking-tight text-[var(--text-primary)]">Biometric Sync</h4>
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mb-6">
                                Connect ZKTeco or Hikvision devices to the central attendance node.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--text-muted)]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" /> Port 4370 (UDP) Open
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--text-muted)]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" /> Static IP Assigned
                                </div>
                            </div>
                        </div>

                        <div className="nx-card p-8 border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20">
                            <div className="flex items-center gap-3 mb-6">
                                <Activity size={18} className="text-amber-500" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">System Logs</h4>
                            </div>
                            <div className="space-y-4">
                                <p className="text-[10px] text-[var(--text-secondary)] italic leading-relaxed">Identity Hub is currently operating at peak performance with zero reported latency on authentication nodes.</p>
                                <button onClick={() => navigate('/audit')} className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-all">
                                    View full audit trails <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ITAdmin;
