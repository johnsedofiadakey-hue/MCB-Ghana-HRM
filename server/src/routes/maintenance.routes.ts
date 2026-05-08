import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import * as maintenanceController from '../controllers/maintenance.controller';

const router = Router();

// Only Super Admin or maybe MD can trigger backups? 
// User said "automatic back up... quick fix".
// Let's allow MD and SUPER_ADMIN.
router.post('/backup', authenticate, requireRole(90), maintenanceController.triggerBackup);
router.get('/health', authenticate, requireRole(90), maintenanceController.checkHealth);
router.get('/backups', authenticate, requireRole(90), maintenanceController.getBackups);
router.get('/backups/:filename', authenticate, requireRole(90), maintenanceController.downloadBackup);

export default router;
