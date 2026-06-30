import { Router } from 'express';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';
import * as maintenanceController from '../controllers/maintenance.controller';

const router = Router();

// Only Super Admin or maybe MD can trigger backups? 
// User said "automatic back up... quick fix".
// Let's allow MD and SUPER_ADMIN.
router.post('/backup', authenticate, requireSpecificRole(['IT_MANAGER', 'MD', 'DEV']), maintenanceController.triggerBackup);
router.get('/health', authenticate, requireSpecificRole(['IT_MANAGER', 'MD', 'DEV']), maintenanceController.checkHealth);
router.get('/backups', authenticate, requireSpecificRole(['IT_MANAGER', 'MD', 'DEV']), maintenanceController.getBackups);
router.get('/backups/:filename', authenticate, requireSpecificRole(['IT_MANAGER', 'MD', 'DEV']), maintenanceController.downloadBackup);

export default router;
