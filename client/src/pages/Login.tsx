import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { storage, StorageKey } from '../services/storage';
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff, Shield, AlertCircle, Heart, Sparkles, Coffee, Users, ShieldCheck, Globe } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { toast } from '../utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const QUOTES = [
    { text: "The first 90 minutes of your day dictate your success. The first 5 minutes dictate how much coffee you need.", author: "Institutional Wisdom", icon: <Coffee className="text-orange-500" size={16} /> },
    { text: "Great things in business are never done by one person. They're done by a team of people... and several spreadsheets.", author: "Nexus HR", icon: <Users className="text-blue-500" size={16} /> },
    { text: "Success is best when it's shared. But the office snacks? That's a different story.", author: "Corporate Reality", icon: <Sparkles className="text-amber-500" size={16} /> },
    { text: "The only way to do great work is to love what you do. Or at least have a really comfortable ergonomic chair.", author: "Office Ergonomics", icon: <Heart className="text-rose-500" size={16} /> },
    { text: "Your growth is our priority. Your password security is your responsibility.", author: "IT Security", icon: <Shield className="text-emerald-500" size={16} /> }
];

const Login = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { settings } = useTheme();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [quote, setQuote] = useState(QUOTES[0]);
    const [greeting, setGreeting] = useState('Welcome Back');

    useEffect(() => {
        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
        
        const hour = new Date().getHours();
        if (hour < 12) setGreeting(t('auth.greeting_morning', 'Good Morning'));
        else if (hour < 18) setGreeting(t('auth.greeting_afternoon', 'Good Afternoon'));
        else setGreeting(t('auth.greeting_evening', 'Good Evening'));

        if (storage.getItem(StorageKey.AUTH_TOKEN, null)) navigate('/dashboard');
    }, [navigate, t]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/login', formData);
            const { token, refreshToken, user } = res.data;
            
            storage.setItem(StorageKey.AUTH_TOKEN, token);
            if (refreshToken) storage.setItem(StorageKey.REFRESH_TOKEN, refreshToken);
            storage.setItem(StorageKey.USER, user || {});

            if (user?.role === 'DEV') navigate('/nexus-master-console');
            else navigate('/dashboard');
            
            toast.success(t('auth.sign_in_success', 'Sign in successful'));
        } catch (err: any) {
            setError(err?.response?.data?.error || t('auth.error_invalid', 'Invalid email or password.'));
            toast.error(t('auth.sign_in_failed', 'Sign in failed'));
        } finally {
            setLoading(false);
        }
    };

    const companyName = settings?.companyName || 'MC Bauchemie';
    const logoUrl = settings?.logoUrl || settings?.companyLogoUrl;

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-main)] relative overflow-hidden font-display selection:bg-[var(--primary)]/30">
            {/* ── Visual Atmosphere Architecture ────────────────────────────────── */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full bg-[var(--primary)]/5 blur-[150px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-[var(--accent)]/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                
                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, var(--text-muted) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            <div className="w-full max-w-[1200px] grid lg:grid-cols-2 gap-16 px-6 relative z-10 items-center">
                
                {/* Left Side: Branding & Inspiration */}
                <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="hidden lg:flex flex-col justify-center space-y-12"
                >
                    <div className="space-y-6">
                        <motion.div 
                            whileHover={{ scale: 1.05 }}
                            className="w-20 h-20 rounded-3xl bg-[var(--bg-card)] flex items-center justify-center border border-[var(--border-subtle)] shadow-2xl overflow-hidden relative group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary)] to-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-4 relative z-10" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]">
                                    <span className="text-3xl font-black text-white italic">{companyName[0]}</span>
                                </div>
                            )}
                        </motion.div>
                        
                        <div className="space-y-2">
                            <h1 className="text-6xl font-black text-[var(--text-primary)] tracking-tighter uppercase leading-[0.9]">
                                {greeting}, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]">{companyName}.</span>
                            </h1>
                            <p className="text-lg font-medium text-[var(--text-muted)] max-w-md italic">
                                {t('auth.intro_desc', 'Access your employee portal to manage work, view payslips, and track your performance.')}
                            </p>
                        </div>
                    </div>

                    <div className="p-10 rounded-[3rem] bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] backdrop-blur-xl relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            {quote.icon}
                        </div>
                        <div className="space-y-6 relative z-10">
                            <p className="text-xl font-bold text-[var(--text-primary)] italic leading-relaxed">
                                "{quote.text}"
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-px bg-[var(--primary)]/30" />
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">{quote.author}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-10">
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50">{t('auth.data_protection', 'Data Protection')}</p>
                            <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <ShieldCheck size={14} className="text-emerald-500" /> {t('auth.secure_encryption', 'Secure Encryption')}
                            </p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50">{t('auth.system_location', 'System Location')}</p>
                            <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Globe size={14} className="text-blue-500" /> {t('auth.west_africa', 'West Africa Central')}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Right Side: Login Form */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[520px] mx-auto lg:ml-auto"
                >
                    {/* Mobile Branding (only visible on small screens) */}
                    <div className="lg:hidden flex flex-col items-center mb-12 space-y-4">
                         {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-white font-black text-2xl italic">N</div>
                        )}
                        <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tighter">{companyName}</h2>
                        <div className="px-4 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Enterprise Portal</p>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-card)] rounded-[3.5rem] border border-[var(--border-subtle)] p-10 md:p-14 shadow-2xl relative overflow-hidden">
                        
                        <div className="mb-12 text-left">
                            <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight uppercase italic leading-none mb-3">{t('auth.sign_in', 'Sign In')}</h2>
                            <p className="text-[var(--text-muted)] text-sm font-medium">{t('auth.sign_in_desc', 'Please enter your details to access your account.')}</p>
                        </div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="mb-10 p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center gap-4 text-rose-500"
                                >
                                    <AlertCircle size={20} className="flex-shrink-0" />
                                    <span className="text-xs font-black uppercase tracking-wider">{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleLogin} className="space-y-8">
                             <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] ml-2">{t('auth.email_label', 'Email Address')}</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors">
                                        <Mail size={20} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                                        className="nx-input !h-[72px] !pl-16 !bg-[var(--bg-elevated)]/50 !rounded-[1.8rem] !text-base focus:!ring-[var(--primary)]/10"
                                        placeholder={t('auth.email_placeholder', 'Enter your email')}
                                        required
                                    />
                                </div>
                            </div>

                             <div className="space-y-3">
                                <div className="flex justify-between items-center px-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">{t('auth.password_label', 'Password')}</label>
                                    <button type="button" className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] hover:underline decoration-2 underline-offset-4">{t('auth.forgot_password', 'Forgot Password?')}</button>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors">
                                        <Lock size={20} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                                        className="nx-input !h-[72px] !pl-16 !pr-16 !bg-[var(--bg-elevated)]/50 !rounded-[1.8rem] !text-base focus:!ring-[var(--primary)]/10 tracking-[0.3em]"
                                        placeholder={t('auth.password_placeholder', '••••••••')}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.01, y: -2 }}
                                whileTap={{ scale: 0.99, y: 0 }}
                                type="submit"
                                disabled={loading}
                                className="w-full h-20 bg-[var(--primary)] hover:bg-[var(--primary)]/90 rounded-[2rem] flex items-center justify-center font-black uppercase tracking-[0.4em] text-[11px] text-white shadow-2xl shadow-[var(--primary)]/30 transition-all disabled:opacity-50 group mt-10"
                            >
                                {loading ? (
                                    <Loader2 size={24} className="animate-spin" />
                                ) : (
                                     <div className="flex items-center gap-4">
                                        <span>{t('auth.sign_in', 'Sign In')}</span>
                                        <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                                    </div>
                                )}
                            </motion.button>
                        </form>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-12 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-40">
                            Nexus Enterprise Cloud · Deployment 2026.4.25
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
