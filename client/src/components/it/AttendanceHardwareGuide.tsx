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
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 sm:p-12">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#080c16]/95 backdrop-blur-2xl"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-4xl bg-[#0f172a] rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header Architecture */}
                        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-transparent to-white/[0.02]">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[1.8rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                                    <Cpu size={32} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Biometric Uplink Protocol</h2>
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mt-1">Hardware Integration Guidance v2.4</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">&times;</button>
                        </div>

                        {/* Content Scroll Engine */}
                        <div className="p-10 overflow-y-auto custom-scrollbar space-y-12">
                            
                            {/* Step 1: Authentication */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white">01</span>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white/90">Node Authentication</h3>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4">
                                    <p className="text-xs text-white/60 leading-relaxed font-medium">
                                        Each hardware scanner (Raspberry Pi, ESP32, or Custom Terminal) must authenticate via the secure <strong>X-Node-Key</strong> header. 
                                        Your organization's unique biometric signature is listed below:
                                    </p>
                                    <div className="flex items-center gap-4 bg-black/60 p-4 rounded-2xl border border-white/10 group">
                                        <Shield size={18} className="text-emerald-500" />
                                        <code className="flex-1 font-mono text-[11px] text-emerald-400 tracking-wider truncate">{apiKey || '••••••••••••••••••••••••••••••••'}</code>
                                        <button onClick={() => copyToClipboard(apiKey)} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all">
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Step 2: Implementation */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white">02</span>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white/90">Uplink Endpoint</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-6 rounded-2xl bg-black/40 border border-white/10 font-mono text-[11px] space-y-2">
                                        <p className="text-indigo-400"># POST Request Structure</p>
                                        <p className="text-white/40">URL: <span className="text-white">https://mcb-hrm-ghana.render.com/api/attendance/node-scan</span></p>
                                        <p className="text-white/40">METHOD: <span className="text-emerald-400">POST</span></p>
                                        <p className="text-white/40">HEADER: <span className="text-amber-400">Authorization: {apiKey || 'YOUR_KEY'}</span></p>
                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <p className="text-indigo-400"># Payload</p>
                                            <p className="text-white/80">{'{ "employeeCode": "MCB-GH-001" }'}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Step 3: Logistics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                                    <div className="flex items-center gap-3 text-indigo-400 mb-2">
                                        <Zap size={20} />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Real-time Feedback</h4>
                                    </div>
                                    <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                                        The node-scan API provides immediate validation. Ensure your hardware supports visual/auditory feedback (LEDs/Buzzer) to confirm successful clocking.
                                    </p>
                                </div>
                                <div className="p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                                    <div className="flex items-center gap-3 text-emerald-400 mb-2">
                                        <CheckCircle2 size={20} />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Fail-safe Logic</h4>
                                    </div>
                                    <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                                        System automatically toggles between Clock-In and Clock-Out based on daily activity logs, eliminating complex state management on your device.
                                    </p>
                                </div>
                            </div>

                        </div>

                        {/* Footer Architecture */}
                        <div className="p-10 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em]">MCB Enterprise Systems · Logistics Integration Hub</p>
                            <button className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all group">
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
