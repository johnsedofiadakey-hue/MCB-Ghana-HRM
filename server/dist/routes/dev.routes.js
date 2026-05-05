"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dev_controller_1 = require("../controllers/dev.controller");
const devAuth_middleware_1 = require("../middleware/devAuth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
// ─── PUBLIC: Access verification (no devAuth required) ───────────────────
router.post('/verify-pin', (0, validate_middleware_1.validate)(validate_middleware_1.DevPinSchema), devAuth_middleware_1.verifyDevPin);
router.post('/verify-google', devAuth_middleware_1.verifyGoogleIdentity);
// ─── PROTECTED: All routes below require dev authentication ──────────────
router.get('/stats', devAuth_middleware_1.devAuth, dev_controller_1.getSystemStats);
router.get('/integrity', devAuth_middleware_1.devAuth, dev_controller_1.checkIntegrity);
router.get('/telemetry', devAuth_middleware_1.devAuth, dev_controller_1.getSecurityTelemetry);
router.get('/telemetry/api', devAuth_middleware_1.devAuth, dev_controller_1.getApiUsageStats);
router.post('/tenant/feature', devAuth_middleware_1.devAuth, (0, validate_middleware_1.validate)(validate_middleware_1.TenantFeatureToggleSchema), dev_controller_1.toggleTenantFeature);
router.post('/tenant/trial', devAuth_middleware_1.devAuth, (0, validate_middleware_1.validate)(validate_middleware_1.TrialExtensionSchema), dev_controller_1.extendTrial);
router.post('/tenant/bulk-action', devAuth_middleware_1.devAuth, dev_controller_1.bulkTenantAction);
router.get('/logs', devAuth_middleware_1.devAuth, dev_controller_1.getSystemLogs);
router.get('/tenant/:id', devAuth_middleware_1.devAuth, dev_controller_1.getTenantDetails);
router.patch('/tenant/:id/network', devAuth_middleware_1.devAuth, dev_controller_1.updateTenantNetwork);
router.patch('/tenant/:id/billing', devAuth_middleware_1.devAuth, dev_controller_1.updateTenantBilling);
router.get('/tenant/:id/audit', devAuth_middleware_1.devAuth, dev_controller_1.getTenantAuditTrail);
router.post('/backup', devAuth_middleware_1.devAuth, dev_controller_1.triggerBackup);
router.post('/grant-bank-access', devAuth_middleware_1.devAuth, (0, validate_middleware_1.validate)(validate_middleware_1.BankAccessSchema), dev_controller_1.grantBankTransferAccess);
// Tenant/Organization management
router.get('/organizations', devAuth_middleware_1.devAuth, dev_controller_1.listOrganizations);
router.post('/organizations', devAuth_middleware_1.devAuth, dev_controller_1.createOrganization);
router.get('/users', devAuth_middleware_1.devAuth, dev_controller_1.listAllUsers);
router.post('/tenant/seed-demo', devAuth_middleware_1.devAuth, dev_controller_1.seedDemoTenant);
router.post('/provision', devAuth_middleware_1.devAuth, (0, validate_middleware_1.validate)(validate_middleware_1.ProvisionSchema), dev_controller_1.provisionClient);
router.delete('/tenant/:id', devAuth_middleware_1.devAuth, dev_controller_1.deleteOrganization);
router.post('/tenant/:id/reset-password', devAuth_middleware_1.devAuth, dev_controller_1.resetMDPassword);
exports.default = router;
