import { NavLink, useNavigate } from 'react-router-dom';
import { storage } from '../../services/storage';
import {
  LayoutDashboard, Users, Calendar, ClipboardCheck,
  Settings, Building2, LogOut,
  DollarSign, Target, Package, Zap,
  ShieldAlert, BarChart3, ShieldCheck,
  Clock, Wallet, GraduationCap,
  ClipboardList, PanelLeftClose, PanelLeftOpen,
  X, Briefcase, Network, Megaphone, BookOpen, AlertOctagon,
  Shield, AlertTriangle, History, Database
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import api from '../../services/api';
import { useState, useEffect } from 'react';
import { getLogoUrl } from '../../utils/logo';
import { getStoredUser, getRankFromRole } from '../../utils/session';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  isCollapsed?: boolean;
}

const NavGroup = ({ label, children, isCollapsed }: { label: string; children: React.ReactNode; isCollapsed?: boolean }) => (
  <div className="mb-8 px-4">
    {!isCollapsed && (
      <p className="px-5 mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-50">
        {label}
      </p>
    )}
    <div className="space-y-1.5">
      {children}
    </div>
  </div>
);

const NavItem = ({ to, icon: Icon, label, badge, isCollapsed }: NavItemProps) => (
  <NavLink
    to={to}
    className={({ isActive }) => cn(
      "flex items-center rounded-xl transition-all duration-200 group relative",
      isCollapsed ? "justify-center p-3.5 mx-auto w-12 h-12" : "px-5 py-3 mx-3 h-12",
        isActive
        ? "bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar-active)] font-semibold shadow-sm"
        : "text-[var(--text-sidebar)] hover:text-[var(--text-sidebar-active)] hover:bg-[var(--bg-sidebar-active)]/50"
    )}
  >
    {({ isActive }) => (
      <div className="flex items-center gap-3 w-full">
        <Icon 
          size={isCollapsed ? 22 : 20} 
          className={cn(
            "transition-all duration-300",
            isActive ? "text-[var(--primary)]" : "opacity-60 group-hover:opacity-100 group-hover:scale-110"
          )} 
        />
        {!isCollapsed && (
          <span className="text-[13px] tracking-tight truncate">{label}</span>
        )}
        {badge !== undefined && !isCollapsed && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-[var(--primary)] text-[var(--text-inverse)] text-[9px] font-black shadow-sm ring-1 ring-white/10">
            {badge}
          </span>
        )}
        
        {isCollapsed && (
          <div className="absolute left-16 px-3 py-2 bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] text-[var(--text-sidebar-active)] text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-2xl">
            {label}
          </div>
        )}
      </div>
    )}
  </NavLink>
);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (c: boolean) => void;
}

