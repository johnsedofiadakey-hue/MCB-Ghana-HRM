import { Router } from 'express';
import { authenticate, requireSpecificRole, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '../types/permissions';
import { itCreateEmployee, itResetPassword, itSystemOverview, itGetUsers, itDeactivateUser, itCleanupLogs, getLiveLogs, getSecurityThreats } from '../controllers/itadmin.controller';
import { validateHierarchy } from '../controllers/hierarchy.controller';

const router = Router();
router.use(authenticate);

// System overview — Director+ can view
router.get('/overview', requireSpecificRole(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), itSystemOverview);
router.get('/live-logs', requireSpecificRole(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), getLiveLogs);
router.get('/security-threats', requireSpecificRole(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), getSecurityThreats);

// User management — IT Admin+ (Rank 85+) can manage accounts
router.get('/users', requirePermission(Permission.ACCOUNT_PROVISION), itGetUsers);
router.post('/users', itCreateEmployee);
router.post('/users/:userId/reset-password', requirePermission(Permission.ACCOUNT_PROVISION), itResetPassword);
router.patch('/users/:userId/deactivate', requirePermission(Permission.ACCOUNT_PROVISION), itDeactivateUser);

// Maintenance — MD only
router.post('/maintenance/cleanup-logs', requireSpecificRole(['IT_MANAGER', 'MD', 'DEV']), itCleanupLogs);

// Hierarchy validation — any authenticated user
router.post('/hierarchy/validate', validateHierarchy);

export default router;
