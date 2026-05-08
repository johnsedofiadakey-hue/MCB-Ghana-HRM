import { Router } from 'express';
import { pushBiometricLogs } from '../controllers/biometric.controller';

const router = Router();

/**
 * Biometric Device Gateway
 * Secured via Sync Key validation in controller
 */
router.post('/push', pushBiometricLogs);

export default router;
