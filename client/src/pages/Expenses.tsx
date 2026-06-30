import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Receipt, Wallet, CheckCircle2, XCircle, 
  Clock, FileText,
  TrendingUp, Download, PieChart, X, ExternalLink
} from 'lucide-react';
import { cn } from '../utils/cn';
import api from '../services/api';
import { getStoredUser } from '../utils/session';
import CreateExpenseModal from '../components/expenses/CreateExpenseModal';
import { toast } from '../utils/toast';
import { useTranslation } from 'react-i18next';

const Expenses = () => {
  const { t } = useTranslation();
  const [claims, setClaims] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'approvals'>('my');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const user = getStoredUser();
  const isManager = (user?.rank || 0) >= 70;

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'my') {
        const res = await api.get('/expenses/my');
        setClaims(res.data);
      } else {
        const res = await api.get('/expenses/approvals');
        setApprovals(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync financial ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const stats = useMemo(() => {
    const data = activeTab === 'my' ? claims : approvals;
    const total = data.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const pending = data.filter(c => c.status === 'PENDING').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const approved = data.filter(c => c.status === 'APPROVED' || c.status === 'PAID').reduce((acc, curr) => acc + Number(curr.amount), 0);
    
    return [
      { label: 'Total Volume', value: total.toLocaleString(), icon: Wallet, color: 'blue' },
      { label: 'Pending Hold', value: pending.toLocaleString(), icon: Clock, color: 'amber' },
      { label: 'Cleared Funds', value: approved.toLocaleString(), icon: CheckCircle2, color: 'green' },
      { label: 'Claims Count', value: data.length.toString(), icon: TrendingUp, color: 'purple' },
    ];
  }, [claims, approvals, activeTab]);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await api.patch(`/expenses/${id}/approve`);
      toast.success('Claim authorized successfully');
      fetchData();
    } catch (err) {
      toast.error('Authorization failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason === null) return;
    
    try {
      setProcessingId(id);
      await api.patch(`/expenses/${id}/reject`, { reason });
      toast.success('Claim rejected and notification sent');
      fetchData();
    } catch (err) {
      toast.error('Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'REJECTED': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'PAID': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }
  };

  const activeData = activeTab === 'my' ? claims : approvals;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)] uppercase">
            Expense <span className="text-[var(--primary)]">Desk</span>
          </h1>
          <p className="text-[var(--text-muted)] mt-2 font-medium leading-relaxed">Manage reimbursements and financial claims with Pulse precision.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] transition-all flex items-center gap-2 shadow-2xl"
          >
            <Plus size={18} />
            New Claim
          </button>
        </div>
      </div>

      {/* Tabs & Stats Row */}
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        {isManager && (
          <div className="flex p-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] w-fit shadow-lg">
            <button
              onClick={() => setActiveTab('my')}
              className={cn(
                "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'my' ? "bg-[var(--primary)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              Personal
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={cn(
                "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'approvals' ? "bg-[var(--primary)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              Review Panel
            </button>
          </div>
        )}
        
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm"
            >
              <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50">{stat.label}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-lg font-black text-[var(--text-primary)] truncate">{stat.value}</p>
                <stat.icon size={14} className={`text-${stat.color}-500 opacity-60`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Table Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-[2rem] sm:rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
      >
        <div className="p-6 sm:p-8 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-elevated)]/30">
          <div>
            <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight uppercase">
              {activeTab === 'my' ? 'Submission History' : 'Review Pipeline'}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1 opacity-60">Verified Financial Ledger</p>
          </div>
          <div className="flex items-center gap-2">
             <button className="p-3 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-sidebar-active)] hover:text-[var(--primary)] transition-all shadow-sm"><Download size={18} /></button>
             <button className="p-3 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-sidebar-active)] hover:text-[var(--primary)] transition-all shadow-sm"><PieChart size={18} /></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="nexus-responsive-table w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-sidebar-active)]/30">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 italic border-b border-[var(--border-subtle)]/50">ID & Ref</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 italic border-b border-[var(--border-subtle)]/50">Classification</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 italic border-b border-[var(--border-subtle)]/50 text-right">Value</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 italic border-b border-[var(--border-subtle)]/50 text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 italic border-b border-[var(--border-subtle)]/50 text-center">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/50">
              {loading ? (
                <tr><td colSpan={5} className="p-32 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin h-10 w-10 border-4 border-[var(--primary)]/10 border-t-[var(--primary)] rounded-full" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Decrypting Assets</p>
                  </div>
                </td></tr>
              ) : activeData.length === 0 ? (
                <tr><td colSpan={5} className="p-32 text-center text-[var(--text-muted)] text-sm font-black uppercase tracking-[0.2em] opacity-40">Zero claims detected in this sector</td></tr>
              ) : activeData.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--bg-sidebar-active)]/20 transition-all group">
                  <td className="px-8 py-6" data-label="ID & Ref">
                    <span className="font-mono text-[10px] font-black text-[var(--primary)] bg-[var(--primary)]/5 px-2 py-1 rounded-lg">#{item.id.slice(0, 8).toUpperCase()}</span>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2 font-black uppercase opacity-60">{new Date(item.submittedAt || item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
                  </td>
                  <td className="px-8 py-6" data-label="Classification">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)]/50 flex items-center justify-center text-[var(--text-muted)] border border-[var(--border-subtle)] group-hover:border-[var(--primary)]/50 transition-all">
                        <Receipt size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">{item.title || item.category}</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5">{activeTab === 'approvals' ? (item.employee?.fullName || 'Personnel') : item.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right" data-label="Value">
                    <p className="text-base font-black text-[var(--text-primary)]">{item.currency} {Number(item.amount).toLocaleString()}</p>
                    <p className="text-[9px] text-[var(--text-muted)] font-black uppercase opacity-60 italic">{activeTab === 'approvals' && (item.employee?.departmentObj?.name || 'Global HQ')}</p>
                  </td>
                  <td className="px-8 py-6 text-center" data-label="Status">
                    <span className={cn(
                      "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-inner",
                      getStatusColor(item.status)
                    )}>
                      {t(`finance.status.${item.status}`)}
                    </span>
                  </td>
                  <td className="px-8 py-6" data-label="Control">
                    <div className="flex items-center justify-center gap-3">
                       {activeTab === 'approvals' && item.status === 'PENDING' ? (
                         <>
                           <button 
                            disabled={processingId === item.id}
                            onClick={() => handleApprove(item.id)}
                            className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center justify-center border border-emerald-500/20"
                           >
                             <CheckCircle2 size={18} />
                           </button>
                           <button 
                            disabled={processingId === item.id}
                            onClick={() => handleReject(item.id)}
                            className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center justify-center border border-rose-500/20"
                           >
                             <XCircle size={18} />
                           </button>
                         </>
                       ) : (
                         <button 
                          onClick={() => {
                            if (item.receiptUrl) setViewingReceipt(item.receiptUrl);
                            else toast.info('No receipt attached to this claim');
                          }}
                          className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all flex items-center justify-center border border-transparent shadow-sm"
                         >
                           <FileText size={18} />
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Receipt Viewer Modal */}
      <AnimatePresence>
        {viewingReceipt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingReceipt(null)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="max-w-4xl max-h-[85vh] relative z-10 flex flex-col items-center">
               <div className="absolute top-[-50px] right-2 md:right-0 flex gap-3">
                  <a href={viewingReceipt} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-[var(--primary)] transition-all border border-white/20"><ExternalLink size={18} /></a>
                  <button onClick={() => setViewingReceipt(null)} className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-rose-500 transition-all border border-white/20"><X size={18} /></button>
               </div>
               <img src={viewingReceipt} alt="Receipt Asset" className="max-h-full rounded-[2rem] border-4 border-white/10 shadow-3xl object-contain bg-white" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CreateExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  );
};

export default Expenses;
