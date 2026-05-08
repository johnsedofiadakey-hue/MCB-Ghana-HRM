import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Trash2, Save, X, AlertCircle } from 'lucide-react';

const DeptKpiManager: React.FC = () => {
    const [kpis, setKpis] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newKpi, setNewKpi] = useState({ name: '', description: '', targetValue: 100, unit: '%' });

    useEffect(() => {
        fetchKpis();
    }, []);

    const fetchKpis = async () => {
        try {
            const res = await api.get('/performance-v2/dept-kpis');
            setKpis(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch KPIs', err);
            setKpis([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newKpi.name) return;
        try {
            await api.post('/performance-v2/dept-kpis', newKpi);
            setIsAdding(false);
            setNewKpi({ name: '', description: '', targetValue: 100, unit: '%' });
            fetchKpis();
        } catch (err) {
            console.error('Create failed', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This will delete all cascading targets.')) return;
        try {
            await api.delete(`/performance-v2/dept-kpis/${id}`);
            fetchKpis();
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-xl text-white">Department Goals</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all"
                >
                    <Plus size={16} /> New KPI
                </button>
            </div>

            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-6 rounded-2xl bg-white/5 border border-primary/20 space-y-4"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text" placeholder="KPI Name"
                                className="glass-input"
                                value={newKpi.name}
                                onChange={e => setNewKpi({ ...newKpi, name: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <input
                                    type="number" placeholder="Target"
                                    className="glass-input flex-1"
                                    value={newKpi.targetValue}
                                    onChange={e => setNewKpi({ ...newKpi, targetValue: Number(e.target.value) })}
                                />
                                <input
                                    type="text" placeholder="Unit (%)"
                                    className="glass-input w-16 text-center"
                                    value={newKpi.unit}
                                    onChange={e => setNewKpi({ ...newKpi, unit: e.target.value })}
                                />
                            </div>
                        </div>
                        <textarea
                            placeholder="Description..."
                            className="glass-input w-full min-h-[80px]"
                            value={newKpi.description}
                            onChange={e => setNewKpi({ ...newKpi, description: e.target.value })}
                        />
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-lg text-slate-400 text-xs font-bold hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleCreate} className="px-6 py-2 rounded-lg bg-primary text-white text-xs font-bold shadow-lg shadow-primary/20">Save Strategy</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="h-20 animate-pulse bg-white/5 rounded-xl" />
                ) : kpis.length === 0 ? (
                    <div className="p-10 text-center glass border-dashed">
                        <Target size={40} className="mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-400 text-sm font-medium">No departmental KPIs set for this period.</p>
                    </div>
                ) : kpis.map((kpi) => (
                    <div key={kpi.id} className="glass p-5 group hover:border-primary/30 transition-all flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                                <Target size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-white">{kpi.name}</h4>
                                <p className="text-xs text-slate-500 max-w-md line-clamp-1">{kpi.description}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-10">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Target</p>
                                <p className="font-bold text-white">{kpi.targetValue}{kpi.unit}</p>
                            </div>
                            <button
                                onClick={() => handleDelete(kpi.id)}
                                className="p-2 text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DeptKpiManager;
