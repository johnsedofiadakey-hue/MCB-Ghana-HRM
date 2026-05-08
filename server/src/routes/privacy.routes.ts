import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import { exportMyData, anonymiseEmployee, getDataRetentionReport } from '../controllers/privacy.controller';

const router = Router();
router.use(authenticate);

// Any employee can export their own data
router.get('/my-data-export', exportMyData);

// Admin only
router.post('/anonymise/:employeeId', requireRole(80), anonymiseEmployee);
router.get('/retention-report', requireRole(80), getDataRetentionReport);

export default router;
