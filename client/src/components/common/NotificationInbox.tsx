import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, ExternalLink, X, Info, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { toast } from '../../utils/toast';
import { useTranslation } from 'react-i18next';

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
    isRead: boolean;
    link?: string;
    createdAt: string;
}

interface NotificationInboxProps {
    isOpen: boolean;
    onClose: () => void;
    onUnreadUpdate: (count: number) => void;
}

const NotificationInbox: React.FC<NotificationInboxProps> = ({ isOpen, onClose, onUnreadUpdate }) => {
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastCountRef = useRef(0);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            const data = Array.isArray(res.data) ? res.data : [];
            setNotifications(data);
            const unread = data.filter(n => !n.isRead).length;
            onUnreadUpdate(unread);

            // Play sound if new unread notifications arrived
            if (unread > lastCountRef.current && lastCountRef.current !== 0) {
                audioRef.current?.play().catch(() => {});
            }
            lastCountRef.current = unread;
        } catch (err) {
            // Silencing transient polling errors to prevent console noise
            // Verification status maintained in background
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    useEffect(() => {
        // Initial count fetch or interval
        const interval = setInterval(fetchNotifications, 30000); // 30s poll
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            onUnreadUpdate(Math.max(0, notifications.filter(n => !n.isRead).length - 1));
        } catch (err) {
            toast.error(t('notifications.mark_failed', 'Failed to update notification'));
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            onUnreadUpdate(0);
        } catch (err) {
            toast.error(t('notifications.mark_all_failed', 'Failed to update notifications'));
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            const newUnread = notifications.filter(n => n.id !== id && !n.isRead).length;
            onUnreadUpdate(newUnread);
        } catch (err) {
            toast.error(t('notifications.delete_failed', 'Failed to delete notification'));
        }
    };

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'WARNING': return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' };
            case 'SUCCESS': return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
            case 'ERROR': return { icon: X, color: 'text-rose-500', bg: 'bg-rose-500/10' };
            default: return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' };
        }
    };

    return (
        <>
            <audio ref={audioRef} src={NOTIFICATION_SOUND} preload="auto" />
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-md h-full bg-[var(--bg-card)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col"
                        >
                            <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]/30">
                                <div>
                                    <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight uppercase">{t('common.notifications', 'Notifications')}</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1 opacity-60">{t('common.system_alerts', 'System Alerts & Updates')}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={markAllRead} className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-emerald-500 transition-all" title={t('common.mark_all_read', 'Mark all read')}>
                                        <Check size={18} />
                                    </button>
                                    <button onClick={onClose} className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-rose-500 transition-all">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                                {loading && notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-40 italic">
                                        <div className="w-10 h-10 border-2 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin mb-4" />
                                        <p className="text-[10px] uppercase font-black tracking-widest">{t('notifications.syncing_inbox', 'Syncing Inbox...')}</p>
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                                        <div className="w-20 h-20 rounded-[2.5rem] bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)]">
                                            <Bell size={32} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">{t('notifications.inbox_clear', 'Empty Inbox')}</p>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">{t('notifications.no_notifications', 'No active notifications')}</p>
                                        </div>
                                    </div>
                                ) : (
                                    (notifications || []).filter(Boolean).map((n) => {
                                        const { icon: Icon, color, bg } = getTypeStyles(n.type || 'INFO');
                                        return (
                                            <motion.div
                                                layout
                                                key={n.id || Math.random()}
                                                className={cn(
                                                    "nx-card p-5 group transition-all relative overflow-hidden bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)]",
                                                    !n.isRead && "ring-1 ring-[var(--primary)]/20 shadow-lg shadow-[var(--primary)]/5"
                                                )}
                                            >
                                                {!n.isRead && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[var(--primary)] rounded-bl-lg" />}
                                                
                                                <div className="flex gap-4">
                                                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-transparent", bg, color)}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className={cn("text-[13px] font-black tracking-tight underline-offset-4", !n.isRead ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] opacity-80")}>
                                                                {n.title}
                                                            </h4>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 whitespace-nowrap ml-4">
                                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                                            </span>
                                                        </div>
                                                        <p className="text-[12px] font-medium text-[var(--text-secondary)] leading-relaxed mb-4 line-clamp-3">
                                                            {n.message}
                                                        </p>
                                                        
                                                        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]/30">
                                                            <div className="flex gap-2">
                                                                {!n.isRead && (
                                                                    <button onClick={() => markAsRead(n.id)} className="px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-[9px] font-black uppercase tracking-widest hover:bg-[var(--primary)] hover:text-white transition-all">
                                                                        {t('common.mark_read', 'Mark Read')}
                                                                    </button>
                                                                )}
                                                                {n.link && (
                                                                    <a href={n.link} className="p-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                                                                        <ExternalLink size={12} />
                                                                    </a>
                                                                )}
                                                            </div>
                                                            <button onClick={() => deleteNotification(n.id)} className="p-1.5 rounded-lg bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                            
                            <div className="p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
                                <p className="text-[9px] font-black uppercase tracking-widest text-center text-[var(--text-muted)] opacity-50">
                                    End of Protocol Buffer — {notifications.length} Nodes Loaded
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default NotificationInbox;
