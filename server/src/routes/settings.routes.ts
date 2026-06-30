import { Router } from 'express';
import crypto from 'crypto';
import { authenticate, requireRole, requireSpecificRole } from '../middleware/auth.middleware';
import * as settingsController from '../controllers/settings.controller';
import { PurgeService } from '../services/purge.service';
import prisma from '../prisma/client';

const router = Router();

// Public — branding loads on login page before auth
router.get('/', settingsController.getSettings);
router.get('/organization', settingsController.getSettings);
router.get('/admin', authenticate, requireSpecificRole(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), settingsController.getSettings);

// Admin Only Update
router.put('/', authenticate, requireSpecificRole(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), settingsController.updateSettings);
router.patch('/organization', authenticate, requireSpecificRole(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), settingsController.updateSettings);
router.put('/organization', authenticate, requireSpecificRole(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), settingsController.updateSettings);

// ── ATTENDANCE HARDWARE ──────────────────────────────────────────────────────

// Generate / rotate the hardware attendance API key (returned once, then masked)
router.post('/rotate-attendance-key', authenticate, requireSpecificRole(['MD', 'HR_DIRECTOR', 'DEV']), async (req: any, res: any) => {
  try {
    const orgId = req.user?.organizationId || 'mcb-ghana-tenant';
    const newKey = crypto.randomBytes(32).toString('hex');
    await prisma.organization.update({
      where: { id: orgId },
      data: { attendanceApiKey: newKey }
    });
    // Only time the full key is returned — store it immediately
    res.json({ attendanceApiKey: newKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle attendance scanning on/off
router.patch('/attendance-scanning', authenticate, requireSpecificRole(['MD', 'HR_DIRECTOR', 'DEV']), async (req: any, res: any) => {
  try {
    const orgId = req.user?.organizationId || 'mcb-ghana-tenant';
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be a boolean' });
    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { attendanceScanningEnabled: enabled }
    });
    res.json({ attendanceScanningEnabled: updated.attendanceScanningEnabled });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Tier 2 pension and update rate
router.patch('/tier2-pension', authenticate, requireSpecificRole(['MD', 'HR_DIRECTOR', 'FINANCE_MANAGER', 'DEV']), async (req: any, res: any) => {
  try {
    const orgId = req.user?.organizationId || 'mcb-ghana-tenant';
    const { enabled, rate } = req.body;
    const data: any = {};
    if (typeof enabled === 'boolean') data.tier2PensionEnabled = enabled;
    if (typeof rate === 'number' && rate >= 0 && rate <= 0.20) data.tier2PensionRate = rate;
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Provide enabled (boolean) or rate (0–0.20)' });
    const updated = await prisma.organization.update({ where: { id: orgId }, data });
    res.json({ tier2PensionEnabled: updated.tier2PensionEnabled, tier2PensionRate: Number(updated.tier2PensionRate) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DANGER: Purge all transactional data (MD/DEV only — production onboarding)
router.post('/purge-data', authenticate, requireRole(95), async (req: any, res: any) => {
  const provided = String(req.body?.recoverySecret || '');
  const configured = String(process.env.PURGE_RECOVERY_SECRET || '');
  const valid = configured.length >= 16
    && provided.length === configured.length
    && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(configured));

  if (!valid) {
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
