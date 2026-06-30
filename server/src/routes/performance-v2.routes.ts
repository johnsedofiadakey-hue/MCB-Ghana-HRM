import { Router } from 'express';
import { authenticate, requireRole, requireSpecificRole } from '../middleware/auth.middleware';
import * as controller from '../controllers/performance-v2.controller';

const router = Router();
router.use(authenticate);

// Department KPIs (Director+) — both singular and plural for compatibility
router.post('/dept-kpi', requireRole(80), controller.createDepartmentKPI);
router.get('/dept-kpi', requireRole(70), controller.getDepartmentKPIs);
router.post('/dept-kpis', requireRole(80), controller.createDepartmentKPI);
router.get('/dept-kpis', requireRole(70), controller.getDepartmentKPIs);
router.delete('/dept-kpis/:id', requireRole(80), controller.deleteDepartmentKPI);

// Team Targets (Manager+)
router.post('/team-target', requireRole(70), controller.createTeamTarget);
router.get('/team-target', requireRole(70), controller.getTeamTargets);
router.post('/team-targets', requireRole(70), controller.createTeamTarget);
router.get('/team-targets', requireRole(70), controller.getTeamTargets);

// Employee Targets
router.post('/employee-target', requireRole(70), controller.createEmployeeTarget);
router.post('/employee-targets', requireRole(70), controller.createEmployeeTarget);
router.get('/employee-targets', controller.getMyTargets);
router.patch('/employee-targets/:id', controller.updateEmployeeTarget);
router.get('/my-targets', controller.getMyTargets);

// Performance Reviews
router.post('/reviews', controller.createReview);
router.patch('/reviews/:id/manager', requireRole(70), controller.managerReview);
router.patch('/reviews/:id/director', requireSpecificRole(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), controller.directorFinalize);

export default router;
