import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Bell, Search, Menu, Inbox as InboxIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStoredUser } from '../../utils/session';
import { useTranslation } from 'react-i18next';
import NotificationInbox from '../common/NotificationInbox';
import ActionInbox from '../common/ActionInbox';

import { getLogoUrl } from '../../utils/logo';
import { getSafeAvatarUrl } from '../../utils/avatar';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

import { useAI } from '../../context/AIContext';

interface TopHeaderProps {
    onMenuClick: () => void;
    isCollapsed?: boolean;
}

const TopHeader = ({ onMenuClick, isCollapsed = false }: TopHeaderProps) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { settings } = useTheme();
    const { setIsOpen: setIsAIOpen, isEnabled: isAIEnabled } = useAI();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isInboxOpen, setIsInboxOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const user = getStoredUser();

    useEffect(() => {
        api.get('/notifications/unread-count')
            .then(r => setUnreadCount(r.data?.count || 0))
            .catch(() => {});
    }, []);

    const handleLogout = () => {
        // Clear MCB HRM Ghana session tokens
        localStorage.removeItem('mcb_auth_token');
        localStorage.removeItem('mcb_refresh_token');
        localStorage.removeItem('mcb_user');
        
        // Clear legacy tokens to prevent ghost sessions
        localStorage.removeItem('app_auth_token');
        localStorage.removeItem('app_refresh_token');
        localStorage.removeItem('user_session');
        
        navigate('/');
    };

    return (
        <header 
            className={`fixed top-0 left-0 right-0 h-20 sm:h-24 z-40 flex items-center justify-between px-4 sm:px-8 lg:px-12 border-b border-[var(--border-subtle)] transition-[left] duration-300 ease-in-out ${isCollapsed ? 'lg:left-20' : 'lg:left-[280px]'}`}
            style={{ 
                background: 'var(--bg-card)',
            }}
        >
            {/* Search Bar / Mobile Menu Toggle */}
            <div className="flex items-center gap-3 sm:gap-6 flex-1">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all"
                >
                    <Menu size={20} />
                </button>

                {/* Mobile Branding Logo */}
                {(settings?.logoUrl || settings?.companyLogoUrl) && (
                    <div className="lg:hidden w-10 h-10 rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] flex-shrink-0">
                        <img 
                            src={getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) as string} 
                            key={settings?.logoUrl || settings?.companyLogoUrl}
                            alt="Logo" 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                )}

                <div className="hidden md:flex items-center gap-3 px-5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus-within:border-[var(--primary)] focus-within:bg-[var(--bg-card)] focus-within:shadow-[0_4px_12px_rgba(0,0,0,0.02)] w-full max-w-[320px] transition-all group">
                    <Search size={16} className="text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        className="bg-transparent border-none outline-none text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-full font-medium"
                    />
                </div>
            </div>

            {/* Identity & Actions */}
            <div className="flex items-center gap-3 sm:gap-6 lg:gap-10">
                {/* MCB AI Intelligence Trigger */}
                {isAIEnabled && (user?.rank || 0) >= 70 && (
                    <button 
                        onClick={() => setIsAIOpen(true)}
                         className={cn(
                           "group relative p-2 sm:px-4 rounded-xl border transition-all flex items-center gap-2 overflow-hidden",
                           (user.rank || 0) >= 85 
                             ? "text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/25 ring-2 ring-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]" 
                             : "text-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 border-[var(--primary)]/20 hover:border-[var(--primary)]/40"
                         )}
                         title={(user.rank || 0) >= 85 ? "Management Insights Active" : "AI Helper Active"}
                     >
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                         <Sparkles size={18} className={cn("shrink-0", (user.rank || 0) >= 85 ? "animate-pulse scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "")} />
                         <div className="flex flex-col items-start leading-none hidden sm:flex">
                           <span className="text-[10px] font-black uppercase tracking-tighter">AI Assistant</span>
                           <span className={cn("text-[7px] font-bold uppercase tracking-widest opacity-80", (user.rank || 0) >= 85 ? "text-amber-500/80" : "text-[var(--primary)]")}>
                             {(user.rank || 0) >= 85 ? "Management" : "Personal"}
                           </span>
                         </div>
                         <span className={cn(
                           "absolute top-1 right-1 w-2 h-2 rounded-full",
                           (user.rank || 0) >= 85 ? "bg-amber-500 animate-ping" : "bg-[var(--primary)]"
                         )} />
                    </button>
                )}

                {/* Tasks / Actions */}
                <button 
                    onClick={() => setIsInboxOpen(true)}
                    className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--bg-elevated)] rounded-full transition-all"
                >
                    <InboxIcon size={20} />
                    {taskCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[var(--accent)] text-[var(--text-inverse)] text-[9px] font-black flex items-center justify-center rounded-full border-2 border-[var(--bg-main)] shadow-[0_0_10px_var(--accent)]">
                            {taskCount > 9 ? '9+' : taskCount}
                        </span>
                    )}
                </button>

                {/* Notifications */}
                <button 
                    onClick={() => setIsNotificationOpen(true)}
                    className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--bg-elevated)] rounded-full transition-all"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[var(--primary)] text-[var(--text-inverse)] text-[9px] font-black flex items-center justify-center rounded-full border-2 border-[var(--bg-main)] shadow-[0_0_10px_var(--primary)]">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                <NotificationInbox 
                    isOpen={isNotificationOpen} 
                    onClose={() => setIsNotificationOpen(false)} 
                    onUnreadUpdate={setUnreadCount} 
                />

                <ActionInbox 
                    isOpen={isInboxOpen}
                    onClose={() => setIsInboxOpen(false)}
                    onCountUpdate={setTaskCount}
                />

                {/* User Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-4 py-2 pl-2 pr-1 rounded-full transition-all text-left group"
                    >
                        <div className="hidden md:block text-right">
                            <p className="text-[13px] font-bold text-[var(--text-primary)] leading-none mb-1 group-hover:text-[var(--primary)] transition-colors">
                                {user?.name || 'User Profile'}
                            </p>
                            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                {(user as any)?.jobTitle || user?.role?.replace('_',' ') || 'Staff'}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] overflow-hidden flex items-center justify-center text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-sm group-hover:border-[var(--primary)] transition-all">
                            <img 
                                src={getSafeAvatarUrl(user?.avatar, user?.name)} 
                                alt={user?.name} 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = getSafeAvatarUrl(undefined, user?.name);
                                }}
                            />
                        </div>
                    </button>

                    <AnimatePresence>
                        {isDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-0" onClick={() => setIsDropdownOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                                    className="absolute right-0 mt-3 w-60 nx-card p-2.5 z-50 origin-top-right border-[var(--border-subtle)] shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
                                >
                                    <button
                                        onClick={() => { navigate('/profile'); setIsDropdownOpen(false); }}
                                        className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                                    >
                                        <User size={16} className="opacity-60" />
                                        <span className="text-[13px] font-medium tracking-tight">{t('common.profile')}</span>
                                    </button>
                                    <button
                                        onClick={() => { navigate('/settings'); setIsDropdownOpen(false); }}
                                        className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                                    >
                                        <Settings size={16} className="opacity-60" />
                                        <span className="text-[13px] font-medium tracking-tight">{t('common.settings')}</span>
                                    </button>
                                    <div className="h-[1px] bg-[var(--border-subtle)] my-2 opacity-50" />
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-all font-bold"
                                    >
                                        <LogOut size={16} />
                                        <span className="text-[13px] tracking-tight">{t('common.logout')}</span>
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
};

export default TopHeader;
