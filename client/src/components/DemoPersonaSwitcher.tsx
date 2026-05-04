import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Briefcase, Zap, X, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import api from '../services/api';
import { storage, StorageKey } from '../services/storage';
import { toast } from '../utils/toast';

const PERSONAS = [
  { id: 'director', label: 'Director (MD)', role: 'DIRECTOR', email: 'director@mcb-demo.com', desc: 'Full Enterprise Oversight', icon: Shield, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10' },
  { id: 'manager', label: 'Department Manager', role: 'MANAGER', email: 'manager@mcb-demo.com', desc: 'Team & Ops Command', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'staff', label: 'Staff Member', role: 'EMPLOYEE', email: 'staff@mcb-demo.com', desc: 'Personal Workflow', icon: Briefcase, color: 'text-amber-500', bg: 'bg-amber-500/10' },
];

const DemoPersonaSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const user = storage.getItem(StorageKey.USER, {});
  
  // Only show for demo accounts
  if (!user?.email?.includes('mcb-demo.com') && !user?.email?.includes('guest')) return null;

  const handleSwitch = async (persona: typeof PERSONAS[0]) => {
    setSwitching(persona.id);
    try {
      const res = await api.post('/auth/login', { 
        email: persona.email, 
        password: 'nexusdemo' 
      });
      
      const { token, refreshToken, user: newUser } = res.data;
      storage.setItem(StorageKey.AUTH_TOKEN, token);
      if (refreshToken) storage.setItem(StorageKey.REFRESH_TOKEN, refreshToken);
      storage.setItem(StorageKey.USER, newUser);
      
      toast.success(`Identity Switched: ${persona.label}`);
      window.location.reload(); // Hard reload to refresh all context/AI states
    } catch (err) {
      toast.error('Failed to warp identity. Trying default demo...');
      try {
          // Fallback to guest
          const res = await api.post('/auth/login', { email: 'guest@mcb-demo.com', password: 'nexusdemo' });
          storage.setItem(StorageKey.AUTH_TOKEN, res.data.token);
          window.location.reload();
      } catch {
          toast.error('Identity warp failed.');
      }
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="fixed bottom-10 right-10 z-[9999] flex flex-col items-end gap-4 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-[320px] bg-white rounded-[2.5rem] border border-slate-200 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] p-8 overflow-hidden relative"
          >
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Persona Hub</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Identity Switcher</p>
               </div>
               <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={16} />
               </button>
            </div>

            <div className="space-y-4">
               {PERSONAS.map((p) => {
                 const isActive = user?.role === p.role || (p.role === 'DIRECTOR' && user?.role === 'MD');
                 return (
                  <button
                    key={p.id}
                    disabled={switching !== null}
                    onClick={() => handleSwitch(p)}
                    className={`w-full group relative p-5 rounded-3xl border transition-all text-left flex items-center gap-4 ${
                      isActive 
                        ? 'bg-blue-50 border-blue-200 cursor-default' 
                        : 'bg-white border-slate-100 hover:border-blue-500 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${p.bg} ${p.color}`}>
                       {switching === p.id ? <Loader2 size={24} className="animate-spin" /> : <p.icon size={24} />}
                    </div>
                    <div>
                       <div className="flex items-center gap-2">
                          <p className={`text-sm font-black uppercase italic ${isActive ? 'text-blue-600' : 'text-slate-900'}`}>{p.label}</p>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />}
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{p.desc}</p>
                    </div>
                    {!isActive && <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:translate-x-1 transition-transform" />}
                  </button>
                 );
               })}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                  <Sparkles size={10} className="fill-blue-400 text-blue-400" /> MCB Simulation Engine v1.0
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`h-16 px-8 rounded-full flex items-center gap-4 shadow-2xl transition-all ${
          isOpen ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'
        }`}
      >
        {isOpen ? <X size={20} /> : <Zap size={20} className="fill-white" />}
        <span className="text-xs font-black uppercase tracking-[0.2em]">{isOpen ? 'Close Hub' : 'Switch Identity'}</span>
      </motion.button>
    </div>
  );
};

export default DemoPersonaSwitcher;
