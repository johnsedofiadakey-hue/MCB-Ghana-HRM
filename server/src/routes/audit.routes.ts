import { Router } from 'express';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';
import * as auditController from '../controllers/audit.controller';

const router = Router();

const AUDIT_ROLES = ['IT_MANAGER', 'IT_ADMIN', 'MD', 'HR_DIRECTOR', 'DEV'];

router.get('/', authenticate, requireSpecificRole(AUDIT_ROLES), auditController.getLogs);
router.get('/logs', authenticate, requireSpecificRole(AUDIT_ROLES), auditController.getLogs);
router.get('/export', authenticate, requireSpecificRole(AUDIT_ROLES), auditController.exportLogsCSV);
router.get('/users', authenticate, requireSpecificRole(AUDIT_ROLES), auditController.getAuditUsers);

export default router;
