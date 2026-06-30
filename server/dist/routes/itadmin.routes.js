"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permissions_1 = require("../types/permissions");
const itadmin_controller_1 = require("../controllers/itadmin.controller");
const hierarchy_controller_1 = require("../controllers/hierarchy.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// System overview — Director+ can view
router.get('/overview', (0, auth_middleware_1.requireSpecificRole)(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), itadmin_controller_1.itSystemOverview);
router.get('/live-logs', (0, auth_middleware_1.requireSpecificRole)(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), itadmin_controller_1.getLiveLogs);
router.get('/security-threats', (0, auth_middleware_1.requireSpecificRole)(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']), itadmin_controller_1.getSecurityThreats);
// User management — IT Admin+ (Rank 85+) can manage accounts
router.get('/users', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.ACCOUNT_PROVISION), itadmin_controller_1.itGetUsers);
router.post('/users', itadmin_controller_1.itCreateEmployee);
router.post('/users/:userId/reset-password', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.ACCOUNT_PROVISION), itadmin_controller_1.itResetPassword);
router.patch('/users/:userId/deactivate', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.ACCOUNT_PROVISION), itadmin_controller_1.itDeactivateUser);
// Maintenance — MD only
router.post('/maintenance/cleanup-logs', (0, auth_middleware_1.requireSpecificRole)(['IT_MANAGER', 'MD', 'DEV']), itadmin_controller_1.itCleanupLogs);
// Hierarchy validation — any authenticated user
router.post('/hierarchy/validate', hierarchy_controller_1.validateHierarchy);
exports.default = router;
