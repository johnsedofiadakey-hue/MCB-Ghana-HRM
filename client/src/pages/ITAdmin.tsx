import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from '../utils/toast';
import { 
  Users, Package, Plus, RotateCcw, Shield, 
  Search, Loader2, AlertTriangle, 
  ShieldCheck, Zap, Activity, Fingerprint,
  Database, Key, Lock, Server, Cpu, ArrowRight, ArrowLeft
} from 'lucide-react';
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
  ACTIVE: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10',
  PROBATION: 'bg-amber-500/5 text-amber-600 border-amber-500/10',
  NOTICE_PERIOD: 'bg-indigo-500/5 text-indigo-600 border-indigo-500/10',
  TERMINATED: 'bg-rose-500/5 text-rose-600 border-rose-500/10'
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
  const currentUser = getStoredUser();
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'assets' | 'integrations'>(
    (currentUser?.rank || 0) >= 85 ? 'accounts' : 'overview'
  );

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showIdModal, setShowIdModal] = useState(false);
  const [orgSettings, setOrgSettings] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, uRes, sRes] = await Promise.all([
        api.get('/it/overview'), 
        api.get('/it/users'),
        api.get('/settings')
      ]);
      setOverview(oRes.data || null);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      setOrgSettings(sRes.data || null);
      
      console.log('[ITAdmin] Active Org Context:', sRes.data?.organizationId || 'default');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
    <div className="space-y-12 pb-32">
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
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tighter uppercase italic">
            {currentUser?.rank >= 85 ? 'Strategic Systems Hub' : 'IT Infrastructure Admin'}
          </h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--primary)] opacity-60" />
            Managing identity nodes and technical infrastructure for {orgSettings?.companyName || 'the institution'}.
          </p>
        </motion.div>

        <div className="flex bg-[var(--bg-elevated)]/50 p-1.5 rounded-2xl border border-[var(--border-subtle)]">
           {(['overview', 'accounts', 'assets', 'integrations'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                 className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 activeTab === tab ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                {tab === 'overview' ? 'Overview' : tab === 'accounts' ? 'ID Registry' : tab === 'assets' ? 'Infrastructure' : 'Integrations'}
              </button>
           ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
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
                               { label: 'DB Engine', value: overview.systemHealth?.dbConnectivity ? 'READY' : 'DEGRADED', color: 'text-emerald-500' },
                               { label: 'Sync State', value: overview.systemHealth?.syncState || 'STABLE', color: 'text-emerald-500' },
                               { label: 'Uptime', value: `${Math.floor(overview.systemHealth?.uptime / 3600)}h Active`, color: 'text-[var(--text-primary)]' }
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
                                        {(currentUser?.role === 'IT_MANAGER' || currentUser?.role === 'IT_ADMIN' || currentUser?.role === 'DEV') && (
                                           <button onClick={() => handlePrintId(u)} className="p-2.5 rounded-xl bg-[var(--primary)]/5 text-[var(--primary)] border border-[var(--primary)]/10 hover:bg-[var(--primary)] hover:text-white transition-all"><Key size={14} /></button>
                                        )}
                                        <button onClick={() => handlePasswordReset(u.id, u.fullName)} className="p-2.5 rounded-xl bg-indigo-500/5 text-indigo-600 border border-indigo-500/10 hover:bg-indigo-600 hover:text-white transition-all"><RotateCcw size={14} /></button>
                                     </div>
                                  </td>
                                </tr>
                            ))}
                         </tbody>
                      </table>
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
                                   <div className={cn("w-2 h-2 rounded-full", n.status === 'AVAILABLE' || n.status === 'ACTIVE' ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
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
                          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600"><Server size={28} /></div>
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
