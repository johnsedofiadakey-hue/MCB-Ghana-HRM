import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, Edit2, Trash2, Camera,
  X, Loader2, Clock, Umbrella,
  Eye, Archive, ShieldCheck, Briefcase, Printer, ArrowRight, Globe, AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRankFromRole } from '../utils/session';
import { toast } from '../utils/toast';
import { usePersistentDraft } from '../hooks/usePersistentDraft';
import { optimizeImage } from '../utils/image';


import { GET_ORDERED_ROLES } from '../types/roles';
const ROLES = GET_ORDERED_ROLES();
// ROLE_LABELS is now handled by i18n in the render

const ROLE_THEMES: Record<string, string> = {
  DEV: 'text-[var(--success)] bg-[var(--success)]/5 border-[var(--success)]/10',
  MD: 'text-[var(--error)] bg-[var(--error)]/5 border-[var(--error)]/10',
  DIRECTOR: 'text-[var(--primary)] bg-[var(--primary)]/5 border-[var(--primary)]/10',
  HR_MANAGER: 'text-[var(--primary)] bg-[var(--primary)]/5 border-[var(--primary)]/10',
  FINANCE_MANAGER: 'text-[var(--primary)] bg-[var(--primary)]/5 border-[var(--primary)]/10',
  HR_OFFICER: 'text-[var(--primary)] bg-[var(--primary)]/5 border-[var(--primary)]/10',
  IT_MANAGER: 'text-[var(--info)] bg-[var(--info)]/5 border-[var(--info)]/10',
  IT_ADMIN: 'text-[var(--info)] bg-[var(--info)]/5 border-[var(--info)]/10',
  MANAGER: 'text-[var(--primary)] bg-[var(--primary)]/5 border-[var(--primary)]/10',
  SUPERVISOR: 'text-[var(--info)] bg-[var(--info)]/5 border-[var(--info)]/10',
  STAFF: 'text-[var(--text-secondary)] bg-[var(--bg-elevated)] border-[var(--border-subtle)]',
  CASUAL: 'text-[var(--warning)] bg-[var(--warning)]/5 border-[var(--warning)]/10'
};

const STATUS_THEMES: Record<string, string> = {
  ACTIVE: 'text-[var(--success)] bg-[var(--success)]/5 border-[var(--success)]/10',
  PROBATION: 'text-[var(--warning)] bg-[var(--warning)]/5 border-[var(--warning)]/10',
  NOTICE_PERIOD: 'text-[var(--info)] bg-[var(--info)]/5 border-[var(--info)]/10',
  TERMINATED: 'text-[var(--error)] bg-[var(--error)]/5 border-[var(--error)]/10'
};

const EMPTY_FORM = {
  fullName: '', email: '', password: '', role: 'STAFF', jobTitle: '',
  departmentId: null as number | null, subUnitId: '', supervisorId: '', secondarySupervisorId: '', employmentType: 'Permanent', gender: '', education: '',
  contactNumber: '', employeeCode: '', joinDate: '', salary: '' as string | number, currency: 'GHS',
  nationalId: '', address: '', dob: '', bankAccountNumber: '', bankName: '', bankBranch: '',
  ssnitNumber: '', nationality: '', countryOfOrigin: '', maritalStatus: '',
  emergencyContactName: '', emergencyContactPhone: '',
  nextOfKinName: '', nextOfKinRelation: '', nextOfKinContact: '', certifications: [] as any[],
  biometricId: ''
};

const Avatar = ({ user, size = 12 }: { user: any; size?: number }) => (
  user?.avatarUrl
    ? <img src={user.avatarUrl} alt={user.fullName} className={cn(`w-${size} h-${size} rounded-2xl object-cover ring-4 ring-[var(--border-subtle)]/30 shadow-xl`)} />
    : <div className={cn(`w-${size} h-${size} rounded-2xl flex items-center justify-center text-[var(--text-inverse)] font-black flex-shrink-0 shadow-2xl transition-transform group-hover:scale-105`)}
      style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', fontSize: size * 1.8 }}>
      {(user?.fullName || '?')[0]}
    </div>
);

