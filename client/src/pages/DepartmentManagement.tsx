import React, { useEffect, useState } from 'react';
import { Building2, Plus, X, Loader2, Users, Edit2, ShieldCheck, Trash2, ChevronDown } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { getRoleRankValue, getStoredUser } from '../utils/session';
import { useTranslation } from 'react-i18next';
import ConfirmDeleteModal from '../components/common/ConfirmDeleteModal';
import { toast } from '../utils/toast';

const DepartmentManagement = () => {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [managingMembers, setManagingMembers] = useState<any>(null);
  const [managingSubUnits, setManagingSubUnits] = useState<any>(null);
  const [subUnits, setSubUnits] = useState<any[]>([]); // Keep it as it might be used by SubUnitModal eventually
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ name: '', managerId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [targetItemToDelete, setTargetItemToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const currentUser = getStoredUser();
  const rank = getRoleRankValue(currentUser.role);
  const canDelete = rank >= 80;
  const canManageDept = rank >= 75;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dRes, eRes, sRes] = await Promise.all([
        api.get('/departments'), 
        api.get('/users'),
        api.get('/sub-units')
      ]);
      setDepartments(Array.isArray(dRes.data) ? dRes.data : []);
      setEmployees(eRes.data || []);
      setSubUnits(Array.isArray(sRes.data) ? sRes.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', managerId: '' }); setError(''); setShowModal(true); };
  const openEdit = (dept: any) => { setEditing(dept); setForm({ name: dept.name, managerId: dept.managerId || '' }); setError(''); setShowModal(true); };

  const handleConfirmDelete = async () => {
    if (!targetItemToDelete || !targetItemToDelete.id) return;
    
    setDeleting(true);
    try {
      if (targetItemToDelete.type === 'SUB_UNIT') {
        await api.delete(`/sub-units/${targetItemToDelete.id}`);
        fetchData();
        toast.success(t('common.delete_success', 'Sub-unit deleted successfully'));
      } else {
        await api.delete(`/departments/${targetItemToDelete.id}`);
        fetchData();
        toast.success(t('common.delete_success', 'Department deleted successfully'));
      }
      setTargetItemToDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('common.error'));
    } finally {
      setDeleting(false);
    }
  };

  const handleTransfer = async (userId: string, deptId: number | null) => {
    try {
      await api.patch(`/users/${userId}`, { departmentId: deptId });
      fetchData();
    } catch (err: any) {
      alert(t('common.error'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) {
        await api.put(`/departments/${editing.id}`, form);
      } else {
        await api.post('/departments', form);
      }
      setShowModal(false); fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('common.error'));
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-8 page-enter min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">
            {rank < 70 ? t('common.my_department', 'My Department') : t('departments.title')}
          </h1>
          <p className="text-[14px] font-medium text-[var(--text-secondary)] mt-2 flex items-center gap-2">
            <Building2 size={14} className="text-[var(--primary)]" />
            {departments.length} {t('department_details.active_count', 'Active Departments')}
          </p>
        </div>
        {canManageDept && (
          <button
            className="btn-primary flex items-center gap-2"
            onClick={openCreate}
          >
            <Plus size={18} /> {t('departments.add_new')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-[12px] font-medium text-[var(--text-muted)]">{t('common.loading')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {departments
              .filter((dept: any) => rank >= 70 || dept.id === currentUser.departmentId)
              .map((dept: any, idx) => (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="nx-card p-6 group h-full"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)] text-[var(--primary)] group-hover:border-[var(--primary)]/30 transition-colors">
                    <Building2 size={24} />
                  </div>
                  <div className="flex gap-2">
                    {canManageDept && (
                      <button
                        onClick={() => openEdit(dept)}
                        className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all hover:border-[var(--primary)]/30"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTargetItemToDelete(dept); }}
                        className="w-8 h-8 rounded-lg bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500/50 hover:text-rose-500 transition-all hover:bg-rose-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight mb-6">{dept.name}</h3>

                <div className="space-y-4">
                  {dept.manager ? (
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] group-hover:border-[var(--primary)]/30 transition-all shadow-sm">
                      <div className="relative">
                        {dept.manager.avatarUrl ? (
                          <img src={dept.manager.avatarUrl} alt={dept.manager.fullName} className="w-12 h-12 rounded-xl object-cover ring-2 ring-[var(--primary)]/20" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white flex items-center justify-center text-sm font-black shadow-lg shadow-[var(--primary)]/20">
                            {dept?.manager?.fullName?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[var(--bg-card)] shadow-sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--primary)] mb-0.5 opacity-80">{t('common.manager')}</p>
                        <p className="text-[14px] font-black text-[var(--text-primary)] truncate">{dept.manager.fullName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] font-bold text-[var(--text-muted)] truncate uppercase tracking-wider">{dept.manager.jobTitle || 'Head of Department'}</p>
                          {departments.filter((d: any) => d.managerId === dept.managerId).length > 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] text-[8px] font-black uppercase tracking-tighter shadow-sm border border-[var(--primary)]/10">Multi-Dept</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-600/70">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <ShieldCheck size={20} className="opacity-50" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] opacity-80 mb-0.5">{t('department_details.no_manager')}</p>
                        <p className="text-[11px] font-bold">{t('department_details.assign_prompt', 'Leader Assignment Pending')}</p>
                      </div>
                    </div>
                  )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-subtle)] group-hover:border-[var(--primary)]/30 transition-all">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] min-w-0">
                      <Users size={14} className="text-[var(--primary)] shrink-0" />
                      <span className="truncate">{dept.memberCount || 0} {t('department_details.members', t('DEPARTMENTS.MEMBERS', 'Staff'))}</span>
                    </div>
                    {rank >= 70 && (
                      <div className="flex gap-4 shrink-0">
                        <button
                          onClick={() => setManagingSubUnits(dept)}
                          className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] hover:underline whitespace-nowrap"
                        >
                          {t('department_details.sub_units', t('departments.sub_units', 'Sub-Units'))}
                        </button>
                        <button
                          onClick={() => setManagingMembers(dept)}
                          className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] hover:underline whitespace-nowrap"
                        >
                          {t('department_details.team', 'Team')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {departments.length === 0 && (
            <div className="col-span-full text-center py-20 nx-card border-dashed">
              <Building2 size={40} className="mx-auto mb-4 text-[var(--text-muted)] opacity-20" />
              <p className="text-lg font-bold text-[var(--text-primary)]">{t('department_details.no_found')}</p>
              <p className="text-[13px] text-[var(--text-secondary)]">{t('department_details.start_creating')}</p>
            </div>
          )}
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="nx-card w-full max-w-lg bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl shadow-black/20"
            >
              <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {editing ? t('departments.edit_dept') : t('departments.create_dept')}
                  </h2>
                  <p className="text-[12px] font-medium text-[var(--text-muted)] mt-0.5">{t('departments.create_dept_tip') || 'Define department name and leadership'}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={16} /></button>
              </div>

              <div className="p-8 space-y-6">
                {error && <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[12px] font-bold uppercase tracking-wider">{error}</div>}
                <form id="dept-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">{t('departments.dept_name')} *</label>
                    <input type="text" className="nx-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engineering" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">{t('departments.assign_manager')}</label>
                    <div className="relative">
                      <select className="nx-input appearance-none pr-10" value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })}>
                        <option value="">-- {t('departments.no_manager')} --</option>
                        {employees.filter(e => getRoleRankValue(e.role) >= 70).map(e => {
                          const managingCount = departments.filter((d: any) => d.managerId === e.id).length;
                          return (
                            <option key={e.id} value={e.id}>
                              {e.fullName} / {e.jobTitle} {managingCount > 0 ? `(Manages ${managingCount} Depts)` : ''}
                            </option>
                          );
                        })}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">{t('common.cancel')}</button>
                <button form="dept-form" type="submit" className="btn-primary min-w-[120px]" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  <span>{saving ? t('common.saving') || 'Saving...' : t('common.save')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage Members Modal */}
      <AnimatePresence>
        {managingMembers && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setManagingMembers(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="nx-card w-full max-w-5xl max-h-[85vh] bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl shadow-black/30"
            >
              <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 flex justify-between items-center text-[var(--text-primary)]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)] text-[var(--primary)]">
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight truncate">{t('department_details.manage_team')}: {managingMembers.name}</h2>
                    <p className="text-[12px] font-medium text-[var(--text-muted)] mt-0.5">{managingMembers.memberCount || 0} {t('department_details.members')}</p>
                  </div>
                </div>
                <button onClick={() => setManagingMembers(null)} className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={16} /></button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                <div className="w-1/2 p-8 border-r border-[var(--border-subtle)] flex flex-col gap-6">
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] mb-4 ml-1">{t('department_details.add_members')}</h4>
                    <input 
                      type="text" 
                      className="nx-input" 
                      placeholder={t('department_details.search_employees')}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                     {employees
                      .filter(e => e?.departmentId !== managingMembers?.id && e?.fullName?.toLowerCase().includes(searchTerm?.toLowerCase() || ''))
                      .map(emp => (
                        <div key={emp.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[var(--growth)]/10 text-[var(--growth-light)] flex items-center justify-center text-[11px] font-bold">
                              {emp?.fullName?.charAt(0) || emp?.id?.slice(0, 1) || '?'}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-[var(--text-primary)]">{emp.fullName}</p>
                              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{emp.jobTitle}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleTransfer(emp.id, managingMembers.id)}
                            className="w-8 h-8 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="w-1/2 p-8 flex flex-col gap-6 bg-[var(--bg-elevated)]/20">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 ml-1">{t('department_details.current_team')}</h4>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {employees
                      .filter(e => e.departmentId === managingMembers.id)
                      .map(emp => (
                        <div key={emp.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--primary)]/20 group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-[11px] font-bold">
                              {emp?.fullName?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-[var(--text-primary)]">{emp.fullName}</p>
                              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{emp.jobTitle}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleTransfer(emp.id, null)}
                            className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage Sub-Units Modal */}
      <AnimatePresence>
        {managingSubUnits && (
          <SubUnitModal 
            department={managingSubUnits}
            subUnits={subUnits.filter(su => su.departmentId === managingSubUnits.id)}
            employees={employees}
            onClose={() => setManagingSubUnits(null)}
            onRefresh={fetchData}
            setTargetItemToDelete={setTargetItemToDelete}
          />
        )}
      </AnimatePresence>

      {targetItemToDelete && (
        <ConfirmDeleteModal
          isOpen={!!targetItemToDelete}
          onClose={() => setTargetItemToDelete(null)}
          onConfirm={handleConfirmDelete}
          title={targetItemToDelete.type === 'SUB_UNIT' ? t('departments.delete_subunit_title', 'Delete Sub-Unit') : t('departments.delete_title', 'Delete Department')}
          description={targetItemToDelete.type === 'SUB_UNIT' ? t('departments.delete_subunit_confirm', 'Are you sure? This will remove the sub-unit from the organization.') : t('departments.delete_confirm', 'Are you sure? This will permanently delete the department and all its associations.')}
          loading={deleting}
        />
      )}
    </div>
  );
};

const SubUnitModal = ({ department, subUnits, employees, onClose, onRefresh, setTargetItemToDelete }: any) => {
  const { t } = useTranslation();
  const [localSubUnits, setLocalSubUnits] = useState(subUnits);
  const [editingSU, setEditingSU] = useState<any>(null);
  const [form, setForm] = useState({ name: '', managerId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/sub-units', { ...form, departmentId: department.id });
      setForm({ name: '', managerId: '' });
      onRefresh();
      // Refetch local
      const res = await api.get('/sub-units', { params: { departmentId: department.id } });
      setLocalSubUnits(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || t('common.error'));
    } finally { setSaving(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.patch(`/sub-units/${editingSU.id}`, form);
      setEditingSU(null);
      setForm({ name: '', managerId: '' });
      onRefresh();
      const res = await api.get('/sub-units', { params: { departmentId: department.id } });
      setLocalSubUnits(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || t('common.error'));
    } finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    setTargetItemToDelete({ id, type: 'SUB_UNIT' });
  };

  const startEdit = (su: any) => {
    setEditingSU(su);
    setForm({ name: su.name, managerId: su.managerId || '' });
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="nx-card w-full max-w-5xl max-h-[85vh] bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl shadow-black/30"
      >
        <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 flex justify-between items-center text-[var(--text-primary)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)] text-[var(--primary)]">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {department.name} <span className="text-[var(--primary)]">{t('department_details.sub_units', t('departments.sub_units', 'Sub-Units'))}</span>
              </h2>
              <p className="text-[12px] font-medium text-[var(--text-muted)] mt-0.5">{localSubUnits.length} {t('department_details.org_units', t('departments.org_units', 'Units'))}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={16} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 p-8 border-r border-[var(--border-subtle)] overflow-y-auto custom-scrollbar space-y-3">
            {localSubUnits.map((su: any) => (
              <div key={su.id} className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] group hover:border-[var(--primary)]/30 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-[var(--text-primary)]">{su.name}</h4>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => startEdit(su)} className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)]"><Edit2 size={12} /></button>
                    <button onClick={() => handleDelete(su.id)} className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] hover:text-rose-500"><Trash2 size={12} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <div className="px-2 py-0.5 rounded-lg bg-[var(--primary)]/5 text-[var(--primary)] border border-[var(--primary)]/10">
                    {su.memberCount} {t('department_details.members').toUpperCase()}
                  </div>
                  {su.manager && <span className="opacity-60">• {t('common.manager')}: {su.manager.fullName}</span>}
                </div>
              </div>
            ))}
            {localSubUnits.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center text-[var(--text-primary)]">
                <Building2 size={40} className="mb-2" />
                <p className="text-[11px] font-bold uppercase tracking-wider">{t('common.no_data')}</p>
              </div>
            )}
          </div>

          <div className="w-1/2 p-8 bg-[var(--bg-elevated)]/20">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] mb-6 ml-1">
              {editingSU ? t('department_details.edit_unit', 'Edit Unit') : t('department_details.create_unit', t('DEPARTMENTS.CREATE_UNIT', 'Add New Unit'))}
            </h3>
            {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[12px] font-bold">{error}</div>}
            <form onSubmit={editingSU ? handleUpdate : handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">{t('department_details.unit_name', t('DEPARTMENTS.UNIT_NAME', 'Unit Name'))}</label>
                <input type="text" className="nx-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Frontend Team" />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">{t('department_details.unit_manager', t('DEPARTMENTS.UNIT_MANAGER', 'Unit Manager'))}</label>
                <div className="relative">
                  <select className="nx-input appearance-none pr-10" value={form.managerId} onChange={e => setForm({...form, managerId: e.target.value})}>
                    <option value="">-- {t('departments.no_manager')} --</option>
                    {employees.filter((e: any) => e.departmentId === department.id).map((e: any) => (
                      <option key={e.id} value={e.id}>{e.fullName} ({e.jobTitle})</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                {editingSU && (
                  <button type="button" onClick={() => { setEditingSU(null); setForm({name: '', managerId: ''}); }} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">{t('common.cancel')}</button>
                )}
                <button type="submit" disabled={saving} className="btn-primary flex-[2] min-h-[44px]">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  <span>{saving ? t('common.saving') || 'Saving...' : t('common.save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DepartmentManagement;
