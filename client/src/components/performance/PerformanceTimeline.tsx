import React from 'react';
import { motion } from 'framer-motion';
import { Star, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TimelineEvent {
    id: string;
    type: 'MILESTONE' | 'REVIEW' | 'PROMOTION' | 'AWARD';
    title: string;
    description: string;
    date: Date;
    status: 'COMPLETED' | 'PENDING' | 'URGENT';
}

const PerformanceTimeline = ({ events }: { events: TimelineEvent[] }) => {
    return (
        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {(events || []).map((event, idx) => (
                <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative"
                >
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[27px] top-1.5 w-6 h-6 rounded-full border-4 border-slate-950 flex items-center justify-center
            ${event.status === 'COMPLETED' ? 'bg-emerald-500' : event.status === 'URGENT' ? 'bg-rose-500' : 'bg-primary'} shadow-lg shadow-black/50`}>
                        {event.type === 'REVIEW' && <Clock size={10} className="text-white" />}
                        {event.type === 'AWARD' && <Star size={10} className="text-white" />}
                        {event.type === 'MILESTONE' && <CheckCircle size={10} className="text-white" />}
                        {event.type === 'PROMOTION' && <TrendingUp size={10} className="text-white" />}
                    </div>

                    <div className="glass-card p-6 rounded-3xl group hover:border-primary/40 transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                            <h4 className="font-bold text-white text-lg group-hover:text-primary-light transition-colors">{event.title}</h4>
                            <span className="text-[10px] font-black text-slate-500 mt-0.5 uppercase tracking-[0.2em]">{format(new Date(event.date), 'MMM dd, yyyy')}</span>
                        </div>
                        <p className="text-sm text-slate-400 font-medium leading-relaxed">{event.description}</p>

                        {event.status === 'URGENT' && (
                            <div className="mt-4 flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-widest bg-rose-400/10 w-fit px-3 py-1 rounded-full animate-pulse">
                                <AlertCircle size={14} />
                                <span>Action Required</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

const TrendingUp = ({ size, className }: { size: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);

export default PerformanceTimeline;
