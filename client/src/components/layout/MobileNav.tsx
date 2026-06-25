import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, Calendar, Inbox, User } from 'lucide-react';
import { getStoredUser, getRoleRankValue } from '../../utils/session';
import { motion } from 'framer-motion';

const SPRING = { type: 'spring', stiffness: 480, damping: 38 } as const;
const LABEL_SPRING = { type: 'spring', stiffness: 480, damping: 38, delay: 0.04 } as const;

const MobileNav = () => {
    const location = useLocation();
    const user = getStoredUser();
    const rank = getRoleRankValue(user?.role);

    const navItems = [
        { icon: LayoutDashboard, label: 'Home',    path: '/dashboard',  accent: false },
        { icon: Inbox,           label: 'Inbox',   path: '/inbox',      accent: true  },
        { icon: Calendar,        label: 'Leave',   path: '/leave',      accent: false },
        { icon: Clock,           label: 'Clock',   path: '/attendance', accent: false },
        ...(rank >= 70
            ? [{ icon: Users, label: 'People',  path: '/employees', accent: false }]
            : [{ icon: User, label: 'Profile',  path: '/profile',   accent: false }]
        ),
    ];

    return (
        <nav
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[60]"
            style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                backgroundColor: 'color-mix(in srgb, var(--bg-card) 88%, transparent)',
            }}
        >
            <div className="flex items-center h-16 px-2 gap-1">
                {navItems.map((item) => {
                    const isActive =
                        location.pathname === item.path ||
                        (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                    const pillColor = item.accent ? 'var(--accent)' : 'var(--primary)';

                    return (
                        <motion.div
                            key={item.path}
                            layout
                            transition={SPRING}
                            className="min-w-0 flex items-center justify-center"
                            style={{ flex: isActive ? '2 0 0' : '1 0 0', height: '100%' }}
                        >
                            <NavLink
                                to={item.path}
                                className="flex items-center justify-center w-full h-12 select-none"
                                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                            >
                                {isActive ? (
                                    <motion.div
                                        className="flex items-center justify-center gap-2 px-3 h-10 rounded-2xl w-full overflow-hidden"
                                        style={{ background: pillColor }}
                                        initial={{ opacity: 0.5, scale: 0.88 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={SPRING}
                                    >
                                        <item.icon
                                            size={18}
                                            strokeWidth={2.5}
                                            className="text-white flex-shrink-0"
                                        />
                                        <motion.span
                                            className="text-[11px] font-black text-white uppercase tracking-wide whitespace-nowrap"
                                            initial={{ opacity: 0, x: -6 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={LABEL_SPRING}
                                        >
                                            {item.label}
                                        </motion.span>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        className="flex items-center justify-center w-11 h-10 rounded-2xl"
                                        whileTap={{ scale: 0.72 }}
                                        transition={SPRING}
                                    >
                                        <item.icon
                                            size={20}
                                            strokeWidth={1.8}
                                            className="text-[var(--text-muted)]"
                                        />
                                    </motion.div>
                                )}
                            </NavLink>
                        </motion.div>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileNav;
