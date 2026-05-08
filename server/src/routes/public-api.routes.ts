import { Router } from 'express';
import { apiAuthMiddleware } from '../middleware/apiAuth.middleware';
import { 
    getEmployees, getAttendance, getPayroll, getAppraisals, getTargets
} from '../controllers/public-api.controller';

const router = Router();

// Secure all public API routes with API Key auth
router.use(apiAuthMiddleware);

router.get('/employees', getEmployees);
router.get('/attendance', getAttendance);
router.get('/payroll', getPayroll);
router.get('/appraisals', getAppraisals);
router.get('/targets', getTargets);

export default router;
