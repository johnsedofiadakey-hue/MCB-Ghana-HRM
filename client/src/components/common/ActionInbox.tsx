import React, { useState, useEffect } from 'react';
import {
  Inbox, X, Target, Briefcase, Calendar,
  ChevronRight, AlertCircle, Clock, CheckCircle,
  XCircle, User, MapPin, FileText, Loader2,
  ShieldCheck, Stethoscope, Users
} from 'lucide-react';
import api from '../../services/api';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../utils/toast';

interface ActionItem {
  id: string;
  type: 'TARGET_ACK' | 'TARGET_REVIEW' | 'APPRAISAL_REVIEW' | 'LEAVE_RELIEF' | 'LEAVE_APPROVE';
  title: string;
  subtitle: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  link: string;
  data?: { leaveId?: string };
  createdAt: string;
  monitorOnly?: boolean;
}

interface LeaveDetail {
  id: string;
  status: string;
  leaveType: string;
  reason: string;
  leaveDays: number;
  handoverNotes?: string;
  medicalCertificateUrl?: string;
  createdAt: string;
  updatedAt: string;
  employee: {
    fullName: string;
    jobTitle: string;
    email: string;
    leaveBalance: number;
    leaveAllowance: number;
    departmentObj?: { name: string };
  };
  reliever?: { fullName: string; jobTitle: string };
  leaveDaysArr?: { date: string }[];
}

interface ActionInboxProps {
  isOpen: boolean;
  onClose: () => void;
  onCountUpdate: (count: number) => void;
}

const leaveTypeIcon: Record<string, React.ElementType> = {
  Sick: Stethoscope,
  Annual: Calendar,
  Maternity: Users,
  Paternity: Users,
};

const statusColors: Record<string, string> = {
  MANAGER_REVIEW: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  HR_REVIEW: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  MD_REVIEW: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  SUBMITTED: 'text-slate-400 bg-white/5 border-white/10',
};

