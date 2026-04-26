import React, { lazy, Suspense, useState, useEffect } from 'react';
import StormglideHome from './pages/StormglideHome';
import { motion } from 'framer-motion';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import DemoPersonaSwitcher from './components/DemoPersonaSwitcher';
import CommandPalette from './components/layout/CommandPalette';
import PageErrorBoundary from './components/layout/PageErrorBoundary';
import ChunkErrorBoundary from './components/common/ChunkErrorBoundary';
import AnnouncementBanner from './components/dashboard/AnnouncementBanner';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AIProvider } from './context/AIContext';
import { useTranslation } from 'react-i18next';
import './i18n';
import { Shield, HelpCircle, Clock } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { cn } from './utils/cn';
import { useAI } from './context/AIContext';
import FirstRunWelcome from './components/layout/FirstRunWelcome';
import CoreGuide from './components/layout/CoreGuide';
import TopHeader from './components/layout/TopHeader';
import MobileNav from './components/layout/MobileNav';
import NexusAIInsight from './components/layout/NexusAIInsight';
import { getLogoUrl } from './utils/logo';
import { getStoredUser, getRankFromRole } from './utils/session';
import SandboxHUD from './components/layout/SandboxHUD';
import { storage, StorageKey } from './services/storage';

import Signup from './pages/Signup';

// Eager-loaded (always needed)
import Login from './pages/Login';

const ForceLogout = () => {
  storage.clearSession();
  sessionStorage.clear();
  // Redirect to login after clearing
  window.location.replace('/');
  return null;
};

