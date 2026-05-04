import React, { useEffect, useState, useCallback } from 'react';
import { toast } from '../utils/toast';
import { 
  Plus, Loader2, Laptop, Smartphone, 
  Monitor, Car, Search, ShieldCheck, Zap, 
  Activity, ChevronRight, Box, UserPlus,
  HardDrive, Trash2, Package
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';
import ConfirmDeleteModal from '../components/common/ConfirmDeleteModal';
import { getStoredUser } from '../utils/session';

const statusBadge: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10',
  ASSIGNED: 'bg-blue-500/5 text-blue-600 border-blue-500/10',
  MAINTENANCE: 'bg-amber-500/5 text-amber-600 border-amber-500/10',
  RETIRED: 'bg-slate-500/5 text-slate-500 border-slate-500/10'
};

const typeIcon: Record<string, React.ElementType> = {
  LAPTOP: Laptop, 
  PHONE: Smartphone, 
  MONITOR: Monitor, 
  VEHICLE: Car,
  DESKTOP: HardDrive,
  TABLET: Smartphone, // Using Smartphone as proxy for tablet or can keep search
  PERIPHERAL: Box,
  OTHER: Package
};

const emptyAsset = {
  name: '', serialNumber: '', type: 'LAPTOP', make: '', model: '',
  description: '', isCompanyProperty: true
};

