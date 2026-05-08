import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, BookOpen, MessageSquare, LifeBuoy, FileQuestion, ExternalLink } from 'lucide-react';
import { cn } from '../../utils/cn';

interface HelpPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpPanel = ({ isOpen, onClose }: HelpPanelProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border-subtle)] z-[120] shadow-2xl flex flex-col"
                    >
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shadow-lg shadow-primary/10">
                                    <HelpCircle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-[var(--text-primary)] font-display tracking-tight uppercase">Platform Support</h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mt-1">Resource Center</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {/* Quick Links */}
                            <div className="space-y-4">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-6">Knowledge Base</h3>
                                <SupportCard
                                    icon={BookOpen}
                                    title="System Documentation"
                                    desc="Learn how to master all organizational modules"
                                    link="#"
                                />
                                <SupportCard
                                    icon={FileQuestion}
                                    title="Frequently Asked Questions"
                                    desc="Quick answers to common system questions"
                                    link="#"
                                />
                            </div>

                            {/* Contact Support */}
                            <div className="space-y-4">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-6">Direct Support</h3>
                                <SupportCard
                                    icon={MessageSquare}
                                    title="Live Chat"
                                    desc="Connect with a support agent instantly"
                                    highlight
                                />
                                <SupportCard
                                    icon={LifeBuoy}
                                    title="Raise a Ticket"
                                    desc="Submit a formal request to our technical team"
                                    link="#"
                                />
                            </div>

                            {/* System Info */}
                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                                <p className="text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-widest">System Information</p>
                                <div className="space-y-2 text-[11px] font-mono">
                                    <div className="flex justify-between">
                                        <span className="opacity-40">Version:</span>
                                        <span className="text-primary-light">v4.0.1-enterprise</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="opacity-40">Environment:</span>
                                        <span className="text-emerald-500">Production</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="opacity-40">Instance ID:</span>
                                        <span className="text-slate-300">NX-77421</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                HRM OS &copy; 2026. All rights reserved.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const SupportCard = ({ icon: Icon, title, desc, link, highlight }: any) => (
    <motion.a
        href={link}
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
            "block p-5 rounded-2xl border transition-all group",
            highlight
                ? "bg-primary/10 border-primary/30"
                : "bg-white/[0.03] border-white/5 hover:border-white/10"
        )}
    >
        <div className="flex items-start gap-4">
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                highlight ? "bg-primary text-white" : "bg-white/5 text-slate-500 group-hover:text-white"
            )}>
                <Icon size={18} />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-black text-[var(--text-primary)] tracking-tight">{title}</h4>
                    {link && <ExternalLink size={12} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />}
                </div>
                <p className="text-[11px] font-medium text-[var(--text-muted)] leading-relaxed group-hover:text-[var(--text-primary)]">
                    {desc}
                </p>
            </div>
        </div>
    </motion.a>
);

export default HelpPanel;
