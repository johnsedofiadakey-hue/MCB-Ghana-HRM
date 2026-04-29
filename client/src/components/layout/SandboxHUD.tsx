import React from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, User, LogOut, ArrowRightLeft } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';

const SandboxHUD = () => {
    const isSandbox = localStorage.getItem('mcb_is_sandbox') === 'true';
    if (!isSandbox) return null;

    const user = React.useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('mcb_user') || '{}');
        } catch (e) {
            return {};
        }
    }, []);

    const tiers = [
        { name: 'Staff View', role: 'STAFF', email: 'charlie@demo-sand.com', icon: User },
        { name: 'Manager View', role: 'MANAGER', email: 'alice@demo-sand.com', icon: Users },
        { name: 'Director View', role: 'MD', email: 'md@demo-sand.com', icon: Shield },
    ];

    const handleSwitch = async (email: string) => {
        try {
            const res = await api.post('/auth/login', { email, password: 'MCBDemo@2025' });
            const { token, refreshToken, user: newUser } = res.data;
            
            localStorage.setItem('mcb_auth_token', token);
            if (refreshToken) localStorage.setItem('mcb_refresh_token', refreshToken);
            localStorage.setItem('mcb_user', JSON.stringify(newUser || {}));
            localStorage.setItem('mcb_is_sandbox', 'true'); // Persist sandbox status
            
            toast.success(`Switched to ${newUser.role} Perspective`);
            window.location.reload();
        } catch (err) {
            toast.error('Identity switch failed. The simulation might be out of sync.');
        }
    };

    const handleExit = () => {
        localStorage.removeItem('mcb_auth_token');
        localStorage.removeItem('mcb_refresh_token');
        localStorage.removeItem('mcb_user');
        localStorage.removeItem('mcb_is_sandbox');
        window.location.href = '/login';
    };

    return (
        <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 p-2 rounded-[2rem] bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl"
        >
            <div className="px-6 flex flex-col justify-center border-r border-white/10 mr-2">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400">Sandbox Simulation</p>
                <p className="text-[10px] font-bold text-white leading-none mt-1">Role: {user.role}</p>
            </div>

            <div className="flex gap-1">
                {tiers.map((tier) => (
                    <button
                        key={tier.role}
                        onClick={() => handleSwitch(tier.email)}
                        disabled={user.role === tier.role}
                        className={`group px-4 py-3 rounded-2xl flex items-center gap-2 transition-all ${
                            user.role === tier.role 
                            ? 'bg-indigo-600 text-white' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <tier.icon size={16} className={user.role === tier.role ? 'animate-pulse' : ''} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{tier.name}</span>
                    </button>
                ))}
            </div>

            <div className="w-px h-8 bg-white/10 mx-2" />

            <button
                onClick={handleExit}
                className="p-3 rounded-2xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all group"
                title="Exit Demo"
            >
                <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            </button>
        </motion.div>
    );
};

export default SandboxHUD;
