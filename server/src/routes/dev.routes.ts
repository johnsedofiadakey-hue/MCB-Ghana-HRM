import { Router } from 'express';
import {
  getSystemStats,
  checkIntegrity,
  getSecurityTelemetry,
  toggleTenantFeature,
  extendTrial,
  getSystemLogs,
  getTenantDetails,
  triggerBackup,
  grantBankTransferAccess,
  getApiUsageStats,
  bulkTenantAction,
  listOrganizations,
  createOrganization,
  listAllUsers,
  seedDemoTenant,
  updateTenantNetwork,
  updateTenantBilling,
  getTenantAuditTrail,
  provisionClient,
  deleteOrganization,
  resetMDPassword,
} from '../controllers/dev.controller';
import { devAuth, verifyDevPin, verifyGoogleIdentity } from '../middleware/devAuth.middleware';
import { validate, DevPinSchema, ProvisionSchema, TenantFeatureToggleSchema, TrialExtensionSchema, BankAccessSchema } from '../middleware/validate.middleware';

const router = Router();

// ─── PUBLIC: Access verification (no devAuth required) ───────────────────
router.post('/verify-pin', validate(DevPinSchema), verifyDevPin);
router.post('/verify-google', verifyGoogleIdentity);

// ─── PROTECTED: All routes below require dev authentication ──────────────
router.get('/stats', devAuth, getSystemStats);
router.get('/integrity', devAuth, checkIntegrity);
router.get('/telemetry', devAuth, getSecurityTelemetry);
router.get('/telemetry/api', devAuth, getApiUsageStats);
router.post('/tenant/feature', devAuth, validate(TenantFeatureToggleSchema), toggleTenantFeature);
router.post('/tenant/trial', devAuth, validate(TrialExtensionSchema), extendTrial);
router.post('/tenant/bulk-action', devAuth, bulkTenantAction);
router.get('/logs', devAuth, getSystemLogs);
router.get('/tenant/:id', devAuth, getTenantDetails);
router.patch('/tenant/:id/network', devAuth, updateTenantNetwork);
router.patch('/tenant/:id/billing', devAuth, updateTenantBilling);
router.get('/tenant/:id/audit', devAuth, getTenantAuditTrail);
router.post('/backup', devAuth, triggerBackup);
router.post('/grant-bank-access', devAuth, validate(BankAccessSchema), grantBankTransferAccess);

// Tenant/Organization management
router.get('/organizations', devAuth, listOrganizations);
router.post('/organizations', devAuth, createOrganization);
router.get('/users', devAuth, listAllUsers);
router.post('/tenant/seed-demo', devAuth, seedDemoTenant);
router.post('/provision', devAuth, validate(ProvisionSchema), provisionClient);
router.delete('/tenant/:id', devAuth, deleteOrganization);
router.post('/tenant/:id/reset-password', devAuth, resetMDPassword);

export default router;
