import React, { useEffect, useState } from 'react';
import { 
  Inbox as InboxIcon, 
  Search, 
  Filter, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Bell, 
  Mail,
  MoreVertical,
  RefreshCcw,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { format } from 'date-fns';
import { cn } from '../utils/cn';
import { toast } from '../utils/toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const Inbox = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All messages marked as read');
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Message deleted');
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const filteredNotifications = notifications
    .filter(n => filter === 'ALL' || !n.isRead)
    .filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.message.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-10 pb-32">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-4">
             <div className="p-3 rounded-2xl bg-[var(--primary)] text-white shadow-xl shadow-[var(--primary)]/20 relative">
               <InboxIcon size={24} />
               {unreadCount > 0 && (
                 <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--error)] border-2 border-white flex items-center justify-center text-[10px] font-black">
                   {unreadCount}
                 </div>
               )}
             </div>
             Inbox
          </h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <Bell size={18} className="text-[var(--primary)] opacity-60" />
            Central Communications and Notifications Hub
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchNotifications}
            className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] transition-all"
          >
            <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
          </button>
          <button 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="px-6 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Check size={16} /> {t('leave.mark_all_read', 'Mark All Read')}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="nx-card p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
          <input 
            type="text" 
            placeholder={t('leave.search_communications', 'Search communications...')}
            className="w-full bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] rounded-2xl py-4 pl-14 pr-6 text-[14px] font-medium outline-none focus:border-[var(--primary)] transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border-subtle)]">
          {(['ALL', 'UNREAD'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                filter === f 
                  ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="nx-card overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="py-40 flex flex-col items-center justify-center gap-6">
            <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] animate-pulse">{t('leave.syncing_inbox', 'Syncing Inbox...')}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-40 text-center">
             <div className="w-24 h-24 rounded-[2.5rem] bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] flex items-center justify-center mx-auto mb-8">
               <Mail size={32} className="text-[var(--text-muted)] opacity-20" />
             </div>
             <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-2">{t('leave.inbox_clear', 'Your inbox is clear')}</h3>
             <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-widest font-black opacity-40">{t('leave.inbox_clear_desc', 'All communications have been handled')}</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]/50">
            {filteredNotifications.map((n) => (
              <motion.div 
                layout
                key={n.id}
                className={cn(
                  "p-8 transition-all flex flex-col md:flex-row items-start gap-6 group",
                  !n.isRead ? "bg-[var(--primary)]/[0.02]" : "bg-transparent opacity-80"
                )}
              >
                <div className="flex-shrink-0 pt-1">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm relative",
                    n.type === 'ALERT' ? "bg-[var(--error)]/10 text-[var(--error)]" :
                    n.type === 'WARNING' ? "bg-[var(--warning)]/10 text-[var(--warning)]" :
                    n.type === 'SUCCESS' ? "bg-[var(--success)]/10 text-[var(--success)]" :
                    "bg-[var(--primary)]/10 text-[var(--primary)]"
                  )}>
                    {n.type === 'ALERT' ? <AlertCircle size={20} /> :
                     n.type === 'WARNING' ? <Clock size={20} /> :
                     n.type === 'SUCCESS' ? <CheckCircle size={20} /> :
                     <Bell size={20} />}
                    
                    {!n.isRead && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--primary)] border-2 border-white shadow-sm" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className={cn(
                      "text-[16px] tracking-tight truncate",
                      !n.isRead ? "font-black text-[var(--text-primary)]" : "font-bold text-[var(--text-secondary)]"
                    )}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">
                      {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-4">
                    {n.message}
                  </p>
                  
                  <div className="flex items-center gap-4">
                    {n.link && (
                      <button 
                        onClick={() => window.location.href = n.link!}
                        className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] hover:underline flex items-center gap-2"
                      >
                        Handle Action <ChevronRight size={12} />
                      </button>
                    )}
                    {!n.isRead && (
                      <button 
                        onClick={() => markAsRead(n.id)}
                        className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => deleteNotification(n.id)}
                    className="w-10 h-10 rounded-xl bg-rose-500/5 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
