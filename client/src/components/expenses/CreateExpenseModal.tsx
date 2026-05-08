import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import PulseModal from '../common/PulseModal';
import { Wallet, Receipt, FileText, CreditCard, Save } from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateExpenseModal = ({ isOpen, onClose, onSuccess }: CreateExpenseModalProps) => {
  const [loading, setLoading] = useState(false);
  const { settings } = useTheme();
  const [form, setForm] = useState({
    title: '',
    category: 'TRAVEL',
    amount: '',
    currency: settings?.currency || 'USD',
    description: '',
    receiptUrl: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/expenses', {
        ...form,
        amount: Number(form.amount)
      });
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
      title="File Claim"
      subtitle="Submit a new reimbursement request"
      icon={Wallet}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Claim Title</label>
          <div className="relative group">
            <Receipt size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              required
              placeholder="e.g. Flight to Kumasi / Client Dinner"
              className="nx-input pl-12"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 text-center md:text-left">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Category</label>
             <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)]">
                {['TRAVEL', 'MEALS', 'SUPPLIES', 'OTHER'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm({...form, category: cat})}
                    className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      form.category === cat 
                        ? "bg-[var(--primary)] text-white shadow-lg" 
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Amount & Currency</label>
             <div className="flex gap-2">
                <select 
                  className="nx-input-small w-24 text-center font-bold"
                  value={form.currency}
                  onChange={e => setForm({...form, currency: e.target.value})}
                >
                  <option value={settings?.currency || 'USD'}>{settings?.currency || 'USD'}</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GHS">GHS</option>
                  <option value="GNF">GNF</option>
                </select>
                <div className="relative group flex-1">
                  <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                  <input 
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="nx-input pl-12 font-mono font-bold"
                    value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})}
                  />
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Supporting Description</label>
          <textarea 
            rows={3}
            placeholder="Details about this expense for approval..."
            className="nx-input py-4 min-h-[100px]"
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
          />
        </div>

        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-[var(--bg-elevated)] to-transparent border border-[var(--border-subtle)] flex items-center justify-between group cursor-pointer hover:border-[var(--primary)]/30 transition-all">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] group-hover:scale-110 transition-transform">
                 <FileText size={20} />
              </div>
              <div>
                 <p className="text-sm font-bold text-[var(--text-primary)]">Upload Receipt</p>
                 <p className="text-[10px] text-[var(--text-muted)] uppercase font-black opacity-50">PDF, JPG, or PNG (Max 5MB)</p>
              </div>
           </div>
           <button type="button" className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--primary)] hover:text-white transition-all">Browse</button>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-subtle)]">
          <button 
            type="button" 
            onClick={onClose}
            className="px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="px-10 py-4 bg-[var(--primary)] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-xl shadow-[var(--primary)]/20 flex items-center gap-2"
          >
            {loading ? "Processing..." : <><Save size={16} /> Submit Claim</>}
          </motion.button>
        </div>
      </form>
    </PulseModal>
  );
};

export default CreateExpenseModal;
