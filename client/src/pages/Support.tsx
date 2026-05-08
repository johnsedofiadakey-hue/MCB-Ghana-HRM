import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LifeBuoy, Search, Plus, 
  User,
  Send, Paperclip, MoreVertical, ChevronLeft,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../utils/cn';
import api from '../services/api';
import { getStoredUser } from '../utils/session';
import CreateTicketModal from '../components/support/CreateTicketModal';
import { toast } from '../utils/toast';

const Support = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const user = getStoredUser();
  const isAdmin = (user?.rank || 0) >= 80;

  useEffect(() => {
    fetchTickets();
  }, [filterCategory, filterStatus]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.comments]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get(isAdmin ? '/support/all' : '/support/my', {
        params: { category: filterCategory, status: filterStatus }
      });
      setTickets(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync support queue');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (id: string) => {
    try {
      const res = await api.get(`/support/tickets/${id}`);
      setSelectedTicket(res.data);
    } catch (err) {
      toast.error('Failed to retrieve ticket transcript');
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim() || !selectedTicket) return;
    try {
      await api.post(`/support/tickets/${selectedTicket.id}/comments`, { content: comment });
      setComment('');
      fetchTicketDetails(selectedTicket.id);
    } catch (err) {
      toast.error('Uplink failed');
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      await api.patch(`/support/tickets/${selectedTicket.id}/status`, { status });
      toast.success(`Ticket marked as ${status}`);
      fetchTicketDetails(selectedTicket.id);
      fetchTickets();
    } catch (err) {
      toast.error('Protocol update failed');
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'URGENT': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'HIGH': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] lg:h-[calc(100vh-160px)] flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)] uppercase">
            Internal <span className="text-[var(--primary)]">Helpdesk</span>
          </h1>
          <p className="text-[10px] md:text-[12px] text-[var(--text-muted)] mt-2 font-medium italic">Fast-track resolution pipeline for Enterprise operations.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary w-full sm:w-auto"
        >
          <Plus size={18} />
          Create Ticket
        </button>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* Ticket List Sidebar */}
        <div className={cn(
          "w-full lg:w-[420px] flex flex-col gap-4 min-h-0",
          selectedTicket ? "hidden lg:flex" : "flex"
        )}>
           <div className="p-2 rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl space-y-2">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Filter transmissions..." 
                  className="w-full pl-14 pr-6 py-4 rounded-[2rem] bg-transparent border-none outline-none text-sm font-bold text-[var(--text-primary)]"
                />
              </div>
              <div className="flex gap-2 px-2 pb-2">
                <select className="flex-1 bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] rounded-xl py-2 px-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] outline-none" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                    <option value="">All Areas</option>
                    <option value="IT">IT Infrastructure</option>
                    <option value="HR">HR Policies</option>
                    <option value="FACILITY">Facilities</option>
                </select>
                <select className="flex-1 bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] rounded-xl py-2 px-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">Any Status</option>
                    <option value="OPEN">Open</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                </select>
              </div>
           </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Syncing Queue</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-16 text-center bg-[var(--bg-card)] rounded-[2.5rem] border border-dashed border-[var(--border-subtle)]/50 opacity-40">
                <LifeBuoy size={40} className="mx-auto mb-4" />
                <p className="text-[var(--text-muted)] text-xs font-black uppercase tracking-widest">No active tickets</p>
              </div>
            ) : tickets.map((t) => (
              <motion.div
                key={t.id}
                onClick={() => fetchTicketDetails(t.id)}
                className={cn(
                  "p-6 rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden",
                  selectedTicket?.id === t.id 
                    ? "bg-[var(--bg-sidebar-active)] border-[var(--primary)] shadow-[0_20px_50px_rgba(var(--primary-rgb),0.1)]" 
                    : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--primary)]/40 hover:shadow-xl"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                       <span className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm", getPriorityColor(t.priority))}>
                         {t.priority}
                       </span>
                       <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-30">HEX-{t.id.slice(0,6).toUpperCase()}</span>
                    </div>
                    <h3 className="font-black text-[var(--text-primary)] text-sm truncate group-hover:text-[var(--primary)] transition-colors">{t.subject}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-2 font-medium leading-relaxed opacity-70">{t.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-elevated)] px-2 py-1 rounded-lg">
                      {new Date(t.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </span>
                    {t.status === 'OPEN' ? (
                       <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary)] animate-pulse" />
                    ) : (
                       <CheckCircle2 size={12} className="text-emerald-500 opacity-40" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Messaging Container */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 min-h-0 rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden shadow-2xl relative",
          !selectedTicket && "hidden lg:flex items-center justify-center p-20 text-center"
        )}>
          {!selectedTicket ? (
            <div className="space-y-8 max-w-sm">
              <div className="w-28 h-28 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-2xl rotate-3">
                <LifeBuoy size={48} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase">Select Signal</h2>
                <p className="text-[var(--text-muted)] font-medium mt-3 leading-relaxed">Choose a transmission from the queue to start troubleshooting or review status.</p>
              </div>
              <div className="pt-4 flex justify-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce" />
                 <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce delay-100" />
                 <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce delay-200" />
              </div>
            </div>
          ) : (
            <>
              {/* Communication Top Bar */}
              <div className="p-6 md:p-10 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <button onClick={() => setSelectedTicket(null)} className="lg:hidden w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]"><ChevronLeft size={24} /></button>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-xl font-black shadow-lg">
                    {selectedTicket.employee?.fullName?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                       <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">{selectedTicket.subject}</h2>
                       <span className="px-3 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-[9px] font-black uppercase tracking-widest border border-[var(--primary)]/20 shadow-sm">{selectedTicket.status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] font-bold">
                      <span className="flex items-center gap-1.5 opacity-60"><User size={12} className="text-[var(--primary)]" /> {selectedTicket.employee?.fullName}</span>
                      <span className="opacity-20">•</span>
                      <span className="bg-[var(--bg-elevated)] px-2 py-0.5 rounded-md text-[9px] uppercase tracking-widest">{selectedTicket.category} System</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <div className="flex gap-2">
                             {selectedTicket.status !== 'RESOLVED' && (
                                <button onClick={() => handleUpdateStatus('RESOLVED')} className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">Resolve</button>
                             )}
                             {selectedTicket.status !== 'CLOSED' && (
                                <button onClick={() => handleUpdateStatus('CLOSED')} className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Close</button>
                             )}
                        </div>
                    )}
                    <button className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] transition-all">
                      <MoreVertical size={20} />
                    </button>
                </div>
              </div>

              {/* Threaded Transcript Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-10 bg-slate-50/50 dark:bg-slate-900/10">
                {/* Initial Transmission */}
                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-500 shrink-0 font-black shadow-sm">
                    {selectedTicket.employee?.fullName?.[0]}
                  </div>
                  <div className="flex-1 max-w-[85%]">
                    <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-800 text-[13px] font-medium text-[var(--text-primary)] border border-slate-200 dark:border-slate-700 shadow-sm leading-relaxed">
                      {selectedTicket.description}
                    </div>
                    <div className="flex items-center gap-2 mt-3 px-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40">Personnel Command</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-30">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedTicket.comments?.map((c: any) => (
                    <motion.div 
                      key={c.id} 
                      initial={{ opacity: 0, x: c.userId === user.id ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex gap-5",
                        c.userId === user.id ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black shadow-md border",
                        c.userId === user.id 
                            ? "bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white border-[var(--primary)]/20" 
                            : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                      )}>
                        {c.user?.fullName?.[0] || '?'}
                      </div>
                      <div className={cn(
                        "flex-1 max-w-[85%]",
                        c.userId === user.id ? "text-right" : "text-left"
                      )}>
                        <div className={cn(
                          "p-6 rounded-[2rem] text-[13px] font-medium border leading-relaxed shadow-sm",
                          c.userId === user.id 
                            ? "bg-[var(--primary)]/5 border-[var(--primary)]/20 text-[var(--text-primary)] rounded-tr-none" 
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-tl-none"
                        )}>
                          {c.content}
                        </div>
                        <div className={cn(
                            "mt-3 flex items-center gap-2 px-2",
                            c.userId === user.id ? "justify-end" : "justify-start"
                        )}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40">
                                {['IT_ADMIN', 'IT_MANAGER'].includes(c.user?.role) ? 'Tech Support' : 'Personnel'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-30">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </AnimatePresence>
              </div>

              {/* Uplink Area */}
              <div className="p-6 md:p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <div className="flex items-center gap-4 p-2 pl-6 pr-2 rounded-[2.5rem] bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] focus-within:border-[var(--primary)] focus-within:bg-[var(--bg-card)] focus-within:shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)] transition-all">
                  <input 
                    type="text" 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    placeholder="Type your reply to this transmission..." 
                    className="flex-1 bg-transparent border-none outline-none text-sm font-bold py-4 text-[var(--text-primary)]"
                  />
                  <div className="flex items-center gap-2">
                    <button className="w-12 h-12 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors rounded-2xl hover:bg-[var(--bg-card)]"><Paperclip size={20} /></button>
                    <button 
                      onClick={handleSendComment}
                      className="w-14 h-14 bg-[var(--primary)] text-white rounded-2xl hover:shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] hover:scale-105 transition-all flex items-center justify-center"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <CreateTicketModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchTickets} 
      />
    </div>
  );
};

export default Support;
