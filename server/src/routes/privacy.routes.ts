import { Router } from 'express';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';
import { exportMyData, anonymiseEmployee, getDataRetentionReport } from '../controllers/privacy.controller';

const router = Router();
router.use(authenticate);

// Any employee can export their own data
router.get('/my-data-export', exportMyData);

// Admin only
router.post('/anonymise/:employeeId', requireSpecificRole(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), anonymiseEmployee);
router.get('/retention-report', requireSpecificRole(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), getDataRetentionReport);

export default router;
