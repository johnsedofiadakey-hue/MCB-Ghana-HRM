import React from 'react';
import { motion } from 'framer-motion';
import { Send, FileText, UserPlus, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuickActions = () => {
    const navigate = useNavigate();

    const actions = [
        { label: 'New Employee', icon: UserPlus, path: '/employees?action=new', color: 'bg-blue-500' },
        { label: 'Request Leave', icon: Calendar, path: '/leave', color: 'bg-emerald-500' },
        { label: 'Submit KPI', icon: Send, path: '/performance', color: 'bg-primary' },
        { label: 'New Query', icon: FileText, path: '/queries/new', color: 'bg-rose-500' },
    ];

    return (
        <div className="glass-card p-6 rounded-[2rem]">
            <h3 className="text-xl font-black text-white tracking-tight mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
                {actions.map((action, idx) => (
                    <motion.button
                        key={idx}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(action.path)}
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
                    >
                        <div className={`p-3 rounded-xl ${action.color}/20 ${action.color.replace('bg-', 'text-')} mb-3 group-hover:scale-110 transition-transform`}>
                            <action.icon size={20} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-white transition-colors">{action.label}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

export default QuickActions;
