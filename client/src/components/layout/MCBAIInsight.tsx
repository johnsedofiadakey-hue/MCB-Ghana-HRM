import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, Brain, Zap, 
  AlertCircle, CheckCircle2, 
  TrendingUp, Info, Bot, Send, MessageSquare
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAI } from '../../context/AIContext';
import { analyzeContext, type StrategicVerdict, type StrategicInsight } from '../../services/InsightEngine';
import { getStoredUser } from '../../utils/session';
import api from '../../services/api';

interface MCBAIInsightProps {
    isOpen: boolean;
    onClose: () => void;
    contextData?: any;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

const MCBAIInsight: React.FC<MCBAIInsightProps> = ({ isOpen, onClose, contextData }) => {
    const location = useLocation();
    const { contextData: globalContextData, isEnabled } = useAI();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [verdict, setVerdict] = useState<StrategicVerdict | null>(null);
    const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');
    
    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const user = getStoredUser();
    const isStrategicMode = (user.rank || 0) >= 85;
    const activeContext = contextData || globalContextData;

    useEffect(() => {
        if (isOpen && isEnabled && activeTab === 'insights') {
            setIsAnalyzing(true);
            const runAnalysis = async () => {
                try {
                    const results = await analyzeContext(location.pathname, activeContext);
                    setVerdict(results);
                } finally {
                    setIsAnalyzing(false);
                }
            };
            const timer = setTimeout(runAnalysis, 1200);
            return () => clearTimeout(timer);
        }
    }, [isOpen, isEnabled, location.pathname, activeContext, activeTab]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    if (!isEnabled) return null;

    const getIcon = (type: StrategicInsight['type']) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircle2 className="text-emerald-500" size={14} />;
            case 'WARNING': return <AlertCircle className="text-amber-500" size={14} />;
            case 'CRITICAL': return <Zap className="text-rose-500" size={14} />;
            default: return <Info className="text-sky-500" size={14} />;
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatInput.trim() || isTyping) return;

        const newUserMessage = { role: 'user' as const, text: chatInput };
        setMessages(prev => [...prev, newUserMessage]);
        setChatInput('');
        setIsTyping(true);

        try {
            const { data } = await api.post('/ai/chat', { 
                message: newUserMessage.text,
                history: messages
            });
            setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
        } catch (error: any) {
            console.error('Chat error:', error);
            const detail = error.response?.data?.details || error.response?.data?.error || "Connection synchronization error";
            setMessages(prev => [...prev, { 
                role: 'model', 
                text: `I'm currently unable to synchronize with the MCB HRM Ghana intelligence layer (${detail}). Please try again shortly.` 
            }]);
        } finally {
            setIsTyping(false);
        }
    };

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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] lg:bg-transparent lg:backdrop-blur-none"
                    />

                    {/* Sidebar Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full sm:w-[400px] lg:w-[450px] bg-[var(--bg-card)]/95 backdrop-blur-2xl border-l border-[var(--border-subtle)] z-[101] shadow-2xl flex flex-col ai-neural-bg"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-50" />
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white ai-glow-primary shadow-lg animate-pulse-subtle">
                                    <Bot size={22} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">
                                        {isStrategicMode ? 'MCB HRM Ghana Strategic Intelligence' : 'Cortex Assistant'}
                                    </h2>
                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles size={10} className={cn(isStrategicMode ? "text-amber-500" : "text-[var(--primary)]")} /> 
                                        {isStrategicMode ? 'Executive Laboratory' : 'AI Assistant'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-2 bg-[var(--bg-elevated)]/30 border-b border-[var(--border-subtle)]">
                            <button
                                onClick={() => setActiveTab('insights')}
                                className={cn(
                                    "flex-1 py-2 text-xs font-black uppercase tracking-[0.2em] rounded-lg transition-all flex items-center justify-center gap-2",
                                    activeTab === 'insights' 
                                        ? "bg-[var(--primary)] text-white shadow-lg" 
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                <Brain size={14} /> Insights
                            </button>
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={cn(
                                    "flex-1 py-2 text-xs font-black uppercase tracking-[0.2em] rounded-lg transition-all flex items-center justify-center gap-2",
                                    activeTab === 'chat' 
                                        ? "bg-[var(--primary)] text-white shadow-lg" 
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                <MessageSquare size={14} /> Chat
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden flex flex-col relative">
                            {/* INSIGHTS TAB */}
                            {activeTab === 'insights' && (
                                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                                    {isAnalyzing ? (
                                        <div className="h-full flex flex-col items-center justify-center gap-6 py-20">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-full border-2 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                                                <Brain className="absolute inset-0 m-auto text-[var(--primary)] animate-pulse" size={24} />
                                            </div>
                                            <div className="space-y-1 text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em] ai-gradient-text">Analyzing Context</p>
                                                <p className="text-[9px] font-bold text-[var(--text-muted)] animate-pulse">Scanning MCB HRM Ghana multidimensional data points...</p>
                                            </div>
                                        </div>
                                    ) : verdict ? (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                            {/* Primary Verdict Card */}
                                            <motion.div 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={cn(
                                                    "nx-card p-6 bg-gradient-to-br border-2 transition-all duration-1000",
                                                    isStrategicMode 
                                                        ? "from-amber-500/10 to-transparent border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]" 
                                                        : "from-[var(--bg-elevated)]/50 to-[var(--bg-card)]/30 border-[var(--primary)]/20 ai-border-glow"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                                                        <TrendingUp size={16} />
                                                    </div>
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-[var(--primary)]">{verdict.title}</h3>
                                                </div>
                                                <p className="text-sm font-bold text-[var(--text-primary)] leading-relaxed mb-4">
                                                    {verdict.summary}
                                                </p>
                                                <div className={cn("p-4 rounded-xl border transition-all", isStrategicMode ? "bg-amber-500/10 border-amber-500/20" : "bg-[var(--primary)]/5 border-border-[var(--primary)]/10")}>
                                                    <p className={cn("text-[9px] font-black uppercase tracking-[0.2em] mb-2", isStrategicMode ? "text-amber-600" : "text-[var(--primary)]")}>
                                                        {isStrategicMode ? 'MCB HRM Ghana Advisory' : 'Strategic Verdict'}
                                                    </p>
                                                    <p className="text-xs font-medium text-[var(--text-secondary)] italic leading-relaxed">
                                                        "{verdict.recommendation}"
                                                    </p>
                                                </div>
                                            </motion.div>

                                            {/* Decomposition Analysis */}
                                            {verdict.insights && verdict.insights.length > 0 && (
                                                <div className="space-y-6">
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] px-1">Dimensional Breakdown</h4>
                                                    <div className="space-y-4">
                                                        {verdict.insights.map((insight, i) => (
                                                            <motion.div 
                                                                key={insight.id || i}
                                                                initial={{ opacity: 0, x: 20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: i * 0.1 }}
                                                                className="p-4 rounded-xl bg-[var(--bg-elevated)]/40 border border-[var(--border-subtle)] space-y-3"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        {getIcon(insight.type)}
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">{insight.label}</span>
                                                                    </div>
                                                                    <span className="text-[9px] font-bold text-[var(--text-muted)] opacity-60">Impact: {insight.impact}%</span>
                                                                </div>
                                                                <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                                                                    {insight.description}
                                                                </p>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <div className="text-center py-20 opacity-40">
                                            <Bot size={48} className="mx-auto mb-4" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Awaiting Contextual Stream</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CHAT TAB */}
                            {activeTab === 'chat' && (
                                <div className="flex flex-col h-full bg-[var(--bg-main)]">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                        {messages.length === 0 && (
                                            <div className="text-center py-10 opacity-50">
                                                <Bot size={48} className="mx-auto mb-4 text-[var(--primary)]" />
                                                <p className="text-sm font-bold text-[var(--text-primary)]">I am Cortex, your MCB HRM Ghana Assistant.</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-2">Ask me anything about HR policies, system analytics, or employee performance.</p>
                                            </div>
                                        )}
                                        
                                        {messages.map((m, i) => (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                key={i} 
                                                className={cn(
                                                    "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                                                    m.role === 'user' 
                                                        ? "ml-auto bg-[var(--primary)] text-white rounded-tr-sm ai-glow-primary" 
                                                        : "mr-auto bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-sm"
                                                )}
                                            >
                                                {m.text}
                                            </motion.div>
                                        ))}
                                        
                                        {isTyping && (
                                            <div className="mr-auto max-w-[85%] p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-tl-sm space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" />
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '0.4s' }} />
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--primary)] animate-pulse">Neural Sync in Progress</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-[var(--bg-card)] rounded-full overflow-hidden">
                                                    <motion.div 
                                                        initial={{ x: '-100%' }}
                                                        animate={{ x: '100%' }}
                                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                                        className="h-full w-1/3 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    <form onSubmit={handleSendMessage} className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-subtle)]">
                                        <div className="relative flex items-center">
                                            <input
                                                type="text"
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                placeholder="Ask Cortex a question..."
                                                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-[var(--primary)] transition-colors"
                                                disabled={isTyping}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!chatInput.trim() || isTyping}
                                                className="absolute right-2 p-2 rounded-lg text-white bg-[var(--primary)] hover:bg-[var(--accent)] disabled:bg-[var(--border-subtle)] disabled:text-[var(--text-muted)] transition-colors"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MCBAIInsight;
