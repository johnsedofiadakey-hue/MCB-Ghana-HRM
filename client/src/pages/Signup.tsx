import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Building, Mail, Lock, User, Globe, ChevronRight, 
  Loader2, Shield, CheckCircle2, AlertCircle, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../utils/toast';

const Signup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    subdomain: '',
    country: 'Guinea'
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/signup', formData);
      setSuccess(true);
      toast.success('Organization Provisioned Successfully!');
      
      // Auto-login after a short delay
      setTimeout(() => {
        const { token, refreshToken, user } = res.data;
        localStorage.setItem('mcb_auth_token', token);
        if (refreshToken) localStorage.setItem('mcb_refresh_token', refreshToken);
        localStorage.setItem('mcb_user', JSON.stringify(user));
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#080c16] relative overflow-hidden font-sans selection:bg-blue-500/30">
      {/* ── Background Aesthetics ── */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-indigo-600/10 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl px-6 relative z-10 py-12"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6">
            <Rocket size={12} /> Start Your MCB Journey
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-4">
            Provision Your <span className="text-blue-500">Workspace.</span>
          </h1>
          <p className="text-slate-400 font-medium">Create your corporate ecosystem in seconds. 14-day Enterprise trial included.</p>
        </div>

        <div className="bg-[#0f172a]/80 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-black text-white mb-4">Identity Synchronized.</h2>
                <p className="text-slate-400 mb-8">Your organization is live. Redirecting to your command center...</p>
                <div className="flex justify-center">
                   <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-8">
                {error && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-4 text-rose-400">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <span className="text-xs font-black uppercase tracking-widest">{error}</span>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Admin Name</label>
                       <div className="relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <input 
                            required
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            placeholder="John Doe"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all font-medium"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Work Email</label>
                       <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <input 
                            required
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            placeholder="ceo@company.com"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all font-medium"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Secure Password</label>
                       <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <input 
                            required
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            placeholder="••••••••"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all font-medium tracking-widest"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Organization Name</label>
                       <div className="relative group">
                          <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <input 
                            required
                            value={formData.companyName}
                            onChange={e => setFormData({...formData, companyName: e.target.value})}
                            placeholder="Stormglide Logistics"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all font-medium"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Preferred Subdomain</label>
                       <div className="relative group">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <input 
                            required
                            value={formData.subdomain}
                            onChange={e => setFormData({...formData, subdomain: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                            placeholder="my-company"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all font-medium"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 text-[10px] font-black">.mcb-ghana.com</span>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Country HQ</label>
                       <div className="relative group">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <select 
                            value={formData.country}
                            onChange={e => setFormData({...formData, country: e.target.value})}
                            className="w-full bg-[#1a2333] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all font-medium appearance-none"
                          >
                             <option value="Guinea">Guinea</option>
                             <option value="Ghana">Ghana</option>
                             <option value="Nigeria">Nigeria</option>
                             <option value="Senegal">Senegal</option>
                             <option value="Ivory Coast">Ivory Coast</option>
                             <option value="United States">United States</option>
                             <option value="United Kingdom">United Kingdom</option>
                          </select>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-2xl py-5 font-black uppercase tracking-[0.3em] text-[11px] shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? (
                       <>
                         <Loader2 className="animate-spin" size={18} />
                         <span>Initializing Core...</span>
                       </>
                    ) : (
                      <>
                        <span>Provision Organization</span>
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-xs text-slate-500 font-medium">
                    Already registered? <Link to="/login" className="text-blue-400 font-black hover:underline">Sync Identity</Link>
                  </p>
                </div>
              </form>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-12 flex items-center justify-center gap-8 opacity-40">
           <div className="flex items-center gap-2 text-white">
              <Shield size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Enterprise Encrypted</span>
           </div>
           <div className="w-1 h-1 rounded-full bg-white/20" />
           <div className="flex items-center gap-2 text-white">
              <CheckCircle2 size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">SLA Guaranteed</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

// Simple rocket icon
const Rocket = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-4 5-4"/>
    <path d="M12 15v5s3.03-.55 5-2c2.2-1.62 4-5 4-5"/>
  </svg>
);

export default Signup;
