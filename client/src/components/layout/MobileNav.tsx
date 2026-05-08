import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, Calendar, Inbox, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';
import { getStoredUser, getRoleRankValue } from '../../utils/session';

const MobileNav = () => {
    const { t } = useTranslation();
    const location = useLocation();

    const user = getStoredUser();
    const rank = getRoleRankValue(user?.role);

    const navItems = [
        { icon: LayoutDashboard, label: t('common.dashboard_label'), path: '/dashboard' },
        { icon: Inbox, label: t('common.inbox_label'), path: '/inbox' },
        { icon: Calendar, label: t('common.leave_label'), path: '/leave' },
        { icon: Clock, label: t('common.attendance_label'), path: '/attendance' },
        ...(rank >= 70 
            ? [{ icon: Users, label: t('common.employees_label'), path: '/employees' }]
            : [{ icon: User, label: t('common.profile_label'), path: '/profile' }]
        )
    ];

    return (
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-[60] safe-area-bottom">
            <div className="flex items-center justify-between h-[76px] px-1 bg-[var(--bg-card)]/90 backdrop-blur-2xl border border-[var(--border-subtle)] rounded-[2rem] shadow-2xl shadow-black/20">
                {navItems.map((item, i) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <NavLink
                            key={i}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 relative min-w-0 px-1",
                                isActive ? "text-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--primary)]/70"
                            )}
                        >
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div 
                                        layoutId="mobile-nav-pill"
                                        className="absolute top-0 w-8 h-1 bg-[var(--primary)] rounded-full shadow-[0_0_12px_var(--primary)]"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </AnimatePresence>
                            
                            <div className={cn(
                                "mb-1 transition-all duration-300",
                                isActive ? "scale-110 translate-y-[-2px]" : "scale-100 opacity-60"
                            )}>
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            
                            <span className={cn(
                                "text-[7px] xs:text-[8px] font-black uppercase tracking-wider transition-all text-center leading-none truncate w-full px-0.5",
                                isActive ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
                            )}>
                                {item.label}
                            </span>
                        </NavLink>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileNav;
