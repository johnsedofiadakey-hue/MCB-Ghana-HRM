import React, { useState, useEffect } from 'react';
import { CreditCard, Shield, User, Clock, CheckCircle, XCircle, Plus, Palette, ShieldCheck, AlertTriangle, Building2, Globe } from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';
import EmployeeIDCard from '../../components/it/EmployeeIDCard';
import toast from 'react-hot-toast';

interface Card {
  id: string;
  employeeId: string;
  cardNumber: string;
  status: 'REQUESTED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  issuedAt: string | null;
  employee?: { fullName: string };
}

const ColorPicker = ({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (val: string) => void }) => (
  <div className="space-y-3">
    <label htmlFor={id} className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">{label}</label>
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl border-2 border-[var(--border-subtle)] shadow-sm relative overflow-hidden group/color cursor-pointer" style={{ backgroundColor: value }}>
        <input 
          type="color" 
          id={id}
          value={value} 
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/color:opacity-100 flex items-center justify-center transition-opacity">
          <Palette size={14} className="text-white" />
        </div>
      </div>
      <input 
        type="text" 
        className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3 text-xs font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none font-mono transition-all"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  </div>
);

const CardManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'issuance' | 'design'>('issuance');
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Issuance Form state
  const [employeeId, setEmployeeId] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  // Design state (Settings)
  const [settings, setSettings] = useState<any>({});
  const [formData, setFormData] = useState({
    idCardPrimaryColor: '#009EE3',
    idCardAccentColor: '#EE7100',
    idCardOrientation: 'VERTICAL',
    idCardTheme: 'DARK',
    idCardShowLogo: true,
    idCardShowQrCode: true,
    idCardSecurityText: 'Terms of Use',
    idCardBackMessage: 'This card belongs to...',
    companyName: 'MCB Ghana',
    companyLogoUrl: ''
  });

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cards');
      setCards(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch cards');
      setCards([
        { id: '1', employeeId: 'EMP001', cardNumber: 'MCB-99281', status: 'ACTIVE', issuedAt: new Date().toISOString(), employee: { fullName: 'John Doe' } },
        { id: '2', employeeId: 'EMP002', cardNumber: 'MCB-99282', status: 'REQUESTED', issuedAt: null, employee: { fullName: 'Jane Smith' } }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      const data = res.data;
      setSettings(data);
      setFormData({
        idCardPrimaryColor: data.idCardPrimaryColor || '#009EE3',
        idCardAccentColor: data.idCardAccentColor || '#EE7100',
        idCardOrientation: data.idCardOrientation || 'VERTICAL',
        idCardTheme: data.idCardTheme || 'DARK',
        idCardShowLogo: data.idCardShowLogo ?? true,
        idCardShowQrCode: data.idCardShowQrCode ?? true,
        idCardSecurityText: data.idCardSecurityText || 'Terms of Use',
        idCardBackMessage: data.idCardBackMessage || 'This card belongs to...',
        companyName: data.name || 'MCB Ghana',
        companyLogoUrl: data.companyLogoUrl || ''
      });
    } catch (err) {
      console.error('Failed to fetch settings');
    }
  };

  useEffect(() => {
    fetchCards();
    fetchSettings();
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
      toast.success('Card requested successfully');
    } catch (err) {
      console.error('Failed to request card');
      toast.error('Failed to request card');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/cards/${id}`, { status });
      fetchCards();
      toast.success(`Card status updated to ${status}`);
    } catch (err) {
      console.error('Failed to update card status');
      toast.error('Failed to update card status');
    }
  };

  const handleSaveDesign = async () => {
    try {
      await api.put('/settings', formData);
      toast.success('Card design saved successfully');
      fetchSettings();
    } catch (err) {
      console.error('Failed to save design');
      toast.error('Failed to save design');
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
            Card Management <span className="text-[var(--text-muted)] font-thin block xs:inline lg:ml-2">/ IT Hub</span>
          </h1>
          <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed">
            Manage physical access cards, design templates, and security features in one place.
          </p>
        </motion.div>
        
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('issuance')}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'issuance' ? "bg-[var(--primary)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
            )}
          >
            Issuance & Inventory
          </button>
          <button
            onClick={() => setActiveTab('design')}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'design' ? "bg-[var(--primary)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
            )}
          >
            Design & Security
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'issuance' && (
          <motion.div
            key="issuance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Form Area */}
            <div className="lg:col-span-4 space-y-6">
              <button
                onClick={() => setShowForm(!showForm)}
                className="w-full px-6 py-4 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/50 transition-all"
              >
                <Plus size={18} /> {showForm ? 'Cancel Request' : 'New Card Request'}
              </button>

              {showForm && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="nx-card p-8 bg-[var(--bg-elevated)] border border-[var(--primary)]/20"
                >
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
                </motion.div>
              )}
            </div>

            {/* List Area */}
            <div className="lg:col-span-8 space-y-6">
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
          </motion.div>
        )}

        {activeTab === 'design' && (
          <motion.div
            key="design"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Controls */}
              <div className="space-y-8">
                <section className="space-y-6 p-8 rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-left relative overflow-hidden group/card">
                   <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)]">
                          <Palette size={22} />
                      </div>
                      <div>
                         <h4 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Visual DNA</h4>
                         <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] opacity-60">Colors & Orientation</p>
                      </div>
                   </div>

                   <div className="space-y-10 relative z-10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                          <ColorPicker 
                              id="idCardPrimaryColor" 
                              label="Primary Identity" 
                              value={formData.idCardPrimaryColor} 
                              onChange={val => setFormData({...formData, idCardPrimaryColor: val})} 
                          />
                          <ColorPicker 
                              id="idCardAccentColor" 
                              label="Security Accent" 
                              value={formData.idCardAccentColor} 
                              onChange={val => setFormData({...formData, idCardAccentColor: val})} 
                          />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Architecture</label>
                             <div className="grid grid-cols-2 p-1 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
                                <button 
                                   onClick={() => setFormData({...formData, idCardOrientation: 'VERTICAL'})}
                                   className={cn(
                                     "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", 
                                     formData.idCardOrientation === 'VERTICAL' ? "bg-[var(--primary)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                   )}
                                >Portrait</button>
                                <button 
                                   onClick={() => setFormData({...formData, idCardOrientation: 'HORIZONTAL'})}
                                   className={cn(
                                     "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", 
                                     formData.idCardOrientation === 'HORIZONTAL' ? "bg-[var(--primary)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                   )}
                                >Landscape</button>
                             </div>
                          </div>

                          <div className="space-y-3">
                             <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Theme Axis</label>
                             <div className="grid grid-cols-3 p-1 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
                                {['DARK', 'LIGHT', 'PRISTINE'].map(m => (
                                   <button 
                                      key={m}
                                      onClick={() => setFormData({...formData, idCardTheme: m as any})}
                                      className={cn(
                                         "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", 
                                         formData.idCardTheme === m 
                                          ? "bg-[var(--primary)] text-white shadow-md" 
                                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                      )}
                                   >{m === 'PRISTINE' ? 'White' : m.charAt(0)}</button>
                                ))}
                             </div>
                          </div>
                      </div>
                   </div>
                </section>

                <section className="space-y-6 p-8 rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-left relative overflow-hidden group/visibility">
                   <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
                          <ShieldCheck size={22} />
                      </div>
                      <div>
                         <h4 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Security Tokens</h4>
                         <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] opacity-60">Visibility & Verification</p>
                      </div>
                   </div>

                   <div className="space-y-4 relative z-10">
                      {[
                        { id: 'idCardShowLogo', label: 'Company Identity', sub: 'Primary branding' },
                        { id: 'idCardShowQrCode', label: 'Biometric Access', sub: 'Attendance QR' }
                      ].map(toggle => (
                        <button 
                          key={toggle.id}
                          onClick={() => setFormData({...formData, [toggle.id]: !(formData as any)[toggle.id]})}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-[1.5rem] border transition-all duration-500 text-left",
                            (formData as any)[toggle.id] ? "bg-emerald-500/5 border-emerald-500/10 shadow-sm" : "bg-[var(--bg-elevated)] border-transparent"
                          )}
                        >
                           <div className="pr-4">
                              <p className="text-[13px] font-black text-[var(--text-primary)] tracking-tight whitespace-nowrap">{toggle.label}</p>
                              <p className="text-[8px] text-[var(--text-muted)] font-bold uppercase mt-1 tracking-widest opacity-50">{toggle.sub}</p>
                           </div>
                           <div className={cn(
                             "w-9 h-5 rounded-full relative transition-all duration-500 p-0.5 shadow-inner shrink-0", 
                             (formData as any)[toggle.id] ? "bg-emerald-500" : "bg-[var(--text-muted)]/20"
                           )}>
                              <div className={cn(
                                "w-4 h-4 bg-white rounded-full transition-all duration-500 shadow-md", 
                                (formData as any)[toggle.id] ? "translate-x-4" : "translate-x-0"
                              )} />
                           </div>
                        </button>
                      ))}
                   </div>
                </section>

                <section className="space-y-6 p-8 rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-left">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600">
                          <Building2 size={24} />
                      </div>
                      <div>
                         <h4 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Legal & Terms</h4>
                         <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5">Reverse side card information</p>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-3">
                         <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Back Side Title</label>
                         <input 
                           type="text"
                           className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-6 py-4 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none transition-all"
                           placeholder="Terms of Use"
                           value={formData.idCardSecurityText}
                           onChange={e => setFormData({...formData, idCardSecurityText: e.target.value})}
                         />
                      </div>

                      <div className="space-y-3">
                         <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Card Message (Back)</label>
                         <textarea 
                           className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-6 py-4 text-sm font-bold leading-relaxed text-[var(--text-primary)] focus:border-[var(--primary)] outline-none min-h-[100px] resize-none transition-all"
                           placeholder="This card belongs to..."
                           value={formData.idCardBackMessage}
                           onChange={e => setFormData({...formData, idCardBackMessage: e.target.value})}
                         />
                      </div>
                   </div>
                </section>

                <button
                  onClick={handleSaveDesign}
                  className="w-full py-4 rounded-xl bg-[var(--primary)] text-white text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-lg shadow-[var(--primary)]/20"
                >
                  Save Design Configuration
                </button>
              </div>

              {/* Preview */}
              <div className="space-y-10 flex flex-col justify-between">
                 <div className="flex flex-col items-center text-center gap-4">
                    <div className="px-4 py-1.5 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                       <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.3em]">Institutional ID Axis</span>
                    </div>
                    <h4 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Identity Workspace Preview</h4>
                    <p className="text-[14px] font-medium text-[var(--text-muted)] max-w-xl mx-auto">
                      Final production output rendering. Check both Portrait and Landscape orientations for physical print accuracy.
                    </p>
                 </div>

                 <div className="p-10 bg-[var(--bg-elevated)]/30 rounded-[4rem] border-2 border-[var(--border-subtle)] border-dashed flex justify-center items-center min-h-[450px] relative overflow-hidden group/preview">
                     <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-[var(--accent)]/5 opacity-30 group-hover/preview:opacity-50 transition-opacity duration-1000 pointer-events-none" />
                     
                     <div className="relative z-10 transition-all duration-1000 transform scale-[0.75] lg:scale-[0.8] cursor-zoom-in">
                       <EmployeeIDCard 
                         employee={{ 
                           fullName: 'Sample Employee', 
                           jobTitle: 'Department Head', 
                           employeeCode: 'MCB-001-GH',
                           departmentObj: { name: 'Operations' },
                           email: 'sample@mcb-ghana.com'
                         }} 
                         organization={{
                           name: formData.companyName,
                           logoUrl: formData.companyLogoUrl,
                           idCardPrimaryColor: formData.idCardPrimaryColor,
                           idCardAccentColor: formData.idCardAccentColor,
                           idCardTheme: formData.idCardTheme,
                           idCardOrientation: formData.idCardOrientation,
                           idCardShowLogo: formData.idCardShowLogo,
                           idCardShowQrCode: formData.idCardShowQrCode,
                           idCardBackMessage: formData.idCardBackMessage,
                           idCardSecurityText: formData.idCardSecurityText
                         }} 
                       />
                     </div>
                 </div>

                 <div className="flex flex-col items-center gap-4">
                    <div className="px-8 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl">
                       <p className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-4">
                          <span>CR80 ISO Standard</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                          <span>85.6mm × 54.0mm</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                          <span>300 DPI Rendering</span>
                       </p>
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CardManagement;
