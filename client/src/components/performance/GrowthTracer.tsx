import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import { TrendingUp, Award, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface GrowthData {
    cycleTitle: string;
    score: number;
    date: string;
}

interface GrowthTracerProps {
    employeeId: string;
    showTitle?: boolean;
}

const GrowthTracer: React.FC<GrowthTracerProps> = ({ employeeId, showTitle = true }) => {
    const [data, setData] = useState<GrowthData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrend = async () => {
            try {
                const res = await api.get(`/appraisals/trend/${employeeId}`);
                setData(res.data);
            } catch (err) {
                console.error('Failed to fetch performance trend');
            } finally {
                setLoading(false);
            }
        };
        fetchTrend();
    }, [employeeId]);

    if (loading) return (
        <div className="h-64 flex items-center justify-center bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] animate-pulse">
            <TrendingUp className="text-[var(--text-muted)] opacity-20" size={32} />
        </div>
    );

    if (data.length < 2) return (
        <div className="p-10 text-center bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] border-dashed">
            <Award className="mx-auto mb-4 text-[var(--text-muted)] opacity-30" size={32} />
            <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Awaiting Historical Baseline</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium italic">Complete at least 2 cycles to trace growth trajectory.</p>
        </div>
    );

    const latest = data[data.length - 1].score;
    const previous = data[data.length - 2].score;
    const delta = latest - previous;

    return (
        <div className="space-y-6">
            {showTitle && (
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-[13px] font-black text-[var(--text-primary)] uppercase tracking-tight">Institutional Growth Tracer</h4>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium">Trajectory across {data.length} appraisal cycles</p>
                    </div>
                    <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                        delta >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    )}>
                        {delta >= 0 ? <TrendingUp size={12} /> : <AlertCircle size={12} />}
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)} Index Delta
                    </div>
                </div>
            )}

            <div className="h-[240px] w-full bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-subtle)] relative overflow-hidden group">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.5} />
                        <XAxis 
                            dataKey="cycleTitle" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 700, fill: 'var(--text-muted)' }} 
                            dy={10}
                        />
                        <YAxis 
                            domain={[0, 10]} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 700, fill: 'var(--text-muted)' }} 
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'var(--bg-card)', 
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '16px',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                fontSize: '11px',
                                fontWeight: 600
                            }}
                            itemStyle={{ color: 'var(--primary)' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="score" 
                            stroke="var(--primary)" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorScore)" 
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default GrowthTracer;
