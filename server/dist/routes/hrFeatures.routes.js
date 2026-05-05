"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const hrFeatures_controller_1 = require("../controllers/hrFeatures.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// ── Disciplinary & Grievance ─────────────────────────────────────────────────
router.get('/disciplinary', hrFeatures_controller_1.listDisciplinaryCases);
router.post('/disciplinary', hrFeatures_controller_1.createDisciplinaryCase);
router.patch('/disciplinary/:id', hrFeatures_controller_1.updateDisciplinaryCase);
router.delete('/disciplinary/:id', hrFeatures_controller_1.deleteDisciplinaryCase);
// ── Policy Library ───────────────────────────────────────────────────────────
router.get('/policies', hrFeatures_controller_1.listPolicies);
router.post('/policies', hrFeatures_controller_1.createPolicy);
router.patch('/policies/:id', hrFeatures_controller_1.updatePolicy);
router.delete('/policies/:id', hrFeatures_controller_1.deletePolicy);
router.post('/policies/:id/acknowledge', hrFeatures_controller_1.acknowledgePolicy);
router.get('/policies/:id/acknowledgments', hrFeatures_controller_1.getPolicyAcknowledgments);
// ── Probation ────────────────────────────────────────────────────────────────
router.get('/probation', hrFeatures_controller_1.listProbationRecords);
router.get('/probation/stats', hrFeatures_controller_1.getProbationStats);
router.post('/probation', hrFeatures_controller_1.createProbationRecord);
router.patch('/probation/:id', hrFeatures_controller_1.updateProbationRecord);
// ── Promotions ───────────────────────────────────────────────────────────────
router.get('/promotions', hrFeatures_controller_1.listPromotionRequests);
router.post('/promotions', hrFeatures_controller_1.createPromotionRequest);
router.patch('/promotions/:id', hrFeatures_controller_1.updatePromotionStatus);
exports.default = router;
