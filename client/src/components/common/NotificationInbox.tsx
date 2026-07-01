import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Bell, Check, Trash2, ExternalLink, X, Info, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { toast } from '../../utils/toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const lastCountRef = useRef(0);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            const data = Array.isArray(res.data) ? res.data : [];
            setNotifications(data);
            const unread = data.filter((n: Notification) => !n.isRead).length;
            onUnreadUpdate(unread);
            lastCountRef.current = unread;
        } catch {
            // silence polling errors
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchNotifications();
    }, [isOpen]);

    useEffect(() => {
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            onUnreadUpdate(Math.max(0, notifications.filter(n => !n.isRead).length - 1));
        } catch {
            toast.error(t('notifications.mark_failed', 'Failed to update notification'));
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            onUnreadUpdate(0);
        } catch {
            toast.error(t('notifications.mark_all_failed', 'Failed to update notifications'));
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            const newUnread = notifications.filter(n => n.id !== id && !n.isRead).length;
            onUnreadUpdate(newUnread);
        } catch {
            toast.error(t('notifications.delete_failed', 'Failed to delete notification'));
        }
    };

    const handleNotificationClick = (n: Notification) => {
        if (!n.isRead) markAsRead(n.id);
        if (n.link) {
            onClose();
            if (n.link.startsWith('http')) {
                window.open(n.link, '_blank', 'noopener');
            } else {
                navigate(n.link);
            }
        }
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'WARNING': return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' };
            case 'SUCCESS': return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
            case 'ERROR': return { icon: X, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' };
            default: return { icon: Info, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10 border-[var(--primary)]/20' };
        }
    };

    const panel = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex justify-end" style={{ isolation: 'isolate' }}>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                        className="relative w-full max-w-md h-full flex flex-col shadow-2xl"
                        style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border-subtle)' }}
                    >
                        {/* Header */}
                        <div className="p-6 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--border-subtle)', background: 'color-mix(in srgb, var(--bg-elevated) 60%, transparent)' }}>
                            <div>
                                <h2 className="text-base font-black tracking-tight uppercase" style={{ color: 'var(--text-primary)' }}>
                                    {t('common.notifications', 'Notifications')}
                                </h2>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    {notifications.filter(n => !n.isRead).length} unread · {notifications.length} total
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={markAllRead}
                                    className="p-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all hover:text-emerald-500"
                                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                                    title="Mark all read"
                                >
                                    <Check size={16} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2.5 rounded-xl border transition-all hover:text-rose-500"
                                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                            {loading && notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                    <div className="w-10 h-10 border-2 border-t-[var(--primary)] rounded-full animate-spin mb-4" style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--primary)' }} />
                                    <p className="text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--text-muted)' }}>Loading...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                                    <div className="w-20 h-20 rounded-[2.5rem] flex items-center justify-center border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                                        <Bell size={32} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>Empty Inbox</p>
                                        <p className="text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
                                    </div>
                                </div>
                            ) : (
                                notifications.filter(Boolean).map((n) => {
                                    const { icon: Icon, color, bg } = getTypeStyles(n.type || 'INFO');
                                    const isExpanded = expanded.has(n.id);
                                    const isLong = n.message?.length > 120;
                                    return (
                                        <motion.div
                                            layout
                                            key={n.id}
                                            className={cn(
                                                "rounded-2xl p-4 group relative overflow-hidden transition-all border",
                                                !n.isRead
                                                    ? "ring-1 shadow-lg"
                                                    : "opacity-80"
                                            )}
                                            style={{
                                                background: 'var(--bg-elevated)',
                                                borderColor: !n.isRead ? 'var(--primary)' : 'var(--border-subtle)',
                                                boxShadow: !n.isRead ? '0 4px 20px color-mix(in srgb, var(--primary) 10%, transparent)' : undefined,
                                            }}
                                        >
                                            {!n.isRead && (
                                                <div className="absolute top-0 right-0 w-2 h-2 rounded-bl-md" style={{ background: 'var(--primary)' }} />
                                            )}

                                            <div className="flex gap-3">
                                                {/* Icon */}
                                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border", bg, color)}>
                                                    <Icon size={16} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    {/* Title row */}
                                                    <div className="flex justify-between items-start gap-2 mb-2">
                                                        <h4
                                                            className={cn("text-[13px] font-black tracking-tight leading-tight cursor-pointer", n.link ? "hover:underline" : "")}
                                                            style={{ color: !n.isRead ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                                                            onClick={() => n.link ? handleNotificationClick(n) : undefined}
                                                        >
                                                            {n.title}
                                                        </h4>
                                                        <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                                                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                                        </span>
                                                    </div>

                                                    {/* Full message — always readable, with expand if very long */}
                                                    <p
                                                        className={cn("text-[12px] font-medium leading-relaxed mb-3", !isExpanded && isLong ? "line-clamp-4" : "")}
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        {n.message}
                                                    </p>

                                                    {isLong && (
                                                        <button
                                                            onClick={() => toggleExpand(n.id)}
                                                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest mb-3 transition-all"
                                                            style={{ color: 'var(--primary)' }}
                                                        >
                                                            {isExpanded ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> Read full message</>}
                                                        </button>
                                                    )}

                                                    {/* Actions */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex gap-2">
                                                            {!n.isRead && (
                                                                <button
                                                                    onClick={() => markAsRead(n.id)}
                                                                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                                    style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}
                                                                >
                                                                    Mark Read
                                                                </button>
                                                            )}
                                                            {n.link && (
                                                                <button
                                                                    onClick={() => handleNotificationClick(n)}
                                                                    className="p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                                                                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                                                                >
                                                                    <ExternalLink size={11} /> View
                                                                </button>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => deleteNotification(n.id)}
                                                            className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:!bg-rose-500 hover:!text-white"
                                                            style={{ background: 'color-mix(in srgb, var(--error, #ef4444) 8%, transparent)', color: '#ef4444' }}
                                                        >
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

                        {/* Footer */}
                        <div className="p-5 border-t flex-shrink-0 text-center" style={{ borderColor: 'var(--border-subtle)', background: 'color-mix(in srgb, var(--bg-elevated) 60%, transparent)' }}>
                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                {notifications.length} notification{notifications.length !== 1 ? 's' : ''} loaded
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return ReactDOM.createPortal(panel, document.body);
};

export default NotificationInbox;
