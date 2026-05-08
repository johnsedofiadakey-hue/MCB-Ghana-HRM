import { motion } from 'framer-motion';
import { Shield, UserPlus, Users, Unlock, Archive, ArrowUpRight, Building2, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';

const MDCommandCenter = () => {
    const navigate = useNavigate();

    const stats = [
        { label: 'Active Depts', value: '12', icon: Building2, color: 'text-primary' },
        { label: 'Open Roles', value: '4', icon: Briefcase, color: 'text-emerald-400' },
        { label: 'Pending Reviews', value: '28', icon: Shield, color: 'text-amber-400' },
    ];

    const actions = [
        { label: 'Employee Control', desc: 'Manage directory & roles', icon: Users, path: '/employees', color: 'bg-primary' },
        { label: 'Onboard Talent', desc: 'Add new team member', icon: UserPlus, path: '/employees?action=new', color: 'bg-emerald-500' },
        { label: 'Security Audit', desc: 'View system access logs', icon: Unlock, path: '/audit', color: 'bg-amber-500' },
        { label: 'Archive Vault', desc: 'View inactive entities', icon: Archive, path: '/employees?view=archived', color: 'bg-slate-500' },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass p-6 flex items-center justify-between group cursor-default hover:bg-white/[0.04] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center", stat.color)}>
                                <stat.icon size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
                                <p className="text-2xl font-black text-white">{stat.value}</p>
                            </div>
                        </div>
                        <ArrowUpRight size={18} className="text-slate-700 group-hover:text-primary transition-colors" />
                    </motion.div>
                ))}
            </div>

            <div className="glass-card p-8 md:p-10 rounded-[2.5rem]">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">Management Command Center</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Executive Lifecycle & Security Controls</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {actions.map((action, i) => (
                        <motion.button
                            key={i}
                            whileHover={{ y: -5, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(action.path)}
                            className="flex flex-col items-start p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-primary/5 transition-all text-left relative overflow-hidden group"
                        >
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform", action.color)}>
                                <action.icon size={20} />
                            </div>
                            <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">{action.label}</h4>
                            <p className="text-[10px] font-bold text-slate-500 group-hover:text-slate-400 transition-colors uppercase tracking-widest leading-relaxed">
                                {action.desc}
                            </p>
                            <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white opacity-[0.02] rounded-full group-hover:opacity-[0.05] transition-opacity" />
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MDCommandCenter;
