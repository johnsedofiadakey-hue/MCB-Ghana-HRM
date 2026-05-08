import React, { useEffect, useState } from 'react';
import { Users, ChevronRight, Search, Clock } from 'lucide-react';
import api from '../services/api';
import { toast } from '../utils/toast';
import PageHeader from '../components/common/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import EmptyState from '../components/common/EmptyState';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '../utils/session';

const ManagerAppraisals: React.FC = () => {
  const [packets, setPackets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const user = getStoredUser();

  useEffect(() => {
    fetchTeamPackets();
  }, []);

  const fetchTeamPackets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/appraisals/team-packets');
      setPackets(Array.isArray(res.data) ? res.data.filter((p: any) => p.status !== 'CANCELLED') : []);
    } catch (err) {
      toast.error('Failed to update team record list.');
    } finally {
      setLoading(false);
    }
  };

  const [purging, setPurging] = useState(false);
  const handlePurgeOrphans = async () => {
    const isMD = (user as any).rank >= 90;
    const confirmMsg = isMD 
      ? "SYSTEM CLEANUP: Would you like to perform a FULL DATA RESET? This will permanently delete EVERY appraisal record (Cycles, Packets, Reviews, and Scores) to ensure the system is fresh for your handover. This cannot be undone."
      : "DATA CLEANUP: This will identify and permanently delete all orphaned appraisal packets and stale data cluttering the dashboard. Proceed?";
    
    if (!confirm(confirmMsg)) return;
    
    try {
      setPurging(true);
      // If MD, use the absolute ultimate-reset. Otherwise use the standard orphan purge.
      const endpoint = isMD ? '/appraisals/ultimate-reset' : '/appraisals/purge-orphans';
      const res = await api.post(endpoint);
      toast.success(res.data.message);
      fetchTeamPackets();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Purge Failed");
    } finally {
      setPurging(false);
    }
  };

  const isActionRequired = (packet: any) => {
    if (packet.status !== 'OPEN') return false;
    const stage = packet.currentStage;
    if (stage === 'SUPERVISOR_REVIEW' && packet.supervisorId === user.id) return true;
    if (stage === 'MATRIX_REVIEW' && packet.matrixSupervisorId === user.id) return true;
    if (stage === 'MANAGER_REVIEW' && packet.managerId === user.id) return true;
    if (stage === 'HR_REVIEW' && packet.hrReviewerId === user.id) return true;
    if (stage === 'FINAL_REVIEW' && packet.finalReviewerId === user.id) return true;
    return false;
  };

  const filteredPackets = (packets || []).filter(p => 
    p?.employee?.fullName?.toLowerCase().includes(searchTerm?.toLowerCase() || '')
  );

  if (loading) return <div className="p-20 text-center animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-500">Loading team performance data...</div>;

  return (
    <div className="space-y-8 page-enter pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <PageHeader 
          title="Team Reviews"
          description="Monitor and calibrate performance across your reporting lines."
          icon={Users}
          variant="purple"
        />
        <div className="flex items-center gap-4 w-full md:w-auto">
           {user.rank >= 85 && (
             <button 
               onClick={handlePurgeOrphans}
               disabled={purging}
               className="btn-secondary h-[52px] px-6 border-[var(--error)]/20 text-[var(--error)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--error)]/5 transition-all"
             >
               {purging ? "Cleaning..." : "Cleanup Data"}
             </button>
           )}
           <div className="relative flex-1 md:w-64">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input 
                type="text" 
                placeholder="Search personnel..." 
                className="glass-input w-full pl-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredPackets.length > 0 ? (
            filteredPackets.map((packet) => {
              const actionNeeded = isActionRequired(packet);
              return (
                <motion.div
                  key={packet.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => navigate(`/reviews/packet/${packet.id}`)}
                  className={cn(
                    "glass p-6 rounded-[2rem] border-white/5 bg-slate-900/40 hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden",
                    actionNeeded && "ring-2 ring-[var(--warning)]/30 border-[var(--warning)]/20"
                  )}
                >
                  {actionNeeded && (
                    <div className="absolute top-0 right-0 px-4 py-1.5 bg-[var(--warning)] text-black text-[8px] font-black uppercase tracking-widest rounded-bl-2xl">
                       Action Required
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center border border-white/10 font-black text-[10px] text-white">
                           {packet?.employee?.fullName?.charAt(0) || '?'}
                       </div>
                       <div>
                          <h3 className="text-sm font-bold text-white leading-tight">{packet.employee.fullName}</h3>
                          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{packet.employee.jobTitle}</p>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                     <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Active Stage</span>
                         <span className="text-[10px] font-black text-[var(--primary-light)] uppercase tracking-widest">{(packet?.currentStage || 'OPEN').replace(/_/g, ' ')}</span>
                     </div>
                     <p className="text-[10px] font-bold text-[var(--text-secondary)] px-1">{packet.cycle?.title}</p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <Clock size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Updated {format(new Date(packet.updatedAt), 'PP')}
                      </span>
                    </div>
                    <div className="text-[var(--primary-light)] group-hover:translate-x-1 transition-transform">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full">
              <EmptyState 
                title="Team List Updated"
                description="No appraisal packets identified for the current team segment."
                icon={Users}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ManagerAppraisals;
