import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MessageSquare, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

interface CheckIn {
  id: string;
  employeeId: string;
  managerId: string;
  scheduledAt: string;
  completedAt: string | null;
  notes: string | null;
  employee?: { fullName: string };
  manager?: { fullName: string };
}

const CheckIns: React.FC = () => {
  const { t } = useTranslation();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');

  const fetchCheckIns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/performance/check-ins');
      setCheckIns(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch check-ins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckIns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/performance/check-ins', {
        employeeId,
        scheduledAt,
        notes
      });
      setShowForm(false);
      setEmployeeId('');
      setScheduledAt('');
      setNotes('');
      fetchCheckIns();
    } catch (err) {
      console.error('Failed to create check-in');
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto page-enter p-6">
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[var(--text-primary)] tracking-tight leading-none">
            Check-Ins <span className="text-[var(--text-muted)] font-thin block xs:inline lg:ml-2">/ Continuous Performance</span>
          </h1>
          <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed">
            Synchronize expectations, align on goals, and remove blockers through regular touchpoints.
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="flex pb-1">
           <button
             onClick={() => setShowForm(!showForm)}
             className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-black uppercase tracking-widest flex items-center gap-3 hover:bg-[var(--accent)] hover:shadow-[0_0_20px_var(--primary)] hover:shadow-[var(--primary)]/30 transition-all active:scale-95"
           >
             <Plus size={18} /> {showForm ? 'Cancel' : 'Schedule Check-In'}
           </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Area */}
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-4"
          >
            <div className="nx-card p-8 bg-[var(--bg-elevated)] border border-[var(--primary)]/20">
              <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight mb-6">Schedule New Session</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-2">Employee ID</label>
                  <input 
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="nx-input w-full"
                    placeholder="Enter employee ID..."
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-2">Date & Time</label>
                  <input 
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="nx-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-2">Agenda / Notes</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="nx-input w-full h-32 resize-none"
                    placeholder="What will you discuss?"
                  />
                </div>
                <button type="submit" className="w-full py-4 rounded-xl bg-[var(--primary)] text-white text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-transform">
                  Confirm Schedule
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* List Area */}
        <div className={cn("space-y-6", showForm ? "lg:col-span-8" : "lg:col-span-12")}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Upcoming & Past Sessions</h3>
            <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-60">{checkIns.length} Records</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40 italic">
              <div className="w-10 h-10 border-2 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin mb-4" />
              <p className="text-[10px] uppercase font-black tracking-widest">Synchronizing records...</p>
            </div>
          ) : checkIns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40 bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-subtle)]">
              <div className="w-20 h-20 rounded-[2.5rem] bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)]">
                <Calendar size={32} />
              </div>
              <div>
                <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">No Check-Ins Found</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Schedule your first touchpoint above</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {checkIns.map((ci) => (
                <motion.div 
                  key={ci.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="nx-card p-6 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] hover:shadow-xl hover:shadow-[var(--primary)]/5 transition-all relative overflow-hidden group"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border",
                        ci.completedAt 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      )}>
                        {ci.completedAt ? <CheckCircle size={20} /> : <Clock size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border",
                            ci.completedAt 
                              ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" 
                              : "text-amber-500 bg-amber-500/10 border-amber-500/20"
                          )}>
                            {ci.completedAt ? 'Completed' : 'Scheduled'}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 flex items-center gap-1">
                            <Calendar size={10} /> {new Date(ci.scheduledAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-[14px] font-black tracking-tight text-[var(--text-primary)] mt-1">
                          Check-In with {ci.employee?.fullName || ci.employeeId}
                        </h4>
                        <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-1">
                          Manager: {ci.manager?.fullName || ci.managerId}
                        </p>
                        {ci.notes && (
                          <div className="mt-4 p-3 rounded-lg bg-[var(--bg-main)] text-[11px] text-[var(--text-secondary)] border border-[var(--border-subtle)] flex gap-2">
                            <MessageSquare size={12} className="text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                            <span className="italic">"{ci.notes}"</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckIns;
