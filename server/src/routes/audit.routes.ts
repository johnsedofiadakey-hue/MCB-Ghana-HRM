import { Router } from 'express';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';
import * as auditController from '../controllers/audit.controller';

const router = Router();

// Only MD can view audit logs
router.get('/', authenticate, requireSpecificRole(['IT_MANAGER', 'MD', 'DEV']), auditController.getLogs);
router.get('/logs', authenticate, requireSpecificRole(['IT_MANAGER', 'MD', 'DEV']), auditController.getLogs);
router.get('/export', authenticate, requireSpecificRole(['IT_MANAGER', 'MD', 'DEV']), auditController.exportLogsCSV);

export default router;
