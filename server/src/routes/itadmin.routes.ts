import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { itCreateEmployee, itResetPassword, itSystemOverview, itGetUsers, itDeactivateUser, itCleanupLogs, getLiveLogs, getSecurityThreats } from '../controllers/itadmin.controller';
import { validateHierarchy } from '../controllers/hierarchy.controller';

const router = Router();
router.use(authenticate);

// System overview — Director+ can view
router.get('/overview', requireRole(80), itSystemOverview);
router.get('/live-logs', requireRole(85), getLiveLogs);
router.get('/security-threats', requireRole(85), getSecurityThreats);

// User management — IT Admin+ (Rank 85+) can manage accounts
router.get('/users', requireRole(85), itGetUsers);
router.post('/users', requireRole(85), itCreateEmployee);
router.post('/users/:userId/reset-password', requireRole(85), itResetPassword);
router.patch('/users/:userId/deactivate', requireRole(85), itDeactivateUser);

// Maintenance — MD only
router.post('/maintenance/cleanup-logs', requireRole(90), itCleanupLogs);

// Hierarchy validation — any authenticated user
router.post('/hierarchy/validate', validateHierarchy);

export default router;
