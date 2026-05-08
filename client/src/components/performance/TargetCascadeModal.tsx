import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Search, Save } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';

interface Props {
  target: any;
  onClose: () => void;
  onSuccess: () => void;
}

const TargetCascadeModal: React.FC<Props> = ({ target, onClose, onSuccess }) => {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/users/me/team');
      // Normalize response from getMyTeam [name -> fullName, role -> jobTitle]
      const team = (Array.isArray(res.data) ? res.data : []).map(u => ({
        ...u,
        fullName: u.fullName || u.name,
        jobTitle: u.jobTitle || u.role
      }));
      setStaff(team);
    } catch (err) {
      toast.error('Failed to load team roster.');
    } finally {
      setLoading(false);
    }
  };

  const handleCascade = async () => {
    const activeAssignments = Object.entries(assignments)
      .filter(([_, weight]) => weight > 0)
      .map(([id, weight]) => ({ staffId: id, weightRatio: weight / 100 }));

    if (activeAssignments.length === 0) {
      toast.error('Select at least one staff member to cascade.');
      return;
    }

    try {
      await api.post(`/targets/${target.id}/cascade`, { assignments: activeAssignments });
      toast.success('Strategy cascaded to operational levels.');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Cascade failed');
    }
  };

  const filteredStaff = (staff || []).filter(s => s?.fullName?.toLowerCase().includes(searchTerm?.toLowerCase() || ''));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--primary)]/5">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/20 flex items-center justify-center border border-[var(--primary)]/20 text-[var(--primary)]">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-widest">Cascade Strategy</h2>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">Operational Decomposition: {target.title}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-elevated)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          <div className="relative">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
             <input 
               type="text" 
               placeholder="Search staff members..." 
               className="nx-input w-full pl-12 shadow-none"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 text-[var(--text-muted)] animate-pulse text-[10px] uppercase font-black tracking-widest">Syncing Roster...</div>
            ) : filteredStaff.map(member => (
              <div key={member.id} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] hover:border-[var(--primary)]/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)] font-black text-[10px] text-[var(--text-primary)]">
                   {member?.fullName?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[var(--text-primary)]">{member.fullName}</p>
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{member.jobTitle}</p>
                </div>
                <div className="flex items-center gap-3">
                   <input 
                     type="number" 
                     placeholder="%" 
                     className="w-16 h-10 nx-input text-center text-xs"
                     value={assignments[member.id] || ''}
                     onChange={(e) => setAssignments({ ...assignments, [member.id]: parseFloat(e.target.value) || 0 })}
                   />
                   <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">% Weight</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-[var(--border-subtle)] flex gap-4">
           <button 
             onClick={onClose}
             className="flex-1 py-4 rounded-2xl bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[var(--bg-elevated)]/80"
           >
             Abort
           </button>
           <button 
             onClick={handleCascade}
             className="flex-1 py-4 rounded-2xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-[0.3em] hover:brightness-110 shadow-xl shadow-[var(--primary)]/20 flex items-center justify-center gap-2"
           >
             <Save size={16} /> Deploy Cascade
           </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TargetCascadeModal;
