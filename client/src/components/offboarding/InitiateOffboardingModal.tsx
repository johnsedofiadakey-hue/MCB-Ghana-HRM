import React, { useState, useEffect } from 'react';
import PulseModal from '../common/PulseModal';
import { UserX, Calendar, ClipboardList, AlertCircle, Rocket } from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';

interface InitiateOffboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const InitiateOffboardingModal = ({ isOpen, onClose, onSuccess }: InitiateOffboardingModalProps) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [form, setForm] = useState({
    employeeId: '',
    effectiveDate: '',
    reason: '',
    templateId: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/users?status=ACTIVE');
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/offboarding/templates');
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/offboarding/initiate', form);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PulseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Exit Process"
      subtitle="Start formal exit process"
      icon={UserX}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10 flex gap-4">
           <AlertCircle className="text-rose-500 shrink-0" size={24} />
           <div>
              <p className="text-xs font-black text-rose-500 uppercase tracking-widest leading-none">Security Precaution</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-tight">Initiating this process will trigger account revocation workflows on the specified effective date.</p>
           </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Employee for Exit</label>
          <div className="relative group">
            <UserX size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
            <select 
              required
              className="nx-input pl-12 appearance-none"
              value={form.employeeId}
              onChange={e => setForm({...form, employeeId: e.target.value})}
            >
              <option value="" className="bg-[var(--bg-card)] text-[var(--text-muted)]">Select active employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id} className="bg-[var(--bg-card)]">{emp.fullName} ({emp.employeeCode})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Exit Checklist Template</label>
          <div className="relative group">
            <ClipboardList size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
            <select 
              required
              className="nx-input pl-12 appearance-none"
              value={form.templateId}
              onChange={e => setForm({...form, templateId: e.target.value})}
            >
              <option value="" className="bg-[var(--bg-card)] text-[var(--text-muted)]">Select exit template...</option>
              {templates.map(temp => (
                <option key={temp.id} value={temp.id} className="bg-[var(--bg-card)]">{temp.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Effective Date of Exit</label>
          <div className="relative group">
            <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              required
              type="date"
              className="nx-input pl-12"
              value={form.effectiveDate}
              onChange={e => setForm({...form, effectiveDate: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Reason for Exit</label>
          <textarea 
            rows={3}
            required
            placeholder="Document the reason for exit (Resignation, Termination, Retirement)..."
            className="nx-input min-h-[100px] py-4"
            value={form.reason}
            onChange={e => setForm({...form, reason: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="p-4 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] flex items-center gap-3">
              <ClipboardList size={20} className="text-[var(--primary)]" />
              <div>
                 <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-tighter">Exit Checklist</p>
                 <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Auto-Generated</p>
              </div>
           </div>
           <div className="p-4 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] flex items-center gap-3 opacity-50">
              <Rocket size={20} className="text-slate-400" />
              <div>
                 <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-tighter">Account Closure</p>
                 <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Queued for Exit Date</p>
              </div>
           </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-subtle)]">
          <button 
            type="button" 
            onClick={onClose}
            className="px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Review Audit
          </button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="px-10 py-4 bg-rose-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-xl shadow-rose-500/20 flex items-center gap-2"
          >
            {loading ? "Starting..." : <><Rocket size={16} /> Start Exit Process</>}
          </motion.button>
        </div>
      </form>
    </PulseModal>
  );
};

export default InitiateOffboardingModal;
