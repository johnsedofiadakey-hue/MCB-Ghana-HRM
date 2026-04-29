import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as settingsController from '../controllers/settings.controller';
import { PurgeService } from '../services/purge.service';

const router = Router();

// Public — branding loads on login page before auth
router.get('/', settingsController.getSettings);
router.get('/organization', settingsController.getSettings);

// Admin Only Update
router.put('/', authenticate, requireRole(85), settingsController.updateSettings);
router.patch('/organization', authenticate, requireRole(85), settingsController.updateSettings);
router.put('/organization', authenticate, requireRole(85), settingsController.updateSettings);

// DANGER: Purge all transactional data (MD/DEV only — production onboarding)
router.post('/purge-data', authenticate, requireRole(95), async (req: any, res: any) => {
  const { pin } = req.body;
  
  if (pin !== '5646') {
    return res.status(403).json({ error: 'Security PIN verification failed. Access denied.' });
  }

  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const result = await PurgeService.purgeTransactionalData(organizationId);
    res.json({ success: true, message: 'All transactional data has been permanently wiped.', ...result });
  } catch (err: any) {
    console.error('[PURGE] Error:', err);
    res.status(500).json({ error: err.message || 'Purge failed' });
  }
});

export default router;
