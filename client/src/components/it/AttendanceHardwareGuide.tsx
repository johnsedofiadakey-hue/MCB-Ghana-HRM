import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Cpu, Shield, ArrowRight, CheckCircle2, Copy, ExternalLink, Zap } from 'lucide-react';
import { toast } from '../../utils/toast';

interface HardwareGuideProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
}

const HardwareGuide: React.FC<HardwareGuideProps> = ({ isOpen, onClose, apiKey }) => {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Configuration key copied to secure buffer');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        className="relative w-full max-w-4xl bg-[var(--bg-card)] rounded-t-[2rem] sm:rounded-[2rem] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
                    >
                        {/* Header */}
                        <div className="p-6 sm:p-10 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]">
                            <div className="flex items-center gap-4 sm:gap-6">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1.2rem] sm:rounded-[1.8rem] bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]">
                                    <Cpu size={28} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase italic">Biometric Uplink Protocol</h2>
                                    <p className="text-[10px] font-black text-[var(--primary)] opacity-80 uppercase tracking-[0.4em] mt-1">Hardware Integration Guidance v2.4</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all text-xl">&times;</button>
                        </div>

                        {/* Content */}
                        <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar space-y-10 sm:space-y-12">

                            {/* Step 1: Authentication */}
                            <section className="space-y-5 sm:space-y-6">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-[var(--primary)] flex items-center justify-center text-[10px] font-black text-white">01</span>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)]">Node Authentication</h3>
                                </div>
                                <div className="p-5 sm:p-8 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-4">
                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                                        Each hardware scanner (Raspberry Pi, ESP32, or Custom Terminal) must authenticate via the secure <strong>X-Node-Key</strong> header.
                                        Your organization's unique biometric signature is listed below:
                                    </p>
                                    <div className="flex items-center gap-3 bg-[var(--bg-input)] p-4 rounded-2xl border border-[var(--border-subtle)]">
                                        <Shield size={18} className="text-emerald-500 flex-shrink-0" />
                                        <code className="flex-1 font-mono text-[11px] text-emerald-500 tracking-wider truncate">{apiKey || '••••••••••••••••••••••••••••••••'}</code>
                                        <button onClick={() => copyToClipboard(apiKey)} className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-shrink-0">
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Step 2: Implementation */}
                            <section className="space-y-5 sm:space-y-6">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-[var(--primary)] flex items-center justify-center text-[10px] font-black text-white">02</span>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)]">Uplink Endpoint</h3>
                                </div>
                                <div className="p-5 sm:p-6 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] font-mono text-[11px] space-y-2 overflow-x-auto">
                                    <p className="text-primary-light opacity-80"># POST Request Structure</p>
                                    <p className="text-[var(--text-muted)]">URL: <span className="text-[var(--text-primary)]">https://mcb-ghana-hrm-api.onrender.com/api/attendance/node-scan</span></p>
                                    <p className="text-[var(--text-muted)]">METHOD: <span className="text-emerald-500">POST</span></p>
                                    <p className="text-[var(--text-muted)]">HEADER: <span className="text-amber-500">Authorization: {apiKey || 'YOUR_KEY'}</span></p>
                                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                                        <p className="text-primary-light opacity-80"># Payload</p>
                                        <p className="text-[var(--text-secondary)]">{'{ "employeeCode": "MCB-GH-001" }'}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Step 3: Logistics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                                <div className="p-6 sm:p-8 rounded-3xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 space-y-4">
                                    <div className="flex items-center gap-3 text-[var(--primary)] mb-2">
                                        <Zap size={20} />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Real-time Feedback</h4>
                                    </div>
                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-medium">
                                        The node-scan API provides immediate validation. Ensure your hardware supports visual/auditory feedback (LEDs/Buzzer) to confirm successful clocking.
                                    </p>
                                </div>
                                <div className="p-6 sm:p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                                    <div className="flex items-center gap-3 text-emerald-500 mb-2">
                                        <CheckCircle2 size={20} />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Fail-safe Logic</h4>
                                    </div>
                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-medium">
                                        System automatically toggles between Clock-In and Clock-Out based on daily activity logs, eliminating complex state management on your device.
                                    </p>
                                </div>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="p-5 sm:p-8 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.3em]">MCB Enterprise Systems · Logistics Integration Hub</p>
                            <button className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--primary)]/40 transition-all group">
                                <span className="text-[10px] font-black uppercase tracking-widest">Technical Docs</span>
                                <ExternalLink size={14} className="opacity-40 group-hover:opacity-100" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default HardwareGuide;
