import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { getStoredUser, getRoleRankValue } from '../../utils/session';

const MDDashboard       = lazy(() => import('../../pages/dashboards/MDDashboard'));
const DirectorDashboard = lazy(() => import('../../pages/dashboards/DirectorDashboard'));
const ManagerDashboard  = lazy(() => import('../../pages/dashboards/ManagerDashboard'));
const MidManagerDashboard = lazy(() => import('../../pages/dashboards/MidManagerDashboard'));
const EmployeeDashboard = lazy(() => import('../../pages/dashboards/EmployeeDashboard'));
const CasualDashboard   = lazy(() => import('../../pages/dashboards/CasualDashboard'));

const Spinner = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent"
    />
  </div>
);

const DashboardRouter: React.FC = () => {
  const user = getStoredUser();
  const rank = getRoleRankValue(user.role) || user.rank || 0;
  const normalizedRole = (user.role || '').toUpperCase().trim();

  const renderDashboard = () => {
    if (rank >= 95) return <MDDashboard />;
    if (rank >= 90) return <DirectorDashboard />;
    if (rank >= 70) return <ManagerDashboard />;
    if (rank >= 60) return <MidManagerDashboard />;
    if (rank >= 50) return <EmployeeDashboard />;
    if (user.id && normalizedRole !== 'CASUAL' && normalizedRole !== 'CASUAL WORKER') return <EmployeeDashboard />;
    return <CasualDashboard />;
  };

  return (
    <Suspense fallback={<Spinner />}>
      {renderDashboard()}
    </Suspense>
  );
};

export default DashboardRouter;