const FormField = ({ label, type = 'text', required = false, value, onChange, children, placeholder, description }: any) => (
  <div className="space-y-3">
    <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">
            {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {description && <p className="text-[10px] text-[var(--text-muted)] opacity-60 pl-1 -mt-1">{description}</p>}
    </div>
    {children || <input type={type} className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3 text-[13px] font-semibold focus:border-[var(--primary)] outline-none transition-all" value={value} onChange={onChange} placeholder={placeholder} required={required} />}
  </div>
);

export default function EmployeeManagement() {
  const { t, i18n: i18n_fe } = useTranslation();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [modalTab, setModalTab] = useState<'identity' | 'corporate' | 'financial' | 'family' | 'academic'>('identity');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [modal, setModal] = useState<'create' | 'edit' | 'role' | 'archive' | 'hard_delete' | 'view' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const modalAvatarRef = useRef<HTMLInputElement>(null);


  const user = getStoredUser();
  const role = user?.role || 'STAFF';
  const rank = getRankFromRole(role);
  const privilegedRoles = ['MD', 'DIRECTOR', 'HR_MANAGER', 'FINANCE_MANAGER', 'HR_OFFICER', 'IT_MANAGER', 'IT_ADMIN'];
  const isPrivileged = privilegedRoles.includes(user?.role) && rank >= 80;

  const isAdmin = rank >= 85;
  const canManage = rank >= 85; // IT Admin, HR Manager, MD can edit records
  const canManageBiometric = rank >= 85;
  const canAddPersonnel = rank >= 85;

  // Real-time Persistence for "Create" / "Edit" flow
  const { data: draftData, updateDraft, loading: draftLoading } = usePersistentDraft(
    'employee_drafts', 
    modal === 'create' ? `create_new_${user.organizationId}` : (modal === 'edit' && selected ? `edit_${selected.id}` : ''),
    EMPTY_FORM
  );

  const hasLoadedDraft = useRef(false);

  // Reset load flag when modal opens/closes
  useEffect(() => {
    if (!modal) {
      hasLoadedDraft.current = false;
    }
  }, [modal]);

  // Load draft into form EXACTLY ONCE when modal opens
  useEffect(() => {
    if (modal === 'create' && draftData && !draftLoading && !hasLoadedDraft.current) {
      setForm(draftData);
      hasLoadedDraft.current = true;
    }
  }, [modal, draftData, draftLoading]);

  // AUTO-SAVE: Sync form changes back to Firestore draft with deep check
  useEffect(() => {
    const isDefault = JSON.stringify(form) === JSON.stringify(EMPTY_FORM);
    if ((modal === 'create' || modal === 'edit') && !isDefault) {
      const timer = setTimeout(() => {
        updateDraft(form);
      }, 1500); // 1.5s debounce for stability
      return () => clearTimeout(timer);
    }
  }, [form, modal]);


  const fetchAll = useCallback(async (isAppend = false) => {
    setLoading(true);
    try {
      const take = 50;
      const skip = isAppend ? employees.length : 0;
      const endpoint = activeTab === 'archived' ? '/employees?archived=true' : '/employees';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterRole) params.append('role', filterRole);
      if (filterStatus) params.append('status', filterStatus);
      params.append('take', String(take));
      params.append('skip', String(skip));

      const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${params.toString()}`;
      
      const [empRes, supRes, depRes] = await Promise.all([
        api.get(url),
        api.get('/employees/supervisors'),
        api.get('/departments')
      ]);
      
      const newEmployees = Array.isArray(empRes.data) ? empRes.data : [];
      setEmployees(prev => isAppend ? [...prev, ...newEmployees] : newEmployees);
      setHasMore(newEmployees.length === take);
      
      setSupervisors(Array.isArray(supRes.data) ? supRes.data : []);
      setDepartments(Array.isArray(depRes.data) ? depRes.data : []);
    } catch (e) { 
        console.error(e);
        toast.error(t('common.error_sync'));
    } finally { setLoading(false); }
  }, [activeTab, search, filterRole, filterStatus, employees.length, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchAll(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, filterRole, filterStatus, activeTab]);

  const openEdit = async (emp: any) => {
    setLoading(true);
    try {
      const res = await api.get(`/employees/${emp.id}`);
      const fullEmp = res.data;
      setSelected(fullEmp);
      const secondary = fullEmp.employeeReportingLines?.find((r: any) => !r.isPrimary && r.type === 'DOTTED')?.managerId || '';
      setForm({
        fullName: fullEmp.fullName || '', email: fullEmp.email || '', password: '',
        role: fullEmp.role || 'STAFF', jobTitle: fullEmp.jobTitle || '',
        departmentId: fullEmp.departmentId || null, subUnitId: fullEmp.subUnitId || '', 
        supervisorId: fullEmp.supervisorId || '',
        secondarySupervisorId: secondary,
        employmentType: fullEmp.employmentType || 'Permanent', gender: fullEmp.gender || '',
        education: fullEmp.education || '',
        contactNumber: fullEmp.contactNumber || '', employeeCode: fullEmp.employeeCode || '',
        joinDate: fullEmp.joinDate ? fullEmp.joinDate.split('T')[0] : '',
        salary: fullEmp.salary || '', currency: fullEmp.currency || 'GHS',
        nationalId: fullEmp.nationalId || '', address: fullEmp.address || '',
        dob: fullEmp.dob ? fullEmp.dob.split('T')[0] : '',
        bankAccountNumber: fullEmp.bankAccountNumber || '', bankName: fullEmp.bankName || '', bankBranch: fullEmp.bankBranch || '',
        ssnitNumber: fullEmp.ssnitNumber || '', 
        nationality: fullEmp.nationality || '', 
        countryOfOrigin: fullEmp.countryOfOrigin || '',
        maritalStatus: fullEmp.maritalStatus || '',
        emergencyContactName: fullEmp.emergencyContactName || '', emergencyContactPhone: fullEmp.emergencyContactPhone || '',
        nextOfKinName: fullEmp.nextOfKinName || '', nextOfKinRelation: fullEmp.nextOfKinRelation || '', nextOfKinContact: fullEmp.nextOfKinContact || '',
        certifications: Array.isArray(fullEmp.certifications) ? fullEmp.certifications : [],
        biometricId: fullEmp.biometricId || ''
      });
      setModalTab('identity');
      setModal('edit');
    } catch (err) {
      toast.error(t('employees.alerts.fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId && employees.length > 0) {
      const targetEmp = employees.find(e => e.id === editId);
      if (targetEmp) {
        window.history.replaceState(null, '', window.location.pathname);
        openEdit(targetEmp);
      }
    }
  }, [employees]);

  const openCreate = () => { setForm({ ...EMPTY_FORM }); setError(''); setModalTab('identity'); setModal('create'); };
  const openView = (emp: any) => navigate(`/employees/${emp.id}`);
  const openArchive = (emp: any) => { 
    setSelected(emp); 
    if (activeTab === 'archived') {
      setModal('hard_delete');
    } else {
      setModal('archive'); 
    }
  };

  const handleSave = async (submittedForm: any) => {
    setSaving(true); setError('');
    try {
      // Robust reporting logic for Supervisors
      if (submittedForm.role === 'SUPERVISOR') {
        if (!submittedForm.supervisorId) {
          toast.error(t('employees.alerts.supervisor_reporting_rule'));
          setSaving(false);
          return;
        }
        const targetSup = supervisors.find(s => s.id === submittedForm.supervisorId);
        if (targetSup && getRankFromRole(targetSup.role) <= 60) {
          toast.error(t('employees.alerts.supervisor_rank_rule', 'Supervisors must report to a Manager or higher.'));
          setSaving(false);
          return;
        }
      }

      if (modal === 'create') {
        await api.post('/employees', submittedForm);
        toast.success(t('employees.personnel_deployment_success'));
      } else {
        await api.put(`/employees/${selected.id}`, submittedForm);
        toast.success(t('employees.dossier_updated_success'));
      }
      // Clear draft on success
      await updateDraft(EMPTY_FORM);
      setModal(null); fetchAll();

    } catch (err: any) { 
        const msg = err?.response?.data?.message || 'Protocol failure during sync';
        setError(msg); 
        toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleArchive = async () => {
    setSaving(true);
    try {
      await api.delete(`/employees/${selected.id}`);
      toast.success(t('employees.alerts.retire_success'));
      setModal(null); fetchAll();
    } catch (err: any) { toast.error(t('employees.alerts.retire_error')); }
    finally { setSaving(false); }
  };

  const handleRestore = async (emp: any) => {
    setSaving(true);
    try {
      await api.post(`/employees/${emp.id}/restore`);
      toast.success(t('employees.alerts.restore_success'));
      fetchAll();
    } catch (err: any) { toast.error(t('employees.alerts.restore_error')); }
    finally { setSaving(false); }
  };

  const handleHardDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/employees/${selected.id}/hard`);
      toast.success(t('employees.alerts.purge_success'));
      setModal(null); fetchAll();
    } catch (err: any) { 
        const msg = err?.response?.data?.message || t('employees.alerts.purge_error');
        toast.error(msg); 
    }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (empId: string, file: File) => {
    setUploading(empId);
    try {
      // 🚀 CLIENT-SIDE OPTIMIZATION: Resize to 400x400 WebP before sending to server
      // This prevents server-side memory exhaustion (500 errors) on Render.
      const optimizedBase64 = await optimizeImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.8 });
      
      const res = await api.post(`/employees/${empId}/avatar`, { image: optimizedBase64 });
      const newUrl = res.data.url;
      
      if (selected?.id === empId) {
        setSelected((prev: any) => ({ ...prev, avatarUrl: newUrl }));
      }
      
      fetchAll();
      toast.success(t('employees.alerts.avatar_success'));
    } catch (err: any) {
      console.error('[Avatar Upload Failure]:', err);
      toast.error(t('employees.alerts.avatar_error'));
    } finally {
      setUploading(null);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
        const res = await api.get(`/export/employees/${format}?lang=${i18n_fe.language}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Personnel_Ledger_${format.toUpperCase()}_${new Date().toISOString().split('T')[0]}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        toast.error(t('employees.alerts.export_error'));
    }
  };

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      // 🛡️ STEALTH PROTOCOL: Accounts with Rank 100 (Dev) are invisible to everyone except other Rank 100 users.
      const isDevAccount = (emp.rank || 0) >= 100;
      if (isDevAccount && rank < 100) return false;
      return true;
    });
  }, [employees, rank]);

  return (
    <div className="space-y-12 pb-32">
      {/* Header Architecture */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{t('employees.title')}</h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <Users size={18} className="text-[var(--primary)] opacity-60" />
            {t('employees.subtitle')}
          </p>
        </motion.div>
        
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
             <div className="flex bg-[var(--bg-elevated)]/50 p-1 rounded-xl border border-[var(--border-subtle)] flex-1 sm:flex-none">
                <button onClick={() => setActiveTab('active')} className={cn("px-4 sm:px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex-1 sm:flex-none", activeTab === 'active' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                    {t('employees.active_personnel')}
                </button>
                <button onClick={() => setActiveTab('archived')} className={cn("px-4 sm:px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex-1 sm:flex-none", activeTab === 'archived' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                    {t('employees.archived_personnel')}
                </button>
             </div>
             
             <div className="flex bg-[var(--bg-elevated)]/50 p-1 rounded-xl border border-[var(--border-subtle)] ml-2">
                {(['grid', 'table'] as const).map(m => (
                    <button key={m} onClick={() => setViewMode(m)}
                        className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        viewMode === m ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                        {m}
                    </button>
                ))}
             </div>

             {rank >= 80 && (
                <div className="flex items-center gap-2 ml-2">
                    <button onClick={() => handleExport('csv')} className="p-3 rounded-xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--success)] hover:border-[var(--success)]/30 transition-all shadow-sm" title={t('common.export_csv', 'Export CSV Ledger')}>
                        <div className="text-[9px] font-black uppercase">CSV</div>
                    </button>
                    <button onClick={() => handleExport('pdf')} className="p-3 rounded-xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--error)] hover:border-[var(--error)]/30 transition-all shadow-sm" title={t('common.export_pdf', 'Export PDF Ledger')}>
                        <Printer size={14} />
                    </button>
                </div>
             )}

             {canAddPersonnel && activeTab !== 'archived' && (
                <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="px-8 h-[52px] rounded-2xl bg-[var(--primary)] text-[var(--text-inverse)] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 flex items-center gap-3 w-full sm:w-auto justify-center"
                    onClick={openCreate}
                >
                    <Plus size={18} /> {t('employees.deploy_button')}
                </motion.button>
             )}
        </div>
      </div>

      {/* Global Filter Matrix */}
      <div className="nx-card p-2 flex flex-wrap items-center gap-2 bg-[var(--bg-elevated)]/30 border-[var(--border-subtle)]">
        <div className="relative flex-1 min-w-[280px] group">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
          <input type="text" className="w-full bg-transparent border-none outline-none pl-14 pr-6 py-4 text-[13px] font-medium text-[var(--text-primary)]" placeholder={t('employees.search_placeholder')}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="h-6 w-[2px] bg-[var(--border-subtle)] opacity-20 hidden md:block" />
        <select className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest px-6 py-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">{t('employees.all_ranks')}</option>
          {ROLES.map(r => <option key={r} value={r}>{t(`employees.roles.${r}`)}</option>)}
        </select>
        <div className="h-6 w-[2px] bg-[var(--border-subtle)] opacity-20 hidden md:block" />
        <select className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest px-6 py-4 text-[var(--text-secondary)] hover:text(--text-primary)] cursor-pointer" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">{t('employees.all_statuses')}</option>
          {['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'TERMINATED'].map(s => <option key={s} value={s}>{t(`employees.statuses.${s}`)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-40 flex flex-col items-center justify-center gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] animate-pulse">Synchronizing Personnel Ledger</p>
        </div>
      ) : (
        <div className="space-y-10">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {(filtered || []).map((emp, i) => (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="nx-card group relative overflow-hidden bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--primary)]/30 hover:shadow-2xl transition-all duration-500"
                >
                   <div className="p-8 pb-32">
                      <div className="flex justify-between items-start mb-6">
                         <div className="relative group/avatar">
                            <Avatar user={emp} size={16} />
                            {canManage && (
                                <button className="absolute inset-0 rounded-2xl bg-[var(--primary)]/60 opacity-0 group-hover/avatar:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px] text-white"
                                    onClick={() => fileInputRefs.current[emp.id]?.click()}>
                                    {uploading === emp.id ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                                </button>
                            )}
                            <input type="file" accept="image/*" className="hidden"
                                ref={el => { fileInputRefs.current[emp.id] = el; }}
                                onChange={e => e.target.files?.[0] && handleAvatarUpload(emp.id, e.target.files[0])} />
                         </div>
                          <div className="flex flex-col items-end gap-1.5">
                             <div className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border", ROLE_THEMES[emp.role])}>
                                {t(`employees.roles.${emp.role}`)}
                             </div>
                             {emp.isOnLeave && (
                               <div className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20 flex items-center gap-1.5 animate-pulse">
                                  <Clock size={10} /> {t('leave.status.ON_LEAVE', 'ON LEAVE')}
                               </div>
                             )}
                          </div>
                      </div>
                      
                      <div className="space-y-1">
                         <h3 className="text-lg font-black text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">{emp.fullName}</h3>
                         <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2 opacity-60">
                            <Briefcase size={10} /> {emp.jobTitle}
                         </p>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2">
                         <div className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] font-bold border border-[var(--border-subtle)]">
                            {emp.department || emp.departmentObj?.name || t('common.unassigned_dept')}
                         </div>
                         <div className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border", STATUS_THEMES[emp.status])}>
                            {t(`employees.statuses.${emp.status}`)}
                         </div>
                      </div>
                   </div>

                   {/* Action Footer overlay */}
                   <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--bg-elevated)] to-transparent border-t border-[var(--border-subtle)]/50 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="flex items-center justify-between gap-2">
                         {activeTab === 'archived' ? (
                            <button onClick={() => handleRestore(emp)} className="flex-1 h-10 rounded-xl bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)] hover:text-white transition-all font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 border border-[var(--success)]/20 shadow-sm">
                                <ArrowRight size={14} /> {t('employees.restore_to_duty')}
                            </button>
                         ) : (
                            <button onClick={() => openView(emp)} className="flex-1 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--primary)] hover:text-[var(--text-inverse)] hover:border-[var(--primary)] transition-all font-black text-[9px] uppercase tracking-widest">
                                {t('employees.view_dossier')}
                            </button>
                         )}
                         {canManage && (
                            <div className="flex gap-2">
                                <button onClick={() => openEdit(emp)} className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-all flex items-center justify-center">
                                    <Edit2 size={14} />
                                </button>
                                {rank >= 85 && (
                                    <button onClick={() => openArchive(emp)} className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--error)] text-[var(--text-muted)] hover:text-[var(--error)] transition-all flex items-center justify-center">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                         )}
                      </div>
                   </div>
                </motion.div>
              ))}
            </div>
          ) : (
             <div className="nx-card overflow-hidden border-[var(--border-subtle)]">
                <div className="overflow-x-auto">
                   <table className="nexus-responsive-table w-full">
                      <thead>
                         <tr className="bg-[var(--bg-elevated)]/20">
                            <th className="px-8">{t('employees.personnel')}</th>
                            <th>{t('employees.rank_dept')}</th>
                            <th>{t('employees.operational_status')}</th>
                            <th className="text-right px-8">{t('common.actions')}</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]/50">
                         {filtered.map((emp) => (
                            <tr key={emp.id} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                               <td className="px-8 py-5" data-label={t('employees.personnel')}>
                                  <div className="flex items-center gap-4">
                                     <Avatar user={emp} size={10} />
                                     <div>
                                        <p className="font-bold text-[14px] text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">{emp.fullName}</p>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60 italic">{emp.email}</p>
                                     </div>
                                  </div>
                               </td>
                               <td data-label={t('employees.rank_dept')}>
                                  <div className="space-y-1.5 md:items-start items-end flex flex-col">
                                     <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border", ROLE_THEMES[emp.role])}>
                                        {t(`employees.roles.${emp.role}`)} (L{getRankFromRole(emp.role)})
                                     </span>
                                     <p className="text-[11px] font-medium text-[var(--text-secondary)]">{emp.jobTitle} · {emp.departmentObj?.name || t('common.unassigned_dept')}</p>
                                  </div>
                               </td>
                               <td data-label={t('employees.operational_status')}>
                                <div className="flex items-center gap-2">
                                  <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm", STATUS_THEMES[emp.status])}>
                                     {t(`employees.statuses.${emp.status}`)}
                                  </span>
                                  {emp.isOnLeave && (
                                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)] flex items-center gap-1.5">
                                       <Umbrella size={10} /> {t('leave.status.ON_LEAVE', 'OUT')}
                                    </span>
                                  )}
                                </div>
                               </td>
                               <td className="px-8 py-5 text-right" data-label={t('common.actions')}>
                                  <div className="flex justify-end gap-2">
                                     <button onClick={() => openView(emp)} className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)] transition-all flex items-center justify-center">
                                        <Eye size={16} />
                                     </button>
                                      {activeTab === 'archived' ? (
                                        <button onClick={() => handleRestore(emp)} className="w-9 h-9 rounded-xl bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)] hover:text-white transition-all flex items-center justify-center" title={t('employees.restore_employee')}>
                                          <ArrowRight size={16} />
                                        </button>
                                      ) : (
                                        rank >= 85 && (
                                          <button onClick={() => openEdit(emp)} className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)] transition-all flex items-center justify-center">
                                            <Edit2 size={16} />
                                          </button>
                                        )
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
        </div>
      )}

      {hasMore && !loading && filtered.length > 0 && (
        <div className="flex justify-center mt-12 pb-12">
          <button 
            onClick={() => fetchAll(true)}
            className="px-10 py-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] hover:bg-[var(--bg-card)] hover:border-[var(--primary)] transition-all shadow-xl group flex items-center gap-4"
          >
            {t('common.load_more', 'Sync Next Batch')}
            <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      )}

      {/* Initialize Form Modal Architecture */}
      <AnimatePresence>
        {(modal === 'create' || modal === 'edit') && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-4xl bg-[var(--bg-card)] rounded-[3rem] border border-[var(--border-subtle)] shadow-[0_40px_100px_rgba(0,0,0,0.2)] overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="px-10 py-10 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex justify-between items-center">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20 shadow-lg">
                       <ShieldCheck className="text-[var(--primary)]" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter uppercase">{modal === 'create' ? t('employees.add_new', 'Add New Employee') : t('employees.edit_profile', 'Edit Employee Profile')}</h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1 opacity-60">{t('employees.complete_details', 'Complete the details below')}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    {modal === 'edit' && selected && (
                      <button 
                        onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL}/export/employee/${selected.id}/pdf`, '_blank')}
                        className="h-12 px-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--primary)] hover:border-[var(--primary)] transition-all shadow-lg group"
                        title={t('employees.export_dossier', 'Export Dossier')}
                      >
                         <Printer size={18} className="group-hover:scale-110 transition-transform" />
                         <span className="hidden md:inline">{t('employees.print_dossier', 'Print Dossier')}</span>
                      </button>
                    )}
                    <button onClick={() => setModal(null)} className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={20} /></button>
                 </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSave(form); }} id="emp-form" className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12">
                 {(modal === 'create' && draftLoading) && (
                    <div className="absolute inset-0 bg-[var(--bg-card)]/50 backdrop-blur-sm z-[110] flex items-center justify-center">
                        <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
                    </div>
                 )}

                 {error && <div className="px-5 py-4 rounded-2xl bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] text-[11px] font-black uppercase tracking-widest">{error}</div>}

                 {/* Tabbed Navigation Bar */}
                 <div className="flex overflow-x-auto gap-2 border-b border-[var(--border-subtle)] pb-4 mb-8 custom-scrollbar">
                     {([
                         { id: 'identity', label: t('employees.tabs.identity', 'Identity & Demographics') },
                         { id: 'corporate', label: t('employees.tabs.corporate', 'Corporate & Role') },
                         { id: 'financial', label: t('employees.tabs.financial', 'Financial Matrix') },
                         { id: 'family', label: t('employees.tabs.family', 'Family & S.O.S') },
                         { id: 'academic', label: t('employees.tabs.academic', 'Academic Dossier') }
                     ] as const).map(tab => (
                         <button key={tab.id} type="button" onClick={() => setModalTab(tab.id)}
                            className={cn("px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all",
                            modalTab === tab.id ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30" : "bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)]")}>
                            {tab.label}
                         </button>
                     ))}
                 </div>

                 {modalTab === 'identity' && (
                     <div className="space-y-10 animate-in slide-in-from-right-4 fade-in duration-300">
                         {/* 🖼️ NEW: Imagery Section */}
                         <div className="flex flex-col md:flex-row items-center gap-8 bg-[var(--bg-elevated)]/30 p-8 rounded-[2.5rem] border border-[var(--border-subtle)]/50">
                             <div className="relative group/modal-avatar">
                                 <Avatar user={modal === 'edit' ? selected : { fullName: form.fullName }} size={32} />
                                 {modal === 'edit' && canManage && (
                                    <button 
                                       type="button"
                                       onClick={() => modalAvatarRef.current?.click()}
                                       className="absolute inset-0 rounded-2xl bg-[var(--primary)]/60 opacity-0 group-hover/modal-avatar:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-[2px] text-white gap-2"
                                    >
                                        {uploading === selected.id ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                                        <span className="text-[8px] font-black uppercase tracking-widest">{t('common.change_photo', 'Change Photo')}</span>
                                    </button>
                                 )}
                                 <input 
                                   type="file" 
                                   accept="image/*" 
                                   className="hidden" 
                                   ref={modalAvatarRef} 
                                   onChange={e => e.target.files?.[0] && handleAvatarUpload(selected.id, e.target.files[0])} 
                                 />
                             </div>
                             <div className="flex-1 text-center md:text-left space-y-2">
                                 <h4 className="text-xl font-black text-[var(--text-primary)] tracking-tight">{t('employees.profile_imagery', 'Profile Imagery')}</h4>
                                 <p className="text-[11px] font-medium text-[var(--text-secondary)] leading-relaxed">
                                     {t('employees.imagery_desc', 'Upload a professional identification photo. Recommended aspect ratio is 1:1 (Square) for optimal rendering across the platform.')}
                                 </p>
                                 {!selected?.avatarUrl && modal === 'edit' && (
                                     <div className="flex items-center gap-2 text-rose-500 text-[9px] font-black uppercase tracking-widest mt-2">
                                         <AlertCircle size={12} /> {t('employees.no_photo_alert', 'No Identification Photo Uploaded')}
                                     </div>
                                 )}
                             </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField label={t('employees.full_name')} value={form.fullName} onChange={(e: any) => setForm({ ...form, fullName: e.target.value })} required placeholder={t('employees.legal_full_name')} />
                             <FormField label={t('employees.email_address', 'Email Address')} type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} required placeholder="employee@company.com" />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField label={t('employees.dob', 'Date of Birth')} type="date" value={form.dob} onChange={(e: any) => setForm({ ...form, dob: e.target.value })} />
                             <FormField label={t('employees.gender', 'Gender')}>
                                <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3 text-[13px] font-bold focus:border-[var(--primary)] outline-none appearance-none cursor-pointer" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                   <option value="">{t('common.unspecified', 'Unspecified')}</option><option value="Male">{t('common.male', 'Male')}</option><option value="Female">{t('common.female', 'Female')}</option>
                                </select>
                             </FormField>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormField label={<span className="flex items-center gap-2"><Globe size={10} className="text-[var(--primary)]" /> {t('employees.country', 'Country of Origin')}</span>} value={form.countryOfOrigin} onChange={(e: any) => setForm({ ...form, countryOfOrigin: e.target.value })} placeholder={t('employees.country_placeholder', "e.g., Guinea, Ghana, Sierra Leone")} />
                              <FormField label={<span className="flex items-center gap-2"><Globe size={10} className="text-[var(--primary)]" /> {t('employees.nationality', 'Nationality')}</span>} value={form.nationality} onChange={(e: any) => setForm({ ...form, nationality: e.target.value })} placeholder={t('employees.nationality_placeholder', "e.g., Guinean, Ghanaian, British")} />
                             <FormField label={t('employees.marital_status', 'Marital Status')}>
                                <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3 text-[13px] font-bold focus:border-[var(--primary)] outline-none appearance-none cursor-pointer" value={form.maritalStatus} onChange={e => setForm({ ...form, maritalStatus: e.target.value })}>
                                   <option value="">{t('common.unspecified', 'Unspecified')}</option><option value="Single">{t('employees.single', 'Single')}</option><option value="Married">{t('employees.married', 'Married')}</option><option value="Divorced">{t('employees.divorced', 'Divorced')}</option>
                                </select>
                             </FormField>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField label={t('employees.phone_number', 'Phone Number')} type="tel" value={form.contactNumber} onChange={(e: any) => setForm({ ...form, contactNumber: e.target.value })} placeholder="+233..." />
                         </div>
                     </div>
                 )}

                 {modalTab === 'corporate' && (
                     <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField label={t('employees.employee_code', 'Employee Code')} value={form.employeeCode} onChange={(e: any) => setForm({ ...form, employeeCode: e.target.value })} placeholder="e.g. MC-001" />
                             <FormField label={t('employees.job_title', 'Job Title')} value={form.jobTitle} onChange={(e: any) => setForm({ ...form, jobTitle: e.target.value })} required placeholder="e.g. Senior Strategist" />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField label={t('employees.system_rank', 'System Rank')}>
                                <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3 text-[13px] font-black uppercase tracking-widest focus:border-[var(--primary)] outline-none appearance-none cursor-pointer" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                   {ROLES.map(r => <option key={r} value={r}>{t(`employees.roles.${r}`)}</option>)}
                                </select>
                             </FormField>
                             <FormField label={t('employees.department', 'Department')}>
                                <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3 text-[13px] font-bold focus:border-[var(--primary)] outline-none appearance-none cursor-pointer" value={form.departmentId || ''} onChange={e => setForm({ ...form, departmentId: e.target.value ? parseInt(e.target.value) : null })}>
                                   <option value="">{t('common.unassigned_dept')}</option>
                                   {(departments || []).filter(Boolean).map((d: any) => <option key={d.id} value={d.id}>{d.name || 'Department'}</option>)}
                                </select>
                             </FormField>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormField 
                                label={t('employees.primary_manager', 'Primary Manager')}
                                description={form.role === 'SUPERVISOR' ? t('employees.supervisor_reporting_rule', 'Supervisors must report to a Manager or higher rank.') : ''}
                              >
                                 <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3 text-[13px] font-bold focus:border-[var(--primary)] outline-none appearance-none cursor-pointer" value={form.supervisorId} onChange={e => setForm({ ...form, supervisorId: e.target.value })}>
                                    <option value="">{t('common.independent')}</option>
                                    {supervisors.filter((s: any) => {
                                        if (s.id === selected?.id) return false;
                                        const supervisorRank = getRankFromRole(s.role);
                                        const currentRank = getRankFromRole(form.role);
                                        if (currentRank === 60) return supervisorRank >= 70; // Supervisor must report to Manager+
                                        return supervisorRank >= 60; // Others can report to Supervisor+
                                    }).map((s: any) => (
                                       <option key={s.id} value={s.id}>{s.fullName} ({t(`employees.roles.${s.role}`)})</option>
                                    ))}
                                 </select>
                              </FormField>
                              <FormField 
                                label={t('employees.matrix_manager', 'Functional Manager')}
                                description={t('employees.matrix_manager_desc', 'Secondary manager for functional or project-based reporting.')}
                              >
                                 <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3 text-[13px] font-bold focus:border-[var(--primary)] outline-none appearance-none cursor-pointer" value={form.secondarySupervisorId || ''} onChange={e => setForm({ ...form, secondarySupervisorId: e.target.value })}>
                                    <option value="">{t('common.none', 'None Assigned')}</option>
                                    {supervisors.filter((s: any) => {
                                        if (s.id === selected?.id || s.id === form.supervisorId) return false;
                                        const supervisorRank = getRankFromRole(s.role);
                                        const currentRank = getRankFromRole(form.role);
                                        if (currentRank === 60) return supervisorRank >= 70;
                                        return supervisorRank >= 60;
                                    }).map((s: any) => (
                                       <option key={s.id} value={s.id}>{s.fullName} ({t(`employees.roles.${s.role}`)})</option>
                                    ))}
                                 </select>
                              </FormField>
                         </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormField label={t('employees.deployment_date', 'Deployment Date')} type="date" value={form.joinDate} onChange={(e: any) => setForm({ ...form, joinDate: e.target.value })} />
                              <FormField label={t('employees.biometric_id', 'Biometric Device ID')} value={form.biometricId} onChange={(e: any) => canManageBiometric && setForm({ ...form, biometricId: e.target.value })} placeholder={canManageBiometric ? "e.g. 1001" : t('employees.access_restricted', "Access Restricted")} disabled={!canManageBiometric} />
                          </div>
                     </div>
                 )}

                 {modalTab === 'financial' && (
                     <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <FormField label={t('employees.base_salary', 'Base Salary')} type="number" value={form.salary} onChange={(e: any) => setForm({ ...form, salary: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
                            </div>
                            <FormField label={t('employees.currency', 'Currency')}>
                               <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3 text-[13px] font-bold focus:border-[var(--primary)] outline-none appearance-none cursor-pointer" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                                  <option value="GNF">GNF</option><option value="GHS">GHS</option><option value="USD">USD</option><option value="EUR">EUR</option>
                               </select>
                            </FormField>
                         </div>
                         <div className="grid grid-cols-2 gap-6">
                             <FormField label={t('employees.national_id', 'National ID Number')} value={form.nationalId} onChange={(e: any) => setForm({ ...form, nationalId: e.target.value })} placeholder={t('employees.id_placeholder', "ID Number")} />
                             <FormField label={t('employees.ssn', 'Social Security ID')} value={form.ssnitNumber} onChange={(e: any) => setForm({ ...form, ssnitNumber: e.target.value })} placeholder={t('employees.ssn_placeholder', "SSN Number")} />
                         </div>
                         <div className="grid grid-cols-2 gap-6 p-5 bg-amber-500/5 rounded-3xl border border-amber-500/10">
                             <FormField label={t('employees.leave_allowance')} type="number" value={form.leaveAllowance} onChange={(e: any) => setForm({ ...form, leaveAllowance: parseFloat(e.target.value) })} />
                             <FormField label={t('employees.leave_balance')} type="number" value={form.leaveBalance} onChange={(e: any) => setForm({ ...form, leaveBalance: parseFloat(e.target.value) })} />
                         </div>
                         <FormField label={t('employees.bank_name', 'Bank Name')} value={form.bankName} onChange={(e: any) => setForm({ ...form, bankName: e.target.value })} placeholder={t('employees.bank_placeholder', "e.g. Ecobank")} />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField label={t('employees.bank_branch', 'Bank Branch')} value={form.bankBranch} onChange={(e: any) => setForm({ ...form, bankBranch: e.target.value })} placeholder={t('employees.branch_placeholder', "e.g. Main Branch")} />
                             <FormField label={t('employees.account_number', 'Account Number')} value={form.bankAccountNumber} onChange={(e: any) => setForm({ ...form, bankAccountNumber: e.target.value })} placeholder={t('employees.account_placeholder', "Account Number")} />
                         </div>
                     </div>
                 )}

                 {modalTab === 'family' && (
                     <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
                         <FormField label={t('employees.residential_address', 'Current Residential Address')}>
                            <textarea className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[13px] font-medium focus:border-[var(--primary)] outline-none custom-scrollbar min-h-24" value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} placeholder={t('employees.address_placeholder', "Detailed physical residential address...")} />
                         </FormField>
                         
                         <div className="space-y-4">
                             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">{t('employees.emergency_contact', 'Emergency Contact (S.O.S)')}</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--bg-elevated)]/20 p-5 rounded-3xl border border-[var(--border-subtle)]/50">
                                 <FormField label={t('employees.full_name')} value={form.emergencyContactName} onChange={(e: any) => setForm({ ...form, emergencyContactName: e.target.value })} placeholder={t('employees.contact_person_placeholder', "Contact Person")} />
                                 <FormField label={t('employees.emergency_phone', 'Emergency Phone')} type="tel" value={form.emergencyContactPhone} onChange={(e: any) => setForm({ ...form, emergencyContactPhone: e.target.value })} placeholder={t('employees.phone_placeholder', "Phone Number")} />
                             </div>
                         </div>

                         <div className="space-y-4">
                             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{t('employees.next_of_kin', 'Legal Next of Kin')}</h4>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[var(--bg-elevated)]/20 p-5 rounded-3xl border border-[var(--border-subtle)]/50">
                                 <FormField label={t('employees.full_name')} value={form.nextOfKinName} onChange={(e: any) => setForm({ ...form, nextOfKinName: e.target.value })} placeholder={t('employees.next_of_kin_placeholder', "Next of Kin")} />
                                 <FormField label={t('employees.relationship', 'Relationship')} value={form.nextOfKinRelation} onChange={(e: any) => setForm({ ...form, nextOfKinRelation: e.target.value })} placeholder={t('employees.relation_placeholder', "e.g. Spouse, Brother")} />
                                 <FormField label={t('employees.phone_number', 'Phone Number')} type="tel" value={form.nextOfKinContact} onChange={(e: any) => setForm({ ...form, nextOfKinContact: e.target.value })} placeholder="+233..." />
                             </div>
                         </div>
                     </div>
                 )}

                 {modalTab === 'academic' && (
                     <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
                         <FormField label={t('employees.academic_tier', 'Highest Education')} value={form.education} onChange={(e: any) => setForm({ ...form, education: e.target.value })} placeholder={t('employees.academic_placeholder', "e.g. BSc Information Technology")} />
                         
                         <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">{t('employees.certifications', 'Professional Certificates')}</h4>
                                 <button type="button" onClick={() => setForm({ ...form, certifications: [...form.certifications, { name: '', issueDate: '', authority: '' }] })} className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-emerald-500 transition-all">+ {t('employees.add_certificate', 'Add Certificate')}</button>
                             </div>
                             
                             <div className="space-y-4">
                                 {form.certifications.length === 0 ? (
                                    <div className="p-8 text-center border border-dashed border-[var(--border-subtle)] rounded-3xl bg-[var(--bg-elevated)]/20 text-[11px] font-medium text-[var(--text-muted)]">{t('employees.no_certificates', 'No professional certificates logged.')}</div>
                                 ) : form.certifications.map((cert: any, i: number) => (
                                     <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[var(--bg-elevated)]/30 p-4 rounded-3xl border border-[var(--border-subtle)]/50 items-start">
                                         <div className="md:col-span-4"><FormField label={t('employees.cert_name', 'Certificate Name')} value={cert.name} onChange={(e: any) => { const newCerts = [...form.certifications]; newCerts[i].name = e.target.value; setForm({ ...form, certifications: newCerts }); }} placeholder="e.g. PMP" /></div>
                                         <div className="md:col-span-4"><FormField label={t('employees.issuing_authority', 'Issuing Authority')} value={cert.authority} onChange={(e: any) => { const newCerts = [...form.certifications]; newCerts[i].authority = e.target.value; setForm({ ...form, certifications: newCerts }); }} placeholder="e.g. PMI" /></div>
                                         <div className="md:col-span-3"><FormField label={t('employees.date_issued', 'Date Issued')} type="date" value={cert.issueDate} onChange={(e: any) => { const newCerts = [...form.certifications]; newCerts[i].issueDate = e.target.value; setForm({ ...form, certifications: newCerts }); }} /></div>
                                         <div className="md:col-span-1 py-1 flex justify-end">
                                             <button type="button" onClick={() => { const newCerts = [...form.certifications]; newCerts.splice(i, 1); setForm({ ...form, certifications: newCerts }); }} className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-[var(--text-inverse)] transition-all"><X size={14} /></button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     </div>
                 )}
              </form>

              <div className="px-10 py-10 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex justify-end gap-5">
                 <button onClick={() => setModal(null)} className="px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">{t('common.cancel')}</button>
                 <button type="submit" form="emp-form" disabled={saving} className="px-12 py-4 rounded-2xl bg-[var(--primary)] text-[var(--text-inverse)] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 hover:scale-[1.02] active:scale-95 transition-all">
                    {saving ? t('common.syncing') : (modal === 'create' ? t('employees.deploy_button') : t('common.save_changes'))}
                 </button>
              </div>
            </motion.div>
          </div>
        )}

        {modal === 'archive' && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setModal(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg bg-[var(--bg-card)] rounded-[3rem] border border-[var(--border-subtle)] p-12 text-center relative z-10 shadow-2xl">
                 <div className="w-20 h-20 mx-auto bg-rose-500/10 text-rose-600 rounded-[2rem] flex items-center justify-center mb-8 border border-rose-500/20">
                    <Archive size={32} />
                 </div>
                  <h3 className="text-3xl font-black text-[var(--text-primary)] tracking-tight mb-4">{t('employees.retire_personnel')}</h3>
                  <p className="text-[var(--text-secondary)] text-sm mb-10 leading-relaxed font-medium">
                     {t('employees.retirement_desc', { name: selected?.fullName })}
                  </p>
                  <div className="flex gap-4">
                     <button onClick={() => setModal(null)} className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-all">{t('common.cancel')}</button>
                     <button onClick={handleArchive} disabled={saving} className="flex-[2] py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-rose-600 text-[var(--text-inverse)] shadow-2xl shadow-rose-600/30 hover:bg-rose-500 transition-all">
                        {saving ? t('common.syncing') : t('employees.confirm_retirement')}
                     </button>
                  </div> 
              </motion.div>
           </div>
        )}

        {modal === 'hard_delete' && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setModal(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg bg-[var(--bg-card)] rounded-[3rem] border border-rose-500/10 p-12 text-center relative z-10 shadow-2xl">
                 <div className="w-20 h-20 mx-auto bg-rose-600 text-white rounded-[2rem] flex items-center justify-center mb-8 border border-rose-700/50 shadow-2xl shadow-rose-600/40">
                    <Trash2 size={32} />
                 </div>
                  <h3 className="text-3xl font-black text-rose-600 tracking-tight mb-4">{t('employees.permanent_removal')}</h3>
                  <p className="text-[var(--text-secondary)] text-sm mb-10 leading-relaxed font-medium">
                     {t('employees.permanent_removal_desc', { name: selected?.fullName })}
                  </p>
                  <div className="flex gap-4">
                     <button onClick={() => setModal(null)} className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-all">{t('common.cancel')}</button>
                     <button onClick={handleHardDelete} disabled={saving} className="flex-[2] py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-rose-600 text-[var(--text-inverse)] shadow-2xl shadow-rose-600/30 hover:bg-rose-500 transition-all">
                        {saving ? t('common.syncing') : t('employees.confirm_permanent_delete')}
                     </button>
                  </div> 
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
