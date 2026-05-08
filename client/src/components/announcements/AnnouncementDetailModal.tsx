import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, Shield, Info, AlertTriangle, Zap, Download, Printer } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetAudience: 'ALL' | 'DEPARTMENT' | 'MANAGERS' | 'EXECUTIVES';
  createdAt: string;
  createdBy: {
    fullName: string;
    role: string;
  };
}

interface AnnouncementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
}

const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({ isOpen, onClose, announcement }) => {

  if (!announcement) return null;

  const priorityConfig = {
    URGENT: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: Zap, label: 'URGENT DISPATCH' },
    HIGH: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, label: 'HIGH PRIORITY' },
    NORMAL: { color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/5', border: 'border-[var(--primary)]/10', icon: Info, label: 'OFFICIAL NOTICE' },
    LOW: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Info, label: 'INFORMATION' },
  };

  const config = priorityConfig[announcement.priority] || priorityConfig.NORMAL;
  const PriorityIcon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header / Banner */}
            <div className={cn("px-8 py-6 border-b flex items-center justify-between", config.bg, config.border)}>
              <div className="flex items-center gap-4">
                <div className={cn("p-2.5 rounded-xl bg-white border shadow-sm", config.color)}>
                  <PriorityIcon size={20} />
                </div>
                <div>
                  <h4 className={cn("text-[10px] font-black uppercase tracking-[0.2em]", config.color)}>
                    {config.label}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    Reference: #{announcement.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-black/5 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 sm:p-12 custom-scrollbar">
               <div className="space-y-8">
                  {/* Title & Metadata */}
                  <div className="space-y-4">
                  <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">
                    {announcement.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-y-3 gap-x-6 pt-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <Calendar size={14} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Published On</p>
                        <p className="text-[12px] font-bold text-slate-700">{new Date(announcement.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <Shield size={14} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Target Audience</p>
                        <p className="text-[12px] font-bold text-slate-700">{announcement.targetAudience}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Content Area */}
                <div className="prose prose-slate max-w-none">
                  <div className="text-[15px] leading-relaxed text-slate-600 whitespace-pre-wrap font-medium">
                    {announcement.content}
                  </div>
                </div>

                {/* Footer Signature Look */}
                <div className="pt-12 mt-12 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                      <User size={24} />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{announcement.createdBy.fullName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{announcement.createdBy.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-[var(--primary)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-all outline-none">
                      <Printer size={18} />
                    </button>
                    <button className="p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-[var(--primary)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-all outline-none">
                      <Download size={18} />
                    </button>
                  </div>
                </div>
               </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-8 border-t bg-slate-50/50 flex justify-end">
              <button
                onClick={onClose}
                className="px-10 h-14 rounded-2xl bg-slate-900 text-white text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Acknowledge Notice
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementDetailModal;