const AssetManagement = () => {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<any>(null);
  const [form, setForm] = useState(emptyAsset);
  const [assignForm, setAssignForm] = useState({ userId: '', condition: 'Good' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const currentUser = getStoredUser();
  const role = currentUser?.role?.toUpperCase() || 'STAFF';
  // Strict governance: Only MD and IT Manager (or system DEV) can manage inventory
  const isAuthority = ['MD', 'IT_MANAGER', 'DEV'].includes(role);
  const canManage = isAuthority;
  const canDelete = isAuthority;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, eRes] = await Promise.all([api.get('/assets'), api.get('/users')]);
      setAssets(Array.isArray(aRes.data) ? aRes.data : []);
      setEmployees(eRes.data.filter((e: any) => e.status === 'ACTIVE'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = assets.filter(a => `${a.name} ${a.serialNumber} ${a.type} ${a.make} ${a.model}`.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/assets', form);
      setShowCreate(false); setForm(emptyAsset); fetchData();
      toast.success(t('assets.success_sync'));
    } catch (err: any) { setError(err?.response?.data?.message || t('assets.error_init')); }
    finally { setSaving(false); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/assets/assign', { assetId: showAssign.id, ...assignForm });
      setShowAssign(null); setAssignForm({ userId: '', condition: 'Good' }); fetchData();
      toast.success(t('assets.success_deploy'));
    } catch (err: any) { setError(err?.response?.data?.message || t('assets.error_deploy')); }
    finally { setSaving(false); }
  };
  const handleReturn = async (assetId: string) => {
    try {
      await api.post('/assets/return', { assetId, condition: 'Good' });
      fetchData();
      toast.success(t('assets.success_recover'));
    } catch (err: any) { toast.error(String(err?.response?.data?.message || t('assets.error_recover'))); }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/assets/${pendingDelete.id}`);
      setPendingDelete(null);
      fetchData();
      toast.success(t('common.delete_success', 'Asset removed from inventory'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setDeleting(false);
    }
  };

  const stats = {
    total: assets.length,
    available: assets.filter(a => a.status === 'AVAILABLE').length,
    assigned: assets.filter(a => a.status === 'ASSIGNED').length,
    maintenance: assets.filter(a => a.status === 'MAINTENANCE').length,
  };

  return (
    <div className="space-y-12 pb-32">
      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{t('assets.title')}</h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <Package size={18} className="text-[var(--primary)] opacity-60" />
            {t('assets.subtitle')}
          </p>
        </motion.div>

        {canManage && (
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="px-8 h-[52px] rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 flex items-center gap-3" 
            onClick={() => setShowCreate(true)}
          >
            <Plus size={18} /> {t('assets.register_hardware')}
          </motion.button>
        )}
      </div>

      {/* Telemetry Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: t('assets.total_inventory'), value: stats.total, icon: Box, color: 'text-blue-600 bg-blue-500/5' },
          { label: t('assets.operational'), value: stats.available, icon: Zap, color: 'text-emerald-600 bg-emerald-500/5' },
          { label: t('assets.deployed'), value: stats.assigned, icon: ShieldCheck, color: 'text-[var(--primary)] bg-[var(--primary)]/5' },
          { label: t('assets.maintenance'), value: stats.maintenance, icon: Activity, color: 'text-amber-600 bg-amber-500/5' },
        ].map((s, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            key={s.label} 
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

      {/* Resource Ledger */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="nx-card border-[var(--border-subtle)] overflow-hidden flex flex-col min-h-[500px]"
      >
        <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                <Search size={20} />
             </div>
             <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">{t('assets.hardware_manifest')}</h3>
          </div>
          <div className="relative w-full max-w-xs group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
               type="text" 
               className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl pl-12 pr-4 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" 
               placeholder={t('assets.search_placeholder')}
               value={search} 
               onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">{t('assets.loading_telemetry')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar flex-grow">
            <table className="nx-table nexus-responsive-table">
              <thead>
                <tr className="bg-[var(--bg-elevated)]/10">
                   <th className="px-10 py-6">{t('assets.resource_id')}</th>
                   <th className="py-6">{t('assets.classification')}</th>
                   <th className="py-6">{t('assets.serial_registry')}</th>
                   <th className="py-6">{t('assets.operational_state')}</th>
                   <th className="py-6">{t('assets.strategic_assignment')}</th>
                   <th className="px-10 py-6 text-right">{t('assets.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]/30">
                {filtered.map((asset: any, i) => {
                  const Icon = typeIcon[asset.type] || Package;
                  const latestAssignment = asset.assignments?.[0];
                  const assignee = latestAssignment?.user?.fullName;
                  return (
                    <motion.tr 
                       key={asset.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                       className="hover:bg-[var(--bg-elevated)]/30 transition-all group"
                    >
                      <td className="px-10 py-6" data-label={t('assets.resource_id')}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)] text-[var(--primary)] shadow-sm group-hover:scale-105 transition-transform">
                            <Icon size={22} />
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors uppercase tracking-tight">{asset.name}</p>
                            {asset.make && <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest italic">{asset.make} {asset.model}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-6" data-label={t('assets.classification')}>
                         <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">{t(`assets.types.${asset.type}`)}</span>
                      </td>
                      <td className="py-6" data-label={t('assets.serial_registry')}>
                         <span className="font-mono text-[11px] font-bold text-[var(--text-muted)] tracking-wider px-3 py-1 bg-[var(--bg-elevated)]/50 rounded-lg">{asset.serialNumber}</span>
                      </td>
                      <td className="py-6 transition-all" data-label={t('assets.operational_state')}>
                         <span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm", statusBadge[asset.status] || 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]')}>
                            {asset.status}
                         </span>
                      </td>
                      <td className="py-6 text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)] italic" data-label={t('assets.strategic_assignment')}>{assignee || t('assets.decommissioned')}</td>
                      <td className="px-10 py-6 text-right" data-label={t('assets.actions')}>
                        <div className="flex justify-end gap-3 text-[10px] font-black uppercase tracking-widest transition-all">
                          {asset.status === 'AVAILABLE' && canManage && (
                            <motion.button 
                               whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                               onClick={() => { setShowAssign(asset); setError(''); }} 
                               className="px-6 h-10 rounded-xl bg-[var(--primary)] text-white shadow-xl shadow-[var(--primary)]/20"
                            >
                               {t('assets.deploy')}
                            </motion.button>
                          )}
                          {asset.status === 'ASSIGNED' && canManage && (
                            <motion.button 
                               whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                               onClick={() => handleReturn(asset.id)} 
                               className="px-6 h-10 rounded-xl bg-[var(--bg-elevated)] text-amber-600 border border-amber-500/20"
                            >
                               {t('assets.recover')}
                            </motion.button>
                          )}
                          {canDelete && (
                            <motion.button 
                               type="button"
                               whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                               onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingDelete(asset); }} 
                               className="w-10 h-10 rounded-xl bg-rose-500/5 text-rose-500/40 border border-rose-500/10 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all"
                            >
                               <Trash2 size={16} />
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-40 text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30 italic">{t('assets.no_assets')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Registry Modals */}
      <AnimatePresence>
        {showCreate && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="absolute inset-0 bg-[var(--bg-main)]/80 backdrop-blur-xl" />
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                  className="nx-card w-full max-w-2xl bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl p-12 relative max-h-[90vh]"
               >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 blur-[40px] rounded-full" />
                 <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-10 border-b border-[var(--border-subtle)] pb-8">{t('assets.sync_hardware')}</h2>
                 
                 <div className="overflow-y-auto custom-scrollbar flex-grow space-y-10 py-2">
                    {error && <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest">{error}</div>}
                    
                    <form id="create-asset-form" onSubmit={handleCreate} className="space-y-10">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {[
                             { k: 'name', l: t('assets.machine_identity') + ' *' }, 
                             { k: 'serialNumber', l: t('assets.serial_node') + ' *' }, 
                             { k: 'make', l: t('assets.manufacturer') }, 
                             { k: 'model', l: t('assets.hardware_model') }
                          ].map(({ k, l }) => (
                             <div key={k} className="space-y-3">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{l}</label>
                                <input type="text" className="nx-input" value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} required={l.includes('*')} />
                             </div>
                          ))}
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('assets.classification')}</label>
                             <div className="relative group">
                                <select className="nx-input appearance-none bg-[var(--bg-elevated)]/50" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                   {['LAPTOP','DESKTOP','MONITOR','PHONE','TABLET','VEHICLE','PERIPHERAL','OTHER'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronRight size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] rotate-90 pointer-events-none" />
                             </div>
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('assets.condition_protocol')}</label>
                             <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)]">
                                <ShieldCheck className="text-[var(--primary)]" size={18} />
                                <span className="text-[11px] font-bold text-[var(--text-primary)]">{t('assets.system_ready')}</span>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('assets.technical_dossier')}</label>
                          <textarea className="nx-input min-h-[140px] py-4" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('assets.dossier_placeholder')} />
                       </div>
                    </form>
                 </div>
                 
                 <div className="flex gap-6 pt-10 border-t border-[var(--border-subtle)]/30">
                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-14 rounded-2xl border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all">{t('assets.abort')}</button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} form="create-asset-form" type="submit" className="flex-[2] h-14 rounded-2xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-[var(--primary)]/30 flex items-center justify-center gap-4 transition-all" disabled={saving}>
                       {saving ? <Loader2 size={18} className="animate-spin" /> : <Package size={18} />}
                       {saving ? t('assets.syncing') : t('assets.sync_node')}
                    </motion.button>
                 </div>
               </motion.div>
             </div>
        )}

        {showAssign && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssign(null)} className="absolute inset-0 bg-[var(--bg-main)]/80 backdrop-blur-xl" />
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                  className="nx-card w-full max-w-lg bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl p-12 relative"
               >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 blur-[40px] rounded-full" />
                 <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-10 border-b border-[var(--border-subtle)] pb-8">{t('assets.deploy_resource')}</h2>
                 
                 <div className="space-y-10">
                    <div className="p-6 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] space-y-3 relative group overflow-hidden">
                       <div className="absolute -right-6 -bottom-6 text-[var(--primary)] opacity-10 group-hover:scale-110 transition-transform">
                          {React.createElement(typeIcon[showAssign.type] || Package, { size: 100 })}
                       </div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">{t('assets.node_ident')}</p>
                       <p className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight leading-none">{showAssign.name}</p>
                       <p className="text-[11px] font-mono tracking-[0.2em] text-[var(--text-muted)]">{t('assets.sn_node')}: {showAssign.serialNumber}</p>
                    </div>
                    
                    {error && <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest">{error}</div>}
                    
                    <form onSubmit={handleAssign} className="space-y-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('assets.assignee_personnel')} *</label>
                         <div className="relative group">
                            <select className="nx-input appearance-none bg-[var(--bg-elevated)]/50 pr-12 font-bold" required value={assignForm.userId} onChange={e => setAssignForm({ ...assignForm, userId: e.target.value })}>
                               <option value="">{t('assets.awaiting_selection')}</option>
                               {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} · {e.jobTitle}</option>)}
                            </select>
                            <UserPlus size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                         </div>
                      </div>

                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('assets.operational_state_label')}</label>
                          <div className="relative group">
                             <select className="nx-input appearance-none bg-[var(--bg-elevated)]/50 pr-12 font-bold" value={assignForm.condition} onChange={e => setAssignForm({ ...assignForm, condition: e.target.value })}>
                                {['New', 'Excellent', 'Good', 'Fair', 'Poor'].map(c => <option key={c} value={c}>{t(`assets.conditions.${c}`)}</option>)}
                             </select>
                             <ChevronRight size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] rotate-90 pointer-events-none" />
                          </div>
                       </div>
                      
                      <div className="flex gap-6 pt-10 border-t border-[var(--border-subtle)]/30">
                         <button type="button" onClick={() => setShowAssign(null)} className="flex-1 h-14 rounded-2xl border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all">{t('assets.abort')}</button>
                         <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="flex-[2] h-14 rounded-2xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-[var(--primary)]/30 flex items-center justify-center gap-4 transition-all" disabled={saving}>
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                            {saving ? t('assets.processing') : t('assets.deploy_node')}
                         </motion.button>
                      </div>
                    </form>
                 </div>
               </motion.div>
             </div>
        )}
      </AnimatePresence>
      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        itemName={`${pendingDelete?.make} ${pendingDelete?.model} (${pendingDelete?.serialNumber})`}
        loading={deleting}
      />
    </div>
  );
};

export default AssetManagement;
