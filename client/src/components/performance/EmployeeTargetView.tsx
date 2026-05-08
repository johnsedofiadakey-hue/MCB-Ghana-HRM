import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { CheckCircle2, MessageSquare } from 'lucide-react';

const EmployeeTargetView: React.FC = () => {
    const [targets, setTargets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTargets();
    }, []);

    const fetchTargets = async () => {
        try {
            const res = await api.get('/performance-v2/employee-targets');
            setTargets(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch targets failed', err);
            setTargets([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProgress = async (id: string, current: number) => {
        const newValue = prompt('Enter new progress value:', current.toString());
        if (newValue === null) return;

        try {
            await api.patch(`/performance-v2/employee-targets/${id}`, {
                actualValue: Number(newValue)
            });
            fetchTargets();
        } catch (err) {
            console.error('Update failed', err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-xl text-white">Target Tracking</h3>
                <span className="text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-full uppercase tracking-widest">
                    Live Performance
                </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="h-40 animate-pulse bg-white/5 rounded-2xl" />
                ) : (targets || []).length === 0 ? (
                    <div className="p-12 text-center glass border-dashed">
                        <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-500/20" />
                        <p className="text-slate-500 text-sm font-medium">No active targets assigned for this cycle.</p>
                    </div>
                ) : (targets || []).map((target) => {
                    const progress = Math.min((target.actualValue / target.targetValue) * 100, 100);
                    return (
                        <div key={target.id} className="glass p-6 group hover:border-primary/20 transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="font-bold text-white text-lg">{target.name}</h4>
                                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">
                                        Team Goal: {target.teamTarget?.name || 'General Operations'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleUpdateProgress(target.id, target.actualValue)}
                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-primary hover:border-primary transition-all"
                                >
                                    Log Progress
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Completion Rate</span>
                                    <span className="text-sm font-black text-white">{Number(progress).toFixed(1)}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 1 }}
                                        className="h-full bg-gradient-to-r from-primary to-accent"
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                    <span>{target.actualValue} Units</span>
                                    <span>Target: {target.targetValue}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default EmployeeTargetView;
