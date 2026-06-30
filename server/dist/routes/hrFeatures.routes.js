"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permissions_1 = require("../types/permissions");
const hrFeatures_controller_1 = require("../controllers/hrFeatures.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// ── Disciplinary & Grievance ─────────────────────────────────────────────────
router.get('/disciplinary', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_HISTORY_READ), hrFeatures_controller_1.listDisciplinaryCases);
router.post('/disciplinary', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_HISTORY_WRITE), hrFeatures_controller_1.createDisciplinaryCase);
router.patch('/disciplinary/:id', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_HISTORY_WRITE), hrFeatures_controller_1.updateDisciplinaryCase);
router.delete('/disciplinary/:id', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_HISTORY_WRITE), hrFeatures_controller_1.deleteDisciplinaryCase);
// ── Policy Library ───────────────────────────────────────────────────────────
router.get('/policies', hrFeatures_controller_1.listPolicies);
router.post('/policies', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_WRITE), hrFeatures_controller_1.createPolicy);
router.patch('/policies/:id', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_WRITE), hrFeatures_controller_1.updatePolicy);
router.delete('/policies/:id', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_WRITE), hrFeatures_controller_1.deletePolicy);
router.post('/policies/:id/acknowledge', hrFeatures_controller_1.acknowledgePolicy);
router.get('/policies/:id/acknowledgments', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_READ), hrFeatures_controller_1.getPolicyAcknowledgments);
// ── Probation ────────────────────────────────────────────────────────────────
router.get('/probation', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_HISTORY_READ), hrFeatures_controller_1.listProbationRecords);
router.get('/probation/stats', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_HISTORY_READ), hrFeatures_controller_1.getProbationStats);
router.post('/probation', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_HISTORY_WRITE), hrFeatures_controller_1.createProbationRecord);
router.patch('/probation/:id', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_HISTORY_WRITE), hrFeatures_controller_1.updateProbationRecord);
// ── Promotions ───────────────────────────────────────────────────────────────
router.get('/promotions', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_HISTORY_READ), hrFeatures_controller_1.listPromotionRequests);
router.post('/promotions', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.EMPLOYEE_HISTORY_WRITE), hrFeatures_controller_1.createPromotionRequest);
router.patch('/promotions/:id', (0, auth_middleware_1.requirePermission)(permissions_1.Permission.COMPENSATION_MANAGE), hrFeatures_controller_1.updatePromotionStatus);
exports.default = router;