const Sidebar = ({ isOpen, onClose, isCollapsed, setIsCollapsed }: SidebarProps) => {
  const navigate = useNavigate();
  const { settings, refreshSettings } = useTheme();
  
  // BUG 5 FIX: Logo missing, attempting hydration sync with 3s retry
  useEffect(() => {
    if (!settings?.logoUrl && !settings?.companyLogoUrl) {
      const timer = setTimeout(() => {
        console.log('[Sidebar] Logo missing, attempting hydration sync...');
        refreshSettings();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [settings?.logoUrl, settings?.companyLogoUrl, refreshSettings]);

  const { t } = useTranslation();
  const user = getStoredUser();
  const rank = getRankFromRole(user.role);
  const role = (user.role || '').toUpperCase();
  
  const isHR = role.includes('HR') || rank >= 95;
  const isFinance = role.includes('FINANCE') || rank >= 95;
  const isIT = role.includes('IT') || rank >= 95;
  const isMD = rank >= 95;
  
  const [pendingAppraisals, setPendingAppraisals] = useState(0);

  const getInitials = (name?: string) => {
    if (!name) return settings?.companyName ? settings.companyName.slice(0, 2).toUpperCase() : 'HQ';
    try {
      return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
    } catch (e) {
      return 'HQ';
    }
  };

  useEffect(() => {
    const token = storage.getItem('mcb_auth_token', null);
    if (!token || rank < 60) return;
    
    if (rank >= 70) {
      api.get('/appraisals/team-packets').then(r => {
        const arr = Array.isArray(r.data) ? r.data : [];
        setPendingAppraisals(arr.filter((p: any) => p.status === 'OPEN').length);
      }).catch(() => {});
    }
  }, [rank]);

  const handleLogout = () => {
    storage.clearSession();
    navigate('/');
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[var(--bg-main)]/80 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className={cn(
          "fixed left-0 top-0 h-full flex flex-col z-[70] transition-transform duration-300 lg:translate-x-0 overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ 
          backgroundColor: 'var(--bg-sidebar)',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Toggle / Header */}
        <div className="flex items-center justify-between h-24 px-6 flex-shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-4 overflow-hidden ml-1">
              <div className="w-11 h-11 rounded-xl bg-[var(--bg-card)] flex items-center justify-center flex-shrink-0 border border-[var(--border-subtle)] relative group overflow-hidden shadow-sm">
                {getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) ? (
                  <img src={getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) as string} key={settings?.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-sm font-black text-[var(--text-inverse)] relative z-10 tracking-widest uppercase">
                    {getInitials(settings?.companyName || 'OFFICE')}
                  </span>
                )}
              </div>
              <div className="truncate">
                <h1 className="text-[14px] font-bold tracking-tight text-[var(--text-primary)] leading-none">
                  {settings?.companyName || 'MCB HRM GHANA'}
                </h1>
                <p className="text-[10px] font-medium text-[var(--text-sidebar)] mt-1.5 opacity-60 tracking-wide uppercase italic">
                  {settings?.subtitle || 'Enterprise OS'}
                </p>
              </div>
            </div>
          )}
          {isCollapsed && (
             <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] flex items-center justify-center mx-auto border border-[var(--border-subtle)] relative group overflow-hidden shadow-sm">
                {getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) ? (
                  <img src={getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) as string} key={settings?.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-sm font-black text-[var(--text-inverse)] relative z-10 tracking-widest uppercase">
                    {getInitials(settings?.companyName || 'OFFICE')}
                  </span>
                )}
             </div>
          )}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 rounded-lg text-[var(--text-sidebar)] hover:text-[var(--text-sidebar-active)] transition-colors"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          
          <button onClick={onClose} className="lg:hidden p-2 text-[var(--text-sidebar)] hover:text-[var(--text-sidebar-active)] rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-8 overflow-y-auto custom-scrollbar overflow-x-hidden">
            <>
              <NavGroup label={t('common.personal')} isCollapsed={isCollapsed}>
                <NavItem to="/dashboard" icon={LayoutDashboard} label={t('common.dashboard_label')} isCollapsed={isCollapsed} />
                <NavItem to="/inbox" icon={Megaphone} label={t('common.inbox_label')} isCollapsed={isCollapsed} />
                <NavItem to="/profile" icon={Users} label={t('common.profile_label')} isCollapsed={isCollapsed} />
                <NavItem to="/attendance" icon={Clock} label={t('common.attendance_label')} isCollapsed={isCollapsed} />
                <NavItem to="/leave" icon={Calendar} label={t('common.leave_label')} isCollapsed={isCollapsed} />
                <NavItem to="/finance" icon={Wallet} label={t('common.finance_label')} isCollapsed={isCollapsed} />
              </NavGroup>

              <NavGroup label={t('common.performance_label')} isCollapsed={isCollapsed}>
                <NavItem to="/kpi/my-targets" icon={Target} label={t('common.my_targets')} isCollapsed={isCollapsed} />
                {rank >= 80 && (
                  <NavItem to="/kpi/department" icon={Building2} label={t('common.departmental_goals')} isCollapsed={isCollapsed} />
                )}
                {rank >= 70 && (
                  <NavItem to="/kpi/team" icon={Users} label={t('common.team_targets')} isCollapsed={isCollapsed} />
                )}
                <NavItem to="/reviews/my" icon={BarChart3} label={t('common.my_appraisals')} isCollapsed={isCollapsed} />
                {rank >= 70 && (
                  <>
                    <NavItem to="/reviews/team" icon={ClipboardCheck} label={t('common.team_appraisals')} badge={pendingAppraisals || undefined} isCollapsed={isCollapsed} />
                    <NavItem to="/performance/calibration" icon={Zap} label={t('common.calibration')} isCollapsed={isCollapsed} />
                  </>
                )}
                {rank >= 80 && (
                  <>
                    <NavItem to="/reviews/final" icon={ShieldAlert} label={t('common.executive_sign_off')} isCollapsed={isCollapsed} />
                    <NavItem to="/reviews/cycles" icon={ClipboardList} label={t('common.appraisal_cycles')} isCollapsed={isCollapsed} />
                  </>
                )}
              </NavGroup>

                 <NavGroup label={t('common.organization')} isCollapsed={isCollapsed}>
                <NavItem to="/departments" icon={Briefcase} label={rank < 70 ? t('common.my_department') : t('common.departments_label')} isCollapsed={isCollapsed} />
                {(rank >= 70 || isHR) && <NavItem to="/employees" icon={Users} label={t('common.employees_label')} isCollapsed={isCollapsed} />}
                <NavItem to="/announcements" icon={Megaphone} label={t('common.announcements')} isCollapsed={isCollapsed} />
                {(rank >= 85 || isHR) && <NavItem to="/org-chart" icon={Network} label={t('common.org_chart_label')} isCollapsed={isCollapsed} />}
                {(rank >= 85 || isHR) && !isMD && <NavItem to="/recruitment" icon={Briefcase} label={t('common.recruitment')} isCollapsed={isCollapsed} />}
                <NavItem to="/policies" icon={Shield} label={t('common.policies')} isCollapsed={isCollapsed} />
                {(rank >= 60 || isHR) && <NavItem to="/disciplinary" icon={AlertTriangle} label={t('common.disciplinary')} isCollapsed={isCollapsed} />}
                {(rank >= 70 || isHR) && <NavItem to="/probation" icon={History} label={t('common.probation')} isCollapsed={isCollapsed} />}
              </NavGroup>
 
              <NavGroup label={t('common.operations')} isCollapsed={isCollapsed}>
                {(rank >= 60 || isIT || isHR) && <NavItem to="/assets" icon={Package} label={t('common.assets_label')} isCollapsed={isCollapsed} />}
                {(isIT || isHR) && !isMD && (
                   <NavItem to="/it-registries" icon={Database} label={t('common.it_registries')} isCollapsed={isCollapsed} />
                )}
                <NavItem to="/support" icon={Briefcase} label={t('common.support')} isCollapsed={isCollapsed} />
                <NavItem to="/training" icon={GraduationCap} label={t('common.training_label')} isCollapsed={isCollapsed} />
                <NavItem to="/holidays" icon={Calendar} label={t('common.holidays_label')} isCollapsed={isCollapsed} />
                {(rank >= 85 || isHR) && !isMD && (
                  <>
                    <NavItem to="/onboarding" icon={ClipboardList} label={t('common.onboarding_label')} isCollapsed={isCollapsed} />
                    <NavItem to="/offboarding" icon={LogOut} label={t('common.offboarding')} isCollapsed={isCollapsed} />
                  </>
                )}
              </NavGroup>

              {(isFinance || isHR || isMD) && (
                <NavGroup label={t('common.financial_operations')} isCollapsed={isCollapsed}>
                  <NavItem to="/payroll" icon={DollarSign} label={t('common.payroll_label')} isCollapsed={isCollapsed} />
                  <NavItem to="/expenses" icon={Wallet} label={t('common.expenses')} isCollapsed={isCollapsed} />
                </NavGroup>
              )}

              {(isHR || isMD || isIT) && (
                <NavGroup label={t('common.administration')} isCollapsed={isCollapsed}>
                  <NavItem to="/settings" icon={Settings} label={t('common.admin_settings')} isCollapsed={isCollapsed} />
                  {isMD && (
                    <NavItem to="/enterprise" icon={Zap} label={t('common.enterprise_suite_label')} isCollapsed={isCollapsed} />
                  )}
                </NavGroup>
              )}
            </>
        </nav>

        {/* Footer */}
        <div className="p-6">
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center rounded-xl text-[var(--text-sidebar)] hover:text-[var(--text-sidebar-active)] hover:bg-[var(--bg-sidebar-active)]/50 transition-all group",
              isCollapsed ? "justify-center p-3.5" : "px-5 py-3.5 gap-3"
            )}
          >
            <LogOut size={18} className="opacity-60 group-hover:opacity-100 transition-opacity" />
            {!isCollapsed && <span className="text-[13px] font-medium">{t('common.logout')}</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
