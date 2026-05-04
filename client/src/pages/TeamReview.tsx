import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Users, Target, ShieldCheck, AlertCircle, CheckCircle, PlusCircle, History } from 'lucide-react';
import AssignKpiModal from '../components/AssignKpiModal';
import ReviewKpiModal from '../components/ReviewKpiModal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRankFromRole } from '../utils/session';
import PageHeader from '../components/common/PageHeader';
import FlowSteps from '../components/common/FlowSteps';
import EmptyState from '../components/common/EmptyState';

interface Employee {
  id: string;
  fullName: string;
  jobTitle: string;
  avatarUrl: string | null;
  kpiSheets: { id: string; totalScore: number | null; status: string }[];
}

const statusColors: Record<string, string> = {
  NO_GOALS: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  PENDING_APPROVAL: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  LOCKED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

// 🔒 LOCAL HELPER (Inlined to prevent ReferenceError in production bundle)
const ROLE_RANK_MAP: Record<string, number> = {
    DEV: 100, MD: 95, DIRECTOR: 90, HR_MANAGER: 88, FINANCE_MANAGER: 87,
    IT_MANAGER: 85, IT_ADMIN: 85, HR_OFFICER: 80, MANAGER: 75,
    SUPERVISOR: 65, STAFF: 50, CASUAL: 40,
    'MANAGING DIRECTOR': 95, 'SYSTEM DEVELOPER': 100
};

const getRank = (role?: string): number => {
  if (!role) return 0;
  return ROLE_RANK_MAP[role.toUpperCase()] ?? 0;
};

const TeamReview = () => {
  const currentUser = getStoredUser();
  const { t } = useTranslation();
  const canManageTeam = getRank(currentUser?.role) >= 60;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mandates, setMandates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(currentUser.departmentId?.toString() || '');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  useEffect(() => {
    if (canManageTeam) fetchData();
    else setLoading(false);
  }, [canManageTeam, selectedDeptId]);

  const fetchData = async () => {
    try {
      const u = getStoredUser();
      if (!u?.id) { setEmployees([]); return; }

      const [teamRes, mandateRes, deptRes] = await Promise.all([
        api.get('/team/list', { params: { supervisorId: u.id } }),
        api.get('/kpis/mandates', { params: { departmentId: selectedDeptId || u.departmentId } }),
        api.get('/departments')
      ]);

      const list = (Array.isArray(teamRes.data) ? teamRes.data : []) as any[];
      setMandates(Array.isArray(mandateRes.data) ? mandateRes.data : []);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);

      const mapped: Employee[] = list.map(emp => {
        const hasSheets = Array.isArray(emp.kpiSheets) && emp.kpiSheets.length;
        const fallbackSheets = typeof emp.lastScore === 'number' ? [{
          id: emp.lastSheetId || `latest-${emp.id}`,
          totalScore: emp.lastScore,
          status: emp.status === 'On Track' ? 'LOCKED' : emp.status === 'Needs Attention' ? 'PENDING_APPROVAL' : 'NO_GOALS'
        }] : [];
        return {
          id: emp.id || 'unknown',
          fullName: emp.fullName || emp.name || 'Unknown Employee',
          jobTitle: emp.jobTitle || emp.role || 'Unassigned',
          avatarUrl: emp.avatarUrl || emp.avatar || null,
          kpiSheets: hasSheets ? emp.kpiSheets : fallbackSheets
        };
      });
      setEmployees(mapped);
    } catch (err) { 
      console.error('[TeamReview] fetchData error:', err);
      setEmployees([]); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleOpenAssign = (emp: Employee) => {
    setSelectedEmployee({ id: emp.id, name: emp.fullName });
    setIsModalOpen(true);
  };
  const handleOpenReview = (emp: Employee, sheetId: string) => {
    setSelectedEmployee({ id: emp.id, name: emp.fullName });
    setSelectedSheetId(sheetId);
    setIsReviewOpen(true);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Target size={32} className="animate-spin text-primary-light" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Syncing team strategy...</p>
    </div>
  );

  if (!canManageTeam) return (
    <div className="nx-card p-16 text-center mt-10">
      <AlertCircle size={48} className="mx-auto mb-6 opacity-20 text-[var(--text-muted)]" />
      <h2 className="text-xl font-bold text-[var(--text-secondary)] mb-2 tracking-tight">Access Denied</h2>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">Management access is required to set team strategy.</p>
    </div>
  );

  return (
    <div className="space-y-10 page-enter min-h-screen pb-20">
      <PageHeader 
        title="Team Operational KPIs"
        description="Deconstruct departmental strategic mandates into actionable team targets. Assign specific goals to your direct reports."
        icon={Users}
        variant="indigo"
      />

      <FlowSteps 
        currentStep={2}
        variant="indigo"
        steps={[
          { id: 1, label: 'Department KPI', description: 'Strategic Mandate' },
          { id: 2, label: 'Team Targets', description: 'Operational Decomp' },
          { id: 3, label: 'Member Execution', description: 'Individual Focus' },
        ]}
      />

      {/* Strategic Intent Architecture */}
      <AnimatePresence>
        {mandates.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Target size={120} className="text-emerald-500" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="text-emerald-400" size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400">Departmental Strategic KPI Mandates</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Top-Down Directives set by MD / HQ</p>
                    {getRank(currentUser?.role) >= 70 && (
                      <select 
                        value={selectedDeptId}
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                        className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-3 py-1 rounded-lg outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
                      >
                         {departments.map(d => (
                           <option key={d.id} value={d.id} className="bg-[#0f172a]">{d.name}</option>
                         ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mandates.map((m: any, idx: number) => (
                  <div key={idx} className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-emerald-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-600">{m.title}</h4>
                      <span className="text-[9px] font-black px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 uppercase">Mandate</span>
                    </div>
                    <div className="space-y-2">
                       {m.items.map((item: any, i: number) => (
                         <div key={i} className="flex justify-between text-[10px] text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-2">
                           <span className="font-medium">• {item.name}</span>
                           <span className="font-black text-emerald-500/50">W: {item.weight}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header and description removed as they are now in PageHeader */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {employees.length === 0 ? (
          <div className="col-span-full">
            <EmptyState 
              title="No Team Members Found"
              description="You do not have any direct reports assigned. Team targets can only be set for employees under your supervision."
              icon={Users}
              variant="slate"
              action={{
                label: "View Labor Force",
                onClick: () => window.location.href = '/employees',
                icon: Users
              }}
            />
          </div>
        ) : (
          employees.map((emp) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative"
            >
              <div className="nx-card p-8 flex flex-col h-full">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden shadow-2xl shadow-primary/5">
                      {emp.avatarUrl ? (
                        <img src={emp.avatarUrl} alt={emp.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="text-primary-light" size={24} />
                      )}
                    </div>
                    <div>
                       <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{emp.fullName}</h3>
                       <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mt-1">{emp.jobTitle}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-6 mb-8">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                       <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Execution Level</span>
                      {emp.kpiSheets.length > 0 && (
                        <span className="text-xs font-bold text-[var(--primary)]">
                          {Number(emp.kpiSheets[0].totalScore || 0).toFixed(1)}%
                        </span>
                      )}
                    </div>
                     <div className="h-2 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(emp.kpiSheets[0]?.totalScore || 0, 100)}%` }}
                        className="h-full bg-gradient-to-r from-primary via-primary-light to-accent rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {emp.kpiSheets.length > 0 ? (
                      <div className={cn(
                        "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
                        statusColors[emp.kpiSheets[0].status] || statusColors.NO_GOALS
                      )}>
                        {emp.kpiSheets[0].status === 'LOCKED' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                        {t(`performance.status.${emp.kpiSheets[0].status}`)}
                      </div>
                    ) : (
                      <div className={cn("px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-2", statusColors.NO_GOALS)}>
                        <AlertCircle size={10} /> NO MISSION SET
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleOpenAssign(emp)}
                    className="flex-1 py-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary-light text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all duration-300 shadow-lg shadow-primary/5 group/btn"
                  >
                    <PlusCircle size={14} className="inline mr-2 group-hover/btn:rotate-90 transition-transform" />
                    Set Operational KPIs
                  </button>
                  {emp.kpiSheets.length > 0 && (
                     <button 
                       onClick={() => handleOpenReview(emp, emp.kpiSheets[0].id)}
                       className="w-14 h-14 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--bg-card)] hover:text-[var(--primary)] transition-all"
                     >
                      <History size={20} className="group-hover/rev:scale-110 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AssignKpiModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        employeeId={selectedEmployee?.id || ''}
        employeeName={selectedEmployee?.name || ''}
        onSuccess={fetchData}
      />

      {selectedSheetId && (
        <ReviewKpiModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          sheetId={selectedSheetId}
          employeeName={selectedEmployee?.name || ''}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default TeamReview;
