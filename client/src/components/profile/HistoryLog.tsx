import React from 'react';
import { Activity, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface HistoryLogProps {
    logs: any[];
    loading?: boolean;
}

const HistoryLog: React.FC<HistoryLogProps> = ({ logs, loading }) => {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="nx-card p-6 md:p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)]">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] mb-8 flex items-center gap-3">
                    <Activity className="text-[var(--primary)]" size={16} /> Personnel History Log
                </h3>
                
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                        </div>
                    ) : logs && logs.length > 0 ? (
                        logs.map((log: any) => (
                            <div key={log.id} className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-5 sm:p-6 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] group hover:border-[var(--primary)]/30 transition-all">
                                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--primary)] border border-[var(--border-subtle)]">
                                    <Zap size={20} className={cn(log.severity === 'SUCCESS' ? 'text-emerald-500' : 'text-[var(--primary)]')} />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-1 sm:gap-4">
                                        <h4 className="text-sm font-black text-[var(--text-primary)] tracking-tight">{log.title}</h4>
                                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-elevated)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                                            {new Date(log.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{log.description}</p>
                                    <div className="pt-2 flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">
                                        <span className="bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">By: {log.createdBy?.fullName || log.loggedBy?.fullName || 'System'}</span>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">Type: {log.type || 'General'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center opacity-40 italic">
                            <p className="text-xs">No historical records found for this identity.</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default HistoryLog;
