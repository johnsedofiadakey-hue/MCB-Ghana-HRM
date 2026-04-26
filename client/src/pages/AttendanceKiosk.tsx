import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Fingerprint, ShieldCheck, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { toast } from '../utils/toast';
import { useNavigate } from 'react-router-dom';

const AttendanceKiosk = () => {
    const [time, setTime] = useState(new Date());
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error', message: string, user?: string } | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleAction = async (type: 'CHECKIN' | 'CHECKOUT') => {
        if (code.length < 3) {
            toast.error('Please enter a valid employee code');
            return;
        }

        setLoading(true);
        setResult(null);
        try {
            // Get kiosk settings or default orgId
            const userData = JSON.parse(localStorage.getItem('nexus_user') || '{}');
            const organizationId = userData.organizationId || 'default-tenant';

            const res = await api.post('/attendance/kiosk-punch', {
                employeeCode: code,
                type,
                organizationId
            });

            setResult({
                type: 'success',
                message: res.data.message,
                user: res.data.user
            });
            setCode('');
            
            // Clear result after 5 seconds
            setTimeout(() => setResult(null), 5000);
        } catch (err: any) {
            setResult({
                type: 'error',
                message: err.response?.data?.error || 'Authentication failure. Check your code.'
            });
        } finally {
            setLoading(false);
        }
    };

    const addDigit = (digit: string) => {
        if (code.length < 8) setCode(prev => prev + digit);
    };

    const clear = () => setCode('');

    return (
        <div className="min-h-screen w-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--primary)]/5 blur-[150px] rounded-full" />
            </div>

            <button 
                onClick={() => navigate('/dashboard')}
                className="absolute top-10 left-10 p-4 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all z-10 flex items-center gap-2"
            >
                <ArrowLeft size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Back to Hub</span>
            </button>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-2xl flex flex-col items-center"
            >
                {/* Clock Header */}
                <div className="text-center mb-12">
                    <h1 className="text-7xl font-black tracking-tighter tabular-nums mb-2">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </h1>
                    <p className="text-sm font-black uppercase tracking-[0.3em] text-white/40">
                        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full">
                    {/* Input Display & Keypad */}
                    <div className="space-y-8">
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Enter Employee Code</p>
                            <div className="text-4xl font-black tracking-[0.5em] h-12 flex items-center justify-center text-[var(--primary)]">
                                {code || <span className="opacity-10">0000</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'].map((btn) => (
                                <motion.button
                                    key={btn}
                                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        if (btn === 'CLR') clear();
                                        else if (btn === 'DEL') setCode(prev => prev.slice(0, -1));
                                        else addDigit(btn);
                                    }}
                                    className="h-20 rounded-2xl bg-white/5 border border-white/10 text-xl font-black flex items-center justify-center transition-all"
                                >
                                    {btn}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Actions & Feedback */}
                    <div className="flex flex-col gap-6 justify-center">
                        <AnimatePresence mode="wait">
                            {result ? (
                                <motion.div
                                    key="result"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={`p-8 rounded-[2.5rem] border ${
                                        result.type === 'success' 
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                    } text-center space-y-4`}
                                >
                                    {result.type === 'success' ? <CheckCircle2 size={48} className="mx-auto" /> : <AlertCircle size={48} className="mx-auto" />}
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">{result.type === 'success' ? 'Confirmed' : 'Access Denied'}</h3>
                                        <p className="text-sm font-medium opacity-80 mt-2">{result.message}</p>
                                        {result.user && <p className="text-lg font-black mt-4 text-white">Welcome, {result.user}!</p>}
                                    </div>
                                    <button 
                                        onClick={() => setResult(null)}
                                        className="text-[10px] font-black uppercase tracking-widest underline opacity-50 hover:opacity-100"
                                    >
                                        Dismiss
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="actions"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-6"
                                >
                                    <button
                                        disabled={loading || code.length === 0}
                                        onClick={() => handleAction('CHECKIN')}
                                        className="w-full py-8 rounded-[2rem] bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl flex flex-col items-center gap-2 transition-all disabled:opacity-30 disabled:grayscale shadow-2xl shadow-emerald-900/20"
                                    >
                                        <Fingerprint size={32} />
                                        CLOCK IN
                                    </button>
                                    <button
                                        disabled={loading || code.length === 0}
                                        onClick={() => handleAction('CHECKOUT')}
                                        className="w-full py-8 rounded-[2rem] bg-white text-black hover:bg-white/90 font-black text-xl flex flex-col items-center gap-2 transition-all disabled:opacity-30 disabled:grayscale"
                                    >
                                        <ShieldCheck size={32} />
                                        CLOCK OUT
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="text-center p-6">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">MCB Kiosk Interface v7.0</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AttendanceKiosk;
