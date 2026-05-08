import { Router } from 'express';
import { authenticate, requireRole, authorizeMinimumRole } from '../middleware/auth.middleware';
import * as auditController from '../controllers/audit.controller';

const router = Router();

// Only MD can view audit logs
router.get('/', authenticate, requireRole(90), auditController.getLogs);
router.get('/logs', authenticate, requireRole(90), auditController.getLogs); // client calls /logs
router.get('/export', authenticate, requireRole(90), auditController.exportLogsCSV); // Compliance Export

export default router;