const ActionInbox: React.FC<ActionInboxProps> = ({ isOpen, onClose, onCountUpdate }) => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [leaveModal, setLeaveModal] = useState<{ action: ActionItem; detail: LeaveDetail | null; fetching: boolean } | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const fetchActions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inbox', { _noRedirect: true } as any);
      const data = Array.isArray(res.data) ? res.data : [];
      setActions(data);
      onCountUpdate(data.length);
    } catch (err) {
      console.error('Failed to fetch inbox actions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchActions();
  }, [isOpen]);

  useEffect(() => {
    fetchActions();
    const interval = setInterval(fetchActions, 60000);
    return () => clearInterval(interval);
  }, []);

  const openLeaveModal = async (action: ActionItem) => {
    const leaveId = action.data?.leaveId;
    if (!leaveId) { navigate(action.link); onClose(); return; }
    setLeaveModal({ action, detail: null, fetching: true });
    setComment('');
    try {
      const res = await api.get(`/leave/${leaveId}/detail`);
      setLeaveModal(prev => prev ? { ...prev, detail: res.data, fetching: false } : null);
    } catch {
      toast.error('Failed to load leave details');
      setLeaveModal(null);
    }
  };

  const processLeave = async (leaveAction: 'APPROVE' | 'REJECT') => {
    if (!leaveModal?.detail) return;
    setProcessing(true);
    try {
      await api.post('/leave/process', {
        id: leaveModal.detail.id,
        action: leaveAction,
        comment,
      });
      toast.success(leaveAction === 'APPROVE' ? 'Leave approved.' : 'Leave rejected.');
      setLeaveModal(null);
      fetchActions();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'TARGET_ACK': return Target;
      case 'APPRAISAL_REVIEW': return Briefcase;
      case 'LEAVE_RELIEF': return Calendar;
      case 'LEAVE_APPROVE': return Calendar;
      default: return AlertCircle;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'MEDIUM': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-[var(--bg-card)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]/30">
                <div>
                  <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight uppercase">Action Inbox</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1 opacity-60">Pending Tasks & Decisions</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-rose-500 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                {loading && actions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40 italic">
                    <div className="w-10 h-10 border-2 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin mb-4" />
                    <p className="text-[10px] uppercase font-black tracking-widest">Compiling Actions...</p>
                  </div>
                ) : actions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                    <div className="w-20 h-20 rounded-[2.5rem] bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)]">
                      <Inbox size={32} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Clear Inbox</p>
                      <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">All protocols synchronized</p>
                    </div>
                  </div>
                ) : (
                  (actions || []).filter(Boolean).map((action) => {
                    const Icon = getIcon(action.type || 'UNKNOWN');
                    const isLeave = action.type === 'LEAVE_APPROVE' || action.type === 'LEAVE_RELIEF';
                    return (
                      <motion.button
                        key={action.id || Math.random()}
                        onClick={() => {
                          if (isLeave && action.data?.leaveId) {
                            openLeaveModal(action);
                          } else {
                            navigate(action.link);
                            onClose();
                          }
                        }}
                        className={cn(
                          "w-full text-left nx-card p-5 group transition-all relative overflow-hidden bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] hover:shadow-xl hover:shadow-[var(--primary)]/5 border-transparent hover:border-[var(--primary)]/20",
                          action.monitorOnly && 'opacity-60'
                        )}
                      >
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0 border border-[var(--primary)]/20">
                            <Icon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border", getPriorityColor(action.priority))}>
                                {action.priority}
                              </span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 flex items-center gap-1">
                                <Clock size={10} /> {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <h4 className="text-[14px] font-black tracking-tight text-[var(--text-primary)] mt-2">
                              {action.title}
                            </h4>
                            <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-1 line-clamp-2">
                              {action.subtitle}
                            </p>
                            {action.monitorOnly && (
                              <p className="text-[9px] uppercase font-black tracking-widest text-[var(--text-muted)] mt-2 opacity-60">Monitor only</p>
                            )}
                            <div className="flex items-center gap-2 mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                              {isLeave ? 'Review Details' : 'Execute Action'} <ChevronRight size={10} />
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>

              <div className="p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]">
                    <AlertCircle size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] leading-tight">Actions require immediate attention to maintain organizational velocity.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Leave Detail / Approval Modal */}
      <AnimatePresence>
        {leaveModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLeaveModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 flex items-start justify-between sticky top-0 z-10 backdrop-blur-md rounded-t-3xl">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-1">Leave Request Review</p>
                  <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                    {leaveModal.action.title}
                  </h2>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">{leaveModal.action.subtitle}</p>
                </div>
                <button onClick={() => setLeaveModal(null)} className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-rose-500 transition-all mt-1">
                  <X size={18} />
                </button>
              </div>

              {leaveModal.fetching ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
                  <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Loading Leave Details...</p>
                </div>
              ) : leaveModal.detail ? (
                <div className="p-8 space-y-6">
                  {/* Employee Info */}
                  <div className="nx-card p-6 space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] flex items-center gap-2"><User size={12} /> Employee</p>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-xl font-black border border-[var(--primary)]/20">
                        {leaveModal.detail.employee.fullName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-lg font-black text-[var(--text-primary)]">{leaveModal.detail.employee.fullName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{leaveModal.detail.employee.jobTitle}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{leaveModal.detail.employee.departmentObj?.name}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                        <p className="text-[9px] uppercase tracking-widest font-black text-[var(--text-muted)]">Leave Balance</p>
                        <p className="text-xl font-black text-[var(--primary)] mt-1">{leaveModal.detail.employee.leaveBalance} <span className="text-xs font-medium text-[var(--text-muted)]">days</span></p>
                      </div>
                      <div className="px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                        <p className="text-[9px] uppercase tracking-widest font-black text-[var(--text-muted)]">Days Requested</p>
                        <p className="text-xl font-black text-amber-400 mt-1">{leaveModal.detail.leaveDays} <span className="text-xs font-medium text-[var(--text-muted)]">days</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Leave Details */}
                  <div className="nx-card p-6 space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] flex items-center gap-2"><FileText size={12} /> Leave Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest font-black text-[var(--text-muted)]">Type</p>
                        <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{leaveModal.detail.leaveType}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest font-black text-[var(--text-muted)]">Status</p>
                        <span className={cn("inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border", statusColors[leaveModal.detail.status] || 'text-slate-400 bg-white/5 border-white/10')}>
                          {leaveModal.detail.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest font-black text-[var(--text-muted)]">Submitted</p>
                        <p className="text-xs font-bold text-[var(--text-primary)] mt-1">{format(new Date(leaveModal.detail.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest font-black text-[var(--text-muted)]">Last Updated</p>
                        <p className="text-xs font-bold text-[var(--text-primary)] mt-1">{format(new Date(leaveModal.detail.updatedAt), 'dd MMM yyyy, HH:mm')}</p>
                      </div>
                    </div>

                    {/* Selected dates */}
                    {leaveModal.detail.leaveDaysArr && leaveModal.detail.leaveDaysArr.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-2">Selected Dates</p>
                        <div className="flex flex-wrap gap-2">
                          {leaveModal.detail.leaveDaysArr.map((d: any) => (
                            <span key={d.date} className="px-2.5 py-1 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-bold text-[var(--primary)]">
                              {format(new Date(d.date), 'EEE, dd MMM')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reason */}
                  <div className="nx-card p-6">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-3">Reason / Description</p>
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">{leaveModal.detail.reason || <span className="italic text-[var(--text-muted)]">No reason provided</span>}</p>
                  </div>

                  {/* Reliever */}
                  {leaveModal.detail.reliever && (
                    <div className="nx-card p-6">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-3 flex items-center gap-2"><ShieldCheck size={12} /> Reliever / Cover Person</p>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{leaveModal.detail.reliever.fullName}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{leaveModal.detail.reliever.jobTitle}</p>
                      {leaveModal.detail.handoverNotes && (
                        <div className="mt-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                          <p className="text-[9px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-1">Handover Notes</p>
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{leaveModal.detail.handoverNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Medical Certificate */}
                  {leaveModal.detail.medicalCertificateUrl && (
                    <div className="nx-card p-6">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-3 flex items-center gap-2"><Stethoscope size={12} /> Doctor's Report</p>
                      <a
                        href={leaveModal.detail.medicalCertificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-bold hover:bg-[var(--primary)]/20 transition-all"
                      >
                        <FileText size={14} /> View Medical Certificate
                      </a>
                    </div>
                  )}

                  {/* Approver Comment */}
                  {!leaveModal.action.monitorOnly && (
                    <div className="nx-card p-6">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-3">Your Comment (required for override/rejection)</p>
                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        rows={3}
                        className="w-full nx-input text-sm resize-none"
                        placeholder="Add a comment or reason..."
                      />
                    </div>
                  )}

                  {/* Actions */}
                  {leaveModal.action.monitorOnly ? (
                    <div className="flex justify-center">
                      <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] opacity-50">Monitor only — no action required from you at this stage</p>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => processLeave('REJECT')}
                        disabled={processing}
                        className="flex-1 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black text-sm uppercase tracking-wider hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                      >
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                        Reject
                      </button>
                      <button
                        onClick={() => processLeave('APPROVE')}
                        disabled={processing}
                        className="flex-1 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-sm uppercase tracking-wider hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                      >
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ActionInbox;