// Lazy-loaded for performance
const DashboardRouter = lazy(() => import('./components/layout/DashboardRouter'));
const Leave = lazy(() => import('./pages/Leave'));
const Appraisals = lazy(() => import('./pages/Appraisals'));
const EmployeeManagement = lazy(() => import('./pages/EmployeeManagement'));
const EmployeeHistory = lazy(() => import('./pages/EmployeeHistory'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
const ManagerAppraisals = lazy(() => import('./pages/ManagerAppraisals'));
const AssetManagement = lazy(() => import('./pages/AssetManagement'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const DepartmentManagement = lazy(() => import('./pages/DepartmentManagement'));
const CycleManagement = lazy(() => import('./pages/CycleManagement'));
const Payroll = lazy(() => import('./pages/Payroll'));
const FinanceHub = lazy(() => import('./pages/FinanceHub'));
const AttendanceDashboard = lazy(() => import('./pages/AttendanceDashboard'));
const OrgChart = lazy(() => import('./pages/OrgChart'));
const DeptKpiPage = lazy(() => import('./pages/kpi/DepartmentKPI'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Training = lazy(() => import('./pages/Training'));
const HolidayCalendar = lazy(() => import('./pages/HolidayCalendar'));
const MDKpiView = lazy(() => import('./pages/kpi/MDKpiView'));
const MyTargetsPage = lazy(() => import('./pages/performance/TargetDashboard'));
const AnnouncementsPage = lazy(() => import('./pages/Announcements'));
const Profile = lazy(() => import('./pages/Profile'));
const StrategicGoalBuilder = lazy(() => import('./pages/performance/StrategicGoalBuilder'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const EnterpriseSuite = lazy(() => import('./pages/EnterpriseSuite'));
const ITAdmin = lazy(() => import('./pages/ITAdmin'));
const FinalSignOff = lazy(() => import('./pages/FinalSignOff'));
const AppraisalPacketView = lazy(() => import('./pages/performance/AppraisalPacketView'));
const CalibrationView = lazy(() => import('./pages/performance/CalibrationView'));
const Recruitment = lazy(() => import('./pages/Recruitment'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Support = lazy(() => import('./pages/Support'));
const Offboarding = lazy(() => import('./pages/Offboarding'));
const Disciplinary = lazy(() => import('./pages/Disciplinary'));
const PolicyLibrary = lazy(() => import('./pages/PolicyLibrary'));
const ProbationTracker = lazy(() => import('./pages/ProbationTracker'));
const AttendanceKiosk = lazy(() => import('./pages/AttendanceKiosk'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64 bg-[var(--bg-main)]">
    <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
  </div>
);

const ProtectedRoute = () => {
  const token = storage.getItem(StorageKey.AUTH_TOKEN, null);
  if (!token) return <Navigate to="/" replace />;
  return <Layout />;
};

const AdminGuard = () => {
  const user = getStoredUser();
  const token = storage.getItem(StorageKey.AUTH_TOKEN, null);
  const devToken = storage.getItem(StorageKey.DEV_TOKEN, null);
  const firebaseToken = storage.getItem(StorageKey.DEV_FIREBASE_TOKEN, null);
  const devMode = storage.getItem(StorageKey.DEV_MODE, 'false') === 'true';

  // Allow access if user has standard Dev JWT or Admin Console PIN/Firebase token
  const hasAccess = (user?.role === 'DEV' && !!token) || !!devToken || (firebaseToken && devMode);

  if (!hasAccess) return <Navigate to="/vault" replace />;

  return <Outlet />;
};

const Layout = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { isOpen: isAIOpen, setIsOpen: setIsAIOpen } = useAI();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return storage.getItem(StorageKey.SIDEBAR_COLLAPSED, 'false') === 'true';
  });

  const user = React.useMemo(() => {
    return storage.getItem(StorageKey.USER, null);
  }, []);
  const rank = React.useMemo(() => getRankFromRole(user?.role), [user?.role]);
  const isImpersonating = user?.isImpersonating;

  const handleExitImpersonation = () => {
    storage.removeItem(StorageKey.AUTH_TOKEN);
    storage.removeItem(StorageKey.USER);
    window.location.href = '/';
  };

  useEffect(() => {
    storage.setItem(StorageKey.SIDEBAR_COLLAPSED, String(isCollapsed));
  }, [isCollapsed]);

  const { settings } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--bg-main)] !bg-[var(--bg-main)] text-[var(--text-primary)] font-body selection:bg-[var(--primary)]/30">
      {/* GLOBAL PRINT HEADER (Visible only on print) */}
      <div className="hidden print:block mb-10 border-b-2 border-slate-200 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) && (
              <img src={getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) as string} alt="Logo" className="w-16 h-16 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900">{settings?.companyName || 'OFFICIAL RECORD'}</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{settings?.subtitle}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400">{t('common.official_document', 'Official Document')}</p>
            <p className="text-[9px] font-bold text-slate-300">{t('common.generated_on', 'Generated on')} {new Date().toLocaleDateString(i18n.language)}</p>
          </div>
        </div>
      </div>

      <CommandPalette />
      <CoreGuide isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <FirstRunWelcome />
      {settings?.maintenanceMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-[var(--warning)] text-black py-2 px-4 flex justify-between items-center font-black uppercase tracking-widest text-[10px]">
          <span>{t('common.maintenance_active')}</span>
          <button 
            onClick={() => navigate('/settings')}
            className="bg-[var(--text-primary)] text-[var(--bg-main)] px-4 py-1 rounded-full hover:opacity-90 transition-all font-bold"
          >
            {t('common.deactivate')}
          </button>
        </div>
      )}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black py-2 px-4 flex justify-between items-center font-black uppercase tracking-widest text-[10px]">
          <div className="flex items-center gap-2">
            <Shield size={14} />
            <span>Impersonation Mode Active: Viewing as {user.name} ({user.organizationId})</span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="bg-[var(--text-primary)] text-amber-500 px-4 py-1 rounded-full hover:opacity-90 transition-all font-bold"
          >
            Exit Session
          </button>
        </div>
      )}
      <AnnouncementBanner />
      <div className="flex bg-[var(--bg-main)]">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        <div className={cn(
          "flex-1 flex flex-col min-h-screen transition-[margin] duration-300",
          isCollapsed ? "lg:ml-20" : "lg:ml-[280px]"
        )}>
          <TopHeader 
            onMenuClick={() => setIsSidebarOpen(true)} 
            isCollapsed={isCollapsed} 
          />
          <main className={cn(
            "flex-1 relative p-4 transition-none overflow-x-hidden pt-24",
            "lg:p-10 lg:pt-28", 
            isImpersonating && "mt-12"
          )}>
            <div className="max-w-[1600px] mx-auto pb-24 lg:pb-0">
              <ChunkErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={location.pathname}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      className="w-full"
                    >
                      <Outlet />
                    </motion.div>
                  </AnimatePresence>
                </Suspense>
              </ChunkErrorBoundary>
            </div>

            {/* Help FAB */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsHelpOpen(true)}
              className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-2xl bg-[var(--primary)] text-[var(--text-inverse)] shadow-lg flex items-center justify-center border border-white/10 transition-all"
            >
              <HelpCircle size={24} />
            </motion.button>
          </main>
        </div>
      </div>
      <MobileNav />
      <DemoPersonaSwitcher />
      {rank >= 70 && (
        <NexusAIInsight 
          isOpen={isAIOpen} 
          onClose={() => setIsAIOpen(false)} 
        />
      )}
      <SandboxHUD />
    </div>
  );
};

const RoleGuard = ({ children, minRank }: { children: React.ReactNode; minRank: number }) => {
  const user = getStoredUser();
  const rank = getRankFromRole(user?.role);
  if (rank < minRank) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const SettingsHub = lazy(() => import('./pages/SettingsHub'));
// DynamicFavicon removed - controlled by ThemeContext directly

const AppContent = () => {
  const { settings } = useTheme();
  const { t } = useTranslation();

  const isCentralDomain = window.location.hostname === 'nexus-hr-platform.web.app' || window.location.hostname === 'nexus-hr-platform.firebaseapp.com' || window.location.hostname === 'mcb-hrm-ghana.web.app';

  useEffect(() => {
    // Legacy Token Cleanup: Standardizing on nexus_* prefix
    const legacyKeys = ['app_auth_token', 'app_refresh_token', 'user_session'];
    legacyKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`[Session] Cleaning up legacy key: ${key}`);
        localStorage.removeItem(key);
      }
    });
  }, []);

  useEffect(() => {
    // Dynamic Document Title for White-Labeling
    const baseTitle = settings?.companyName || 'MC Bauchemie Personnel';
    document.title = `${baseTitle} | Personnel Operations`;
  }, [settings?.companyName]);

  // ─── 2-HOUR IDLE TIMER (Enterprise Security Dominion) ─────────────────────
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const IDLE_LIMIT = (2 * 60 * 60 - 60) * 1000; // 1h 59m in ms
  const WARNING_LIMIT = 60 * 1000; // 60s warning

  useEffect(() => {
    const token = storage.getItem(StorageKey.AUTH_TOKEN, null);
    if (!token) return;

    let warningTimer: any;
    let logoutTimer: any;
    let countdownInterval: any;

    const resetTimers = () => {
      setShowTimeoutWarning(false);
      setRemainingSeconds(60);
      if (warningTimer) clearTimeout(warningTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      if (countdownInterval) clearInterval(countdownInterval);

      warningTimer = setTimeout(() => {
        setShowTimeoutWarning(true);
        countdownInterval = setInterval(() => {
          setRemainingSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, IDLE_LIMIT);

      logoutTimer = setTimeout(() => {
        handleGlobalLogout();
      }, IDLE_LIMIT + WARNING_LIMIT);
    };

    // --- DEBOUNCED ACTIVITY SHIELD ---
    let debounceTimer: any;
    const throttledReset = () => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        resetTimers();
        debounceTimer = null;
      }, 2000); // Only re-calc timers every 2 seconds of activity
    };


    const handleGlobalLogout = () => {
      storage.clearSession();
      window.location.replace('/?reason=timeout');
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, throttledReset));
    resetTimers();

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, throttledReset));
      if (warningTimer) clearTimeout(warningTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      if (countdownInterval) clearInterval(countdownInterval);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  return (
    <>
      {/* Favicon controlled by ThemeContext */}

      {/* Session Timeout Warning Overlay */}
      <AnimatePresence>
        {showTimeoutWarning && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--primary)]/30 rounded-[2.5rem] p-10 shadow-2xl text-center relative overflow-hidden"
            >
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]/10">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 60, ease: 'linear' }}
                  className="h-full bg-[var(--primary)]"
                />
              </div>

              <div className="w-20 h-20 bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-2xl flex items-center justify-center text-[var(--warning)] mx-auto mb-6">
                <Shield size={40} />
              </div>
              
              <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">Session Expiring</h2>
              <p className="text-sm text-[var(--text-muted)] font-medium mb-8">
                Your session will terminate in <span className="text-[var(--primary)] font-black">{remainingSeconds}s</span> due to corporate security protocols.
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    // Triggers the activity listener
                    window.dispatchEvent(new Event('mousedown'));
                  }}
                  className="bg-[var(--primary)] text-white w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform"
                >
                  Stay Connected
                </button>
                <button 
                  onClick={() => {
                    localStorage.clear();
                    window.location.href = '/login';
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                >
                  {t('common.force_logout')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PageErrorBoundary>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/force-logout" element={<ForceLogout />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardRouter />} />
            {/* Performance/KPI Module - Strict Routing */}
            <Route path="/kpi/department" element={<RoleGuard minRank={80}><DeptKpiPage /></RoleGuard>} />
            <Route path="/kpi/executive" element={<RoleGuard minRank={80}><MDKpiView /></RoleGuard>} />
            <Route path="/kpi/team" element={<RoleGuard minRank={70}><MyTargetsPage /></RoleGuard>} />
            <Route path="/kpi/my-targets" element={<RoleGuard minRank={10}><MyTargetsPage /></RoleGuard>} />
            
            {/* Appraisal Module - Strict Routing */}
            <Route path="/reviews/my" element={<RoleGuard minRank={10}><Appraisals /></RoleGuard>} />
            <Route path="/reviews/team" element={<RoleGuard minRank={70}><ManagerAppraisals /></RoleGuard>} />
            <Route path="/reviews/packet/:packetId" element={<RoleGuard minRank={10}><AppraisalPacketView /></RoleGuard>} />
            <Route path="/reviews/final" element={<RoleGuard minRank={80}><FinalSignOff /></RoleGuard>} />
            <Route path="/reviews/cycles" element={<RoleGuard minRank={80}><CycleManagement /></RoleGuard>} />

            <Route path="/leave" element={<Leave />} />
            <Route path="/appraisals" element={<Navigate to="/reviews/my" replace />} />
            <Route path="/employees" element={<RoleGuard minRank={70}><EmployeeManagement /></RoleGuard>} />
            <Route path="/employees/history" element={<RoleGuard minRank={70}><EmployeeHistory /></RoleGuard>} />
            <Route path="/employees/:id" element={<EmployeeProfile />} />
            <Route path="/assets" element={<AssetManagement />} />
            <Route path="/audit" element={<RoleGuard minRank={85}><AuditLogs /></RoleGuard>} />
            <Route path="/departments" element={<DepartmentManagement />} />
            <Route path="/settings" element={<RoleGuard minRank={85}><SettingsHub /></RoleGuard>} />
            <Route path="/company-settings" element={<Navigate to="/settings" replace />} />
            <Route path="/performance/strategic" element={<RoleGuard minRank={80}><StrategicGoalBuilder /></RoleGuard>} />
            <Route path="/performance/calibration" element={<RoleGuard minRank={70}><CalibrationView /></RoleGuard>} />
            <Route path="/payroll" element={<RoleGuard minRank={85}><Payroll /></RoleGuard>} />
            <Route path="/finance" element={<FinanceHub />} />
            <Route path="/attendance" element={<AttendanceDashboard />} />
            <Route path="/org-chart" element={<RoleGuard minRank={85}><OrgChart /></RoleGuard>} />
            <Route path="/enterprise" element={<RoleGuard minRank={95}><EnterpriseSuite /></RoleGuard>} />
            <Route path="/it-admin" element={<RoleGuard minRank={85}><ITAdmin /></RoleGuard>} />
            <Route path="/training" element={<Training />} />
            <Route path="/holidays" element={<HolidayCalendar />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/onboarding" element={<RoleGuard minRank={85}><Onboarding /></RoleGuard>} />
            <Route path="/offboarding" element={<RoleGuard minRank={85}><Offboarding /></RoleGuard>} />
            <Route path="/recruitment" element={<RoleGuard minRank={85}><Recruitment /></RoleGuard>} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/support" element={<Support />} />
            {/* New HR Modules */}
            <Route path="/disciplinary" element={<RoleGuard minRank={50}><Disciplinary /></RoleGuard>} />
            <Route path="/policies" element={<PolicyLibrary />} />
            <Route path="/probation" element={<RoleGuard minRank={70}><ProbationTracker /></RoleGuard>} />
            <Route path="/kiosk" element={<AttendanceKiosk />} />
          </Route>


          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </PageErrorBoundary>
    </>
  );
};

export default function App() {
  // BUILD_ID: 2026-04-10_18:18Z - FORCE_IDENTITY_SYNC
  return (
    <PageErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AIProvider>
            <AppContent />
          </AIProvider>
        </BrowserRouter>
      </ThemeProvider>
    </PageErrorBoundary>
  );
}

