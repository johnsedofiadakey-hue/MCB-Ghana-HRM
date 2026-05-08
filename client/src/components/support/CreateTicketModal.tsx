import React, { useState } from 'react';
import PulseModal from '../common/PulseModal';
import { LifeBuoy, FileQuestion, Layers, AlertTriangle, Send } from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTicketModal = ({ isOpen, onClose, onSuccess }: CreateTicketModalProps) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    category: 'IT',
    priority: 'NORMAL',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/support/tickets', form);
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
      title="Create Ticket"
      subtitle="Briefly describe the issue for support"
      icon={LifeBuoy}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Ticket Subject</label>
          <div className="relative group">
            <FileQuestion size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              required
              placeholder="e.g. Printer Offline / Payroll Query / VPN Issue"
              className="nx-input pl-12"
              value={form.subject}
              onChange={e => setForm({...form, subject: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Support Category</label>
             <div className="relative group">
               <Layers size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
               <select 
                 className="nx-input pl-12 appearance-none"
                 value={form.category}
                 onChange={e => setForm({...form, category: e.target.value})}
               >
                 {['IT', 'HR', 'FINANCE', 'MAINTENANCE', 'OTHER'].map(cat => (
                   <option key={cat} value={cat} className="bg-[var(--bg-card)]">{cat} SUPPORT</option>
                 ))}
               </select>
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Priority Level</label>
             <div className="relative group">
               <AlertTriangle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
               <select 
                 className="nx-input pl-12 appearance-none"
                 value={form.priority}
                 onChange={e => setForm({...form, priority: e.target.value})}
               >
                 {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => (
                   <option key={p} value={p} className="bg-[var(--bg-card)]">{p} PRIORITY</option>
                 ))}
               </select>
             </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Elaborate on the issue</label>
          <textarea 
            rows={4}
            placeholder="Please provide specifics (e.g., error codes, screenshots URL, specific dates) to help us resolve the issue faster..."
            className="nx-input min-h-[140px] py-4"
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-subtle)]">
          <button 
            type="button" 
            onClick={onClose}
            className="px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Discard
          </button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="px-10 py-4 bg-[var(--primary)] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-xl shadow-[var(--primary)]/20 flex items-center gap-2"
          >
            {loading ? "Engaging Support..." : <><Send size={16} /> Open Ticket</>}
          </motion.button>
        </div>
      </form>
    </PulseModal>
  );
};

export default CreateTicketModal;
