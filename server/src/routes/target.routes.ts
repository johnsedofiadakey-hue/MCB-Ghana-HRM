import { Router } from 'express';
import * as TargetController from '../controllers/target.controller';
import { authenticate, requireRole, requireSpecificRole } from '../middleware/auth.middleware';
import { aiGuard } from '../middleware/ai-guard.middleware';

const router = Router();
router.use(authenticate);

// ── LIST ──────────────────────────────────────────────────────────────────────
// GET /targets           — my targets (assignee) + targets I manage (lineManager/reviewer)
router.get('/', TargetController.getTargets);

// GET /targets/team      — targets I assigned / manage (Manager+)
router.get('/team', requireRole(60), TargetController.getTeamTargets);

// GET /targets/department — department-level targets (Director+)
router.get('/department', requireRole(80), TargetController.getDepartmentTargets);

// GET /targets/strategic — strategic rollup for a parent (Director+)
router.get('/strategic/:id', requireRole(80), TargetController.getStrategicRollup);

// ── SINGLE RESOURCE ───────────────────────────────────────────────────────────
router.get('/:id', TargetController.getTarget);
router.patch('/:id', requireRole(60), TargetController.updateTarget);
router.delete('/:id', requireRole(60), TargetController.deleteTarget);

// ── ACTIONS (on a target) ─────────────────────────────────────────────────────
// POST /targets/:id/acknowledge  — employee acknowledges or requests clarification
router.post('/:id/acknowledge', TargetController.acknowledge);

// POST /targets/:id/progress     — employee logs metric updates
router.post('/:id/progress', TargetController.updateProgress);

// POST /targets/:id/review       — reviewer approves or returns
router.post('/:id/review', requireRole(60), TargetController.reviewTarget);

// POST /targets/:id/cascade      — manager distributes dept target to individuals
router.post('/:id/cascade', requireRole(60), TargetController.cascadeTarget);

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post('/', requireRole(60), TargetController.createTarget);

// ── AI & INSIGHTS ─────────────────────────────────────────────────────────────
router.post('/generate-smart-draft', requireRole(60), aiGuard, TargetController.generateSmartDraft);
router.get('/pulse/risk', requireSpecificRole(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), aiGuard, TargetController.getRiskPulse);

export default router;
