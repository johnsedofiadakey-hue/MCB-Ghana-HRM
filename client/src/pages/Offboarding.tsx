import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UserX, Package, FileText, CheckCircle2,
  ArrowRight, Shield, AlertCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import api from '../services/api';
import { getStoredUser } from '../utils/session';
import InitiateOffboardingModal from '../components/offboarding/InitiateOffboardingModal';
import OffboardingDetailsModal from '../components/offboarding/OffboardingDetailsModal';

const Offboarding = () => {
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const user = getStoredUser();
  const rank = user?.rank || 0;
  const isHR = rank >= 85;

  // Strict structural guard: staff leaving is not for self-service or lower management
  if (rank < 85) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <Shield size={64} className="text-[var(--error)] opacity-20" />
        <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter italic">Access <span className="text-[var(--error)]">Restricted</span></h2>
        <p className="max-w-md text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] opacity-60">
          The "Staff Leaving" Management module is strictly reserved for HR and Institutional Authority.
        </p>
      </div>
    );
  }

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/offboarding/list');
      setProcesses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffboarding = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('CRITICAL ACTION: Are you sure you want to permanently delete this exit process and all associated records? This cannot be undone.')) return;
    try {
      setLoading(true);
      await api.delete(`/offboarding/${id}`);
      toast.success('Offboarding process successfully deleted.');
      fetchProcesses();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete record.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTheme = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20';
      case 'INITIATED': return 'bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20';
      case 'ASSET_RETURN': return 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20';
      case 'INTERVIEW': return 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const steps = [
    { label: 'Initiation', icon: UserX, description: 'Formal exit request logged.' },
    { label: 'Asset Return', icon: Package, description: 'Laptops, cards, and keys.' },
    { label: 'Interview', icon: FileText, description: 'Exit feedback session.' },
    { label: 'Clearance', icon: CheckCircle2, description: 'Final dues and deactivation.' },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)] uppercase">
            Staff Exit <span className="text-[var(--primary)]">Manager</span>
          </h1>
          <p className="text-[10px] md:text-[12px] text-[var(--text-muted)] mt-2 font-medium italic opacity-60 leading-relaxed">Manage staff clearance and exit processes.</p>
        </div>
        {isHR && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary w-full sm:w-auto"
          >
            <UserX size={18} />
            Start Exit Process
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Progress Tracker Placeholder */}
        <div className="lg:col-span-3 space-y-8">
          <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl relative overflow-hidden bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)]/30">
             <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
               {steps.map((step, i) => (
                 <div key={i} className="flex flex-col items-center text-center gap-5 group flex-1">
                   <div className={cn(
                     "w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-700 shadow-xl border",
                     i === 0 ? "bg-[var(--primary)] text-white border-white/20 scale-110 rotate-3" : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)] opacity-40"
                   )}>
                     <step.icon size={28} />
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">{step.label}</p>
                     <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-2 max-w-[120px] opacity-40 leading-relaxed">{step.description}</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>

          {/* Active Separation List */}
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter italic">Active <span className="text-[var(--error)]">Exits</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {loading ? (
                 <div className="col-span-2 py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-[var(--error)]/10 border-t-[var(--error)] animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">Loading Records...</p>
                 </div>
               ) : processes.length === 0 ? (
                 <div className="col-span-2 p-16 rounded-[2.5rem] bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)] text-center opacity-40">
                    <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.3em]">No active exit processes found.</p>
                 </div>
               ) : (
                 processes.map((p) => (
                   <motion.div
                    key={p.id}
                    onClick={() => setSelectedProcessId(p.id)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--error)]/40 transition-all cursor-pointer shadow-xl group relative overflow-hidden"
                   >
                     <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center font-black text-white shadow-lg">
                           {p.employee?.fullName?.[0]}
                         </div>
                         <div>
                           <p className="text-sm font-black text-[var(--text-primary)] group-hover:text-[var(--error)] transition-colors uppercase tracking-tight">{p.employee?.fullName}</p>
                           <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest opacity-60">{p.employee?.employeeCode} · {p.employee?.jobTitle}</p>
                         </div>
                       </div>
                       <span className={cn("px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border shadow-sm", getStatusTheme(p.status))}>
                         {p.status}
                       </span>
                       {rank >= 90 && (
                          <button 
                            onClick={(e) => handleDeleteOffboarding(e, p.id)}
                            className="ml-2 p-2 rounded-xl bg-[var(--error)]/5 text-[var(--error)] hover:bg-[var(--error)] hover:text-white transition-all border border-[var(--error)]/10"
                            title="Delete Process"
                          >
                            <UserX size={14} />
                          </button>
                        )}
                     </div>
                     <div className="space-y-4">
                       <div className="flex justify-between text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] opacity-40">
                         <span>Clearance Progress</span>
                         <span>{p.status === 'COMPLETED' ? '100' : p.status === 'INTERVIEW' ? '75' : p.status === 'ASSET_RETURN' ? '50' : '25'}%</span>
                       </div>
                       <div className="h-2 rounded-full bg-[var(--bg-sidebar-active)] overflow-hidden shadow-inner font-mono">
                         <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: p.status === 'COMPLETED' ? '100%' : p.status === 'INTERVIEW' ? '75%' : p.status === 'ASSET_RETURN' ? '50%' : '25%' }}
                          className="h-full bg-gradient-to-r from-[var(--error)] to-[var(--error)] rounded-full shadow-[0_0_15px_rgba(244,63,94,0.4)]" 
                         />
                       </div>
                     </div>
                     <div className="absolute bottom-[-10px] right-[-10px] p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                        <ArrowRight size={40} className="rotate-[-45deg]" />
                     </div>
                   </motion.div>
                 ))
               )}
            </div>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-8">
           <div className="p-8 rounded-[3rem] bg-slate-900 text-white shadow-3xl relative overflow-hidden group">
             <div className="relative z-10">
               <Shield className="text-[var(--warning-light)] mb-6" size={40} />
               <h3 className="font-black text-xl uppercase tracking-tighter">Knowledge <span className="text-[var(--warning-light)]">Transfer</span></h3>
               <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mt-4 leading-relaxed">Ensure all files, passwords, and documents are handed over before the final sign-off.</p>
               <button className="mt-8 w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                 Security Checklist <ArrowRight size={14} />
               </button>
             </div>
             <Shield size={120} className="absolute bottom-[-30px] left-[-30px] text-white/5 rotate-[-15deg] group-hover:rotate-0 transition-transform duration-1000" />
           </div>

           <div className="p-8 rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl relative">
             <h3 className="font-black text-[var(--text-primary)] mb-6 flex items-center gap-3 text-xs uppercase tracking-widest">
                <div className="w-8 h-8 rounded-lg bg-[var(--error)]/10 flex items-center justify-center text-[var(--error)]"><AlertCircle size={16} /></div>
                Critical Reminders
             </h3>
             <ul className="space-y-4">
               {[
                 'Revoke VPN Access',
                 'Disable SSO / G-Suite',
                 'Final PAYE Settlement',
                 'Reclaim Physical Hardware'
               ].map((item, i) => (
                 <li key={i} className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] py-3 border-b border-[var(--border-subtle)]/50 last:border-0 opacity-60 hover:opacity-100 transition-opacity">
                   <div className="w-1.5 h-1.5 rounded-full bg-[var(--error)] shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                   {item}
                 </li>
               ))}
             </ul>
           </div>
        </div>
      </div>

      <InitiateOffboardingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchProcesses} 
      />

      <OffboardingDetailsModal 
        isOpen={!!selectedProcessId}
        processId={selectedProcessId || ''}
        onClose={() => { setSelectedProcessId(null); fetchProcesses(); }}
      />
    </div>
  );
};

export default Offboarding;
