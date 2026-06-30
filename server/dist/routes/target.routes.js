"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TargetController = __importStar(require("../controllers/target.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const ai_guard_middleware_1 = require("../middleware/ai-guard.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// ── LIST ──────────────────────────────────────────────────────────────────────
// GET /targets           — my targets (assignee) + targets I manage (lineManager/reviewer)
router.get('/', TargetController.getTargets);
// GET /targets/team      — targets I assigned / manage (Manager+)
router.get('/team', (0, auth_middleware_1.requireRole)(60), TargetController.getTeamTargets);
// GET /targets/department — department-level targets (Director+)
router.get('/department', (0, auth_middleware_1.requireRole)(80), TargetController.getDepartmentTargets);
// GET /targets/strategic — strategic rollup for a parent (Director+)
router.get('/strategic/:id', (0, auth_middleware_1.requireRole)(80), TargetController.getStrategicRollup);
// ── SINGLE RESOURCE ───────────────────────────────────────────────────────────
router.get('/:id', TargetController.getTarget);
router.patch('/:id', (0, auth_middleware_1.requireRole)(60), TargetController.updateTarget);
router.delete('/:id', (0, auth_middleware_1.requireRole)(60), TargetController.deleteTarget);
// ── ACTIONS (on a target) ─────────────────────────────────────────────────────
// POST /targets/:id/acknowledge  — employee acknowledges or requests clarification
router.post('/:id/acknowledge', TargetController.acknowledge);
// POST /targets/:id/progress     — employee logs metric updates
router.post('/:id/progress', TargetController.updateProgress);
// POST /targets/:id/review       — reviewer approves or returns
router.post('/:id/review', (0, auth_middleware_1.requireRole)(60), TargetController.reviewTarget);
// POST /targets/:id/cascade      — manager distributes dept target to individuals
router.post('/:id/cascade', (0, auth_middleware_1.requireRole)(60), TargetController.cascadeTarget);
// ── CREATE ────────────────────────────────────────────────────────────────────
router.post('/', (0, auth_middleware_1.requireRole)(60), TargetController.createTarget);
// ── AI & INSIGHTS ─────────────────────────────────────────────────────────────
router.post('/generate-smart-draft', (0, auth_middleware_1.requireRole)(60), ai_guard_middleware_1.aiGuard, TargetController.generateSmartDraft);
router.get('/pulse/risk', (0, auth_middleware_1.requireSpecificRole)(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), ai_guard_middleware_1.aiGuard, TargetController.getRiskPulse);
exports.default = router;
