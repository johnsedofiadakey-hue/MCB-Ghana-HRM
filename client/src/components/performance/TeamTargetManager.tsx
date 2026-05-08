import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Plus, TrendingUp, X, Check } from 'lucide-react';

const TeamTargetManager: React.FC = () => {
    const [deptKpis, setDeptKpis] = useState<any[]>([]);
    const [teamTargets, setTeamTargets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedKpi, setSelectedKpi] = useState<any | null>(null);
    const [formData, setFormData] = useState({ name: '', targetValue: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [kpisRes, targetsRes] = await Promise.all([
                api.get('/performance-v2/dept-kpis'),
                api.get('/performance-v2/team-targets')
            ]);
            setDeptKpis(Array.isArray(kpisRes.data) ? kpisRes.data : []);
            setTeamTargets(Array.isArray(targetsRes.data) ? targetsRes.data : []);
        } catch (err) {
            console.error('Fetch failed', err);
            setDeptKpis([]);
            setTeamTargets([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTarget = async () => {
        if (!selectedKpi || !formData.name) return;
        try {
            await api.post('/performance-v2/team-targets', {
                ...formData,
                departmentKpiId: selectedKpi.id
            });
            setFormData({ name: '', targetValue: 0 });
            setSelectedKpi(null);
            fetchData();
        } catch (err) {
            console.error('Target creation failed', err);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="font-display font-bold text-xl text-white">Team Performance Matrix</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available Strategies</p>
                    {(deptKpis || []).map(kpi => (
                        <button
                            key={kpi.id}
                            onClick={() => setSelectedKpi(kpi)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedKpi?.id === kpi.id ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                        >
                            <h4 className="font-bold text-sm text-white">{kpi.name}</h4>
                            <p className="text-xs text-slate-500 mt-1">Goal: {kpi.targetValue}{kpi.unit}</p>
                        </button>
                    ))}
                </div>

                <div className="glass p-6 min-h-[300px] flex flex-col">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Create Team Target</p>
                    {selectedKpi ? (
                        <div className="space-y-4 flex-1">
                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
                                <p className="text-[10px] text-primary font-bold uppercase tracking-tight">Contributing To</p>
                                <p className="text-sm text-white font-bold">{selectedKpi.name}</p>
                            </div>
                            <input
                                type="text" placeholder="Team Metric Name (e.g., Sales Region A)"
                                className="glass-input w-full"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <input
                                type="number" placeholder="Target Contribution"
                                className="glass-input w-full"
                                value={formData.targetValue}
                                onChange={e => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                            />
                            <button
                                onClick={handleCreateTarget}
                                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-black text-xs uppercase tracking-widest transition-all mt-auto"
                            >
                                Deploy Team Target
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center px-6">
                            <Layers size={32} className="mb-4 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">Select a strategist goal to begin breakdown</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="glass p-6">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Active Breakdown</p>
                <div className="space-y-2">
                    {(teamTargets || []).map(target => (
                        <div key={target.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                            <div>
                                <p className="text-sm font-bold text-white">{target.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                    Source: {target.departmentKpi?.name || 'Manual Goal'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-primary">{target.targetValue} units</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TeamTargetManager;
