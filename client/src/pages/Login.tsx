import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { storage, StorageKey } from '../services/storage';
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff, AlertCircle, ShieldCheck, Globe, Sparkles, Heart, Coffee, Users, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { toast } from '../utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const QUOTES = [
    { text: "The first 90 minutes of your day dictate your success. The first 5 minutes dictate how much coffee you need.", author: "Institutional Wisdom", icon: <Coffee className="text-orange-400" size={15} /> },
    { text: "Great things in business are never done by one person. They're done by a team of people... and several spreadsheets.", author: "MCB HRM Ghana", icon: <Users className="text-[var(--primary)]" size={15} /> },
    { text: "Success is best when it's shared. But the office snacks? That's a different story.", author: "Corporate Reality", icon: <Sparkles className="text-amber-400" size={15} /> },
    { text: "The only way to do great work is to love what you do. Or at least have a really comfortable ergonomic chair.", author: "Office Ergonomics", icon: <Heart className="text-rose-400" size={15} /> },
    { text: "Your growth is our priority. Your password security is your responsibility.", author: "IT Security", icon: <Shield className="text-emerald-400" size={15} /> },
];

const Login = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { settings } = useTheme();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const [greeting, setGreeting] = useState('Welcome Back');

    useEffect(() => {
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
            if (user?.role === 'DEV') navigate('/mcb-master-console');
            else navigate('/dashboard');
            toast.success(t('auth.sign_in_success', 'Sign in successful'));
        } catch (err: any) {
            setError(err?.response?.data?.error || t('auth.error_invalid', 'Invalid email or password.'));
            toast.error(t('auth.sign_in_failed', 'Sign in failed'));
        } finally {
            setLoading(false);
        }
    };

    const companyName = settings?.companyName || 'MCB Ghana HRM';
    const logoUrl = settings?.logoUrl || settings?.companyLogoUrl;

    return (
        <div
            className="min-h-screen w-full bg-[var(--bg-main)] relative overflow-hidden"
            style={{ WebkitTapHighlightColor: 'transparent' }}
        >
            {/* Background atmosphere */}
            <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
                <div className="absolute -top-1/3 -left-1/4 w-[800px] h-[800px] rounded-full bg-[var(--primary)]/[0.05] blur-[140px]" />
                <div className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-[var(--accent)]/[0.04] blur-[120px]" />
                <div className="absolute inset-0 opacity-[0.025]"
                    style={{ backgroundImage: 'radial-gradient(circle, var(--text-muted) 1px, transparent 1px)', backgroundSize: '36px 36px' }}
                />
            </div>

            <div className="relative z-10 min-h-screen flex flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:px-12 xl:px-24 max-w-[1280px] mx-auto">

                {/* ── Desktop Left: Branding ─────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="hidden lg:flex flex-col justify-center flex-1 max-w-[560px] space-y-10"
                >
                    <div className="space-y-6">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="w-[72px] h-[72px] rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl overflow-hidden"
                        >
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-3" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]">
                                    <span className="text-3xl font-black text-white">{companyName[0]}</span>
                                </div>
                            )}
                        </motion.div>

                        <div className="space-y-3">
                            <h1 className="text-5xl xl:text-6xl font-black text-[var(--text-primary)] tracking-tight leading-[0.95]">
                                {greeting},<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]">
                                    {companyName}.
                                </span>
                            </h1>
                            <p className="text-base text-[var(--text-muted)] max-w-sm leading-relaxed">
                                {t('auth.intro_desc', 'Access your employee portal to manage work, view payslips, and track your performance.')}
                            </p>
                        </div>
                    </div>

                    {/* Quote card */}
                    <div className="p-8 rounded-3xl bg-[var(--bg-elevated)]/60 border border-[var(--border-subtle)] backdrop-blur-xl">
                        <p className="text-lg font-semibold text-[var(--text-primary)] italic leading-relaxed mb-4">
                            "{quote.text}"
                        </p>
                        <div className="flex items-center gap-3">
                            {quote.icon}
                            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">{quote.author}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-10">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 mb-1">
                                {t('auth.data_protection', 'Data Protection')}
                            </p>
                            <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <ShieldCheck size={13} className="text-emerald-500" />
                                {t('auth.secure_encryption', 'Secure Encryption')}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 mb-1">
                                {t('auth.system_location', 'System Location')}
                            </p>
                            <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Globe size={13} className="text-[var(--primary)]" />
                                {t('auth.west_africa', 'West Africa Central')}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* ── Form Panel (Mobile full-screen, Desktop card) ─────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:max-w-[480px] w-full"
                >
                    {/* ── Mobile-only header ─────────────────────────────────────── */}
                    <div
                        className="lg:hidden flex items-center gap-4 px-6 pt-[max(env(safe-area-inset-top),20px)] pb-6"
                    >
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] flex-shrink-0 flex items-center justify-center shadow-sm">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]">
                                    <span className="text-base font-black text-white">{companyName[0]}</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">{companyName}</p>
                            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">Employee Portal</p>
                        </div>
                    </div>

                    {/* ── Form content ───────────────────────────────────────────── */}
                    <div className="flex-1 flex flex-col justify-center px-6 lg:px-0 pb-6">
                        {/* Card wrapper — invisible on mobile, visible on desktop */}
                        <div className="lg:bg-[var(--bg-card)] lg:rounded-[2.5rem] lg:border lg:border-[var(--border-subtle)] lg:p-12 lg:shadow-2xl">

                            {/* Greeting — mobile only */}
                            <div className="lg:hidden mb-8">
                                <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight leading-tight mb-1">
                                    {greeting}
                                </h1>
                                <p className="text-sm text-[var(--text-muted)]">
                                    {t('auth.sign_in_desc', 'Sign in to access your account.')}
                                </p>
                            </div>

                            {/* Sign in heading — desktop only */}
                            <div className="hidden lg:block mb-10">
                                <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight mb-2">
                                    {t('auth.sign_in', 'Sign In')}
                                </h2>
                                <p className="text-sm text-[var(--text-muted)]">
                                    {t('auth.sign_in_desc', 'Please enter your details to access your account.')}
                                </p>
                            </div>

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/8 border border-rose-500/15 text-rose-500 overflow-hidden"
                                    >
                                        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                        <span className="text-sm font-semibold leading-snug">{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleLogin} className="space-y-4">
                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] pl-1">
                                        {t('auth.email_label', 'Email')}
                                    </label>
                                    <div className="relative group">
                                        <Mail
                                            size={18}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none"
                                        />
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            inputMode="email"
                                            value={formData.email}
                                            onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                                            placeholder={t('auth.email_placeholder', 'you@company.com')}
                                            required
                                            className="w-full h-14 pl-11 pr-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-base outline-none focus:ring-2 focus:ring-[var(--primary)]/25 focus:border-[var(--primary)] transition-all"
                                            style={{ fontSize: '16px' }}
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between pl-1">
                                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">
                                            {t('auth.password_label', 'Password')}
                                        </label>
                                        <button
                                            type="button"
                                            className="text-[11px] font-bold text-[var(--primary)] hover:underline underline-offset-2 transition-colors"
                                        >
                                            {t('auth.forgot_password', 'Forgot?')}
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <Lock
                                            size={18}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none"
                                        />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            value={formData.password}
                                            onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                                            placeholder="••••••••"
                                            required
                                            className="w-full h-14 pl-11 pr-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-base outline-none focus:ring-2 focus:ring-[var(--primary)]/25 focus:border-[var(--primary)] transition-all"
                                            style={{ fontSize: '16px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                                            aria-label="Toggle password visibility"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit */}
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-14 mt-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-2xl flex items-center justify-center gap-3 font-bold text-sm text-white shadow-lg shadow-[var(--primary)]/25 transition-all disabled:opacity-50 active:scale-[0.98]"
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    {loading ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <>
                                            <span>{t('auth.sign_in', 'Sign In')}</span>
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </motion.button>
                            </form>
                        </div>

                        {/* Footer */}
                        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-40 mt-8 lg:mt-6">
                            MCB Ghana HRM · v2026
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
