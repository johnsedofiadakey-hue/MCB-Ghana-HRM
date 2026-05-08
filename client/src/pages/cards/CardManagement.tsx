import React, { useState, useEffect } from 'react';
import { CreditCard, Shield, User, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

interface Card {
  id: string;
  employeeId: string;
  cardNumber: string;
  status: 'REQUESTED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  issuedAt: string | null;
  employee?: { fullName: string };
}

const CardManagement: React.FC = () => {
  const { t } = useTranslation();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cards');
      setCards(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch cards');
      // Fallback mock data
      setCards([
        { id: '1', employeeId: 'EMP001', cardNumber: 'MCB-99281', status: 'ACTIVE', issuedAt: new Date().toISOString(), employee: { fullName: 'John Doe' } },
        { id: '2', employeeId: 'EMP002', cardNumber: 'MCB-99282', status: 'REQUESTED', issuedAt: null, employee: { fullName: 'Jane Smith' } }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/cards', {
        employeeId,
        cardNumber,
        status: 'REQUESTED'
      });
      setShowForm(false);
      setEmployeeId('');
      setCardNumber('');
      fetchCards();
    } catch (err) {
      console.error('Failed to request card');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/cards/${id}`, { status });
      fetchCards();
    } catch (err) {
      console.error('Failed to update card status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'REQUESTED': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'SUSPENDED': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-[var(--text-muted)] bg-[var(--bg-elevated)] border-[var(--border-subtle)]';
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto page-enter p-6">
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[var(--text-primary)] tracking-tight leading-none">
            Card Lifecycle <span className="text-[var(--text-muted)] font-thin block xs:inline lg:ml-2">/ Employee Experience</span>
          </h1>
          <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed">
            Manage physical access cards, biometric synchronization, and hardware integration.
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="flex pb-1">
           <button
             onClick={() => setShowForm(!showForm)}
             className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-black uppercase tracking-widest flex items-center gap-3 hover:bg-[var(--accent)] hover:shadow-[0_0_20px_var(--primary)] hover:shadow-[var(--primary)]/30 transition-all active:scale-95"
           >
             <Plus size={18} /> {showForm ? 'Cancel' : 'Request Card'}
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
              <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight mb-6">Request New Card</h3>
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-2">Card Number (Optional)</label>
                  <input 
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="nx-input w-full"
                    placeholder="Auto-generated if blank"
                  />
                </div>
                <button type="submit" className="w-full py-4 rounded-xl bg-[var(--primary)] text-white text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-transform">
                  Submit Request
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* List Area */}
        <div className={cn("space-y-6", showForm ? "lg:col-span-8" : "lg:col-span-12")}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Active Inventory & Requests</h3>
            <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-60">{cards.length} Records</span>
          </div>

          {loading && cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40 italic">
              <div className="w-10 h-10 border-2 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin mb-4" />
              <p className="text-[10px] uppercase font-black tracking-widest">Inventory scan in progress...</p>
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40 bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-subtle)]">
              <div className="w-20 h-20 rounded-[2.5rem] bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)]">
                <CreditCard size={32} />
              </div>
              <div>
                <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">No Cards Found</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Issue your first card above</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {cards.map((card) => (
                <motion.div 
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="nx-card p-6 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] hover:shadow-xl hover:shadow-[var(--primary)]/5 transition-all relative overflow-hidden group"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0 border border-[var(--primary)]/20">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border", getStatusColor(card.status))}>
                            {card.status}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 flex items-center gap-1">
                            <Clock size={10} /> {card.issuedAt ? new Date(card.issuedAt).toLocaleDateString() : 'Pending'}
                          </span>
                        </div>
                        <h4 className="text-[14px] font-black tracking-tight text-[var(--text-primary)] mt-1">
                          {card.employee?.fullName || card.employeeId}
                        </h4>
                        <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-1">
                          Card Number: <span className="font-mono">{card.cardNumber}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {card.status === 'REQUESTED' && (
                        <button 
                          onClick={() => updateStatus(card.id, 'ACTIVE')}
                          className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          Approve
                        </button>
                      )}
                      {card.status === 'ACTIVE' && (
                        <button 
                          onClick={() => updateStatus(card.id, 'SUSPENDED')}
                          className="px-4 py-2 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                        >
                          Suspend
                        </button>
                      )}
                      {card.status === 'SUSPENDED' && (
                        <button 
                          onClick={() => updateStatus(card.id, 'ACTIVE')}
                          className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          Reactivate
                        </button>
                      )}
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

export default CardManagement;
