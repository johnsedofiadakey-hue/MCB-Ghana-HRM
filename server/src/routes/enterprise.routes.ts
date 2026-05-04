import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { aiGuard } from '../middleware/ai-guard.middleware';
import {
  getRoleDashboard,
  createDepartmentKPI,
  updateDepartmentKPI,
  deleteDepartmentKPI,
  listDepartmentKPIs,
  createTeamTarget,
  createEmployeeTarget,
  upsertPerformanceReview,
  listPerformanceReviews,
  createJobPosition,
  listJobPositions,
  createCandidate,
  listCandidates,
  updateCandidateStatus,
  listOnboardingChecklists,
  addOnboardingTask,
  updateOnboardingTask,
  startOffboarding,
  completeExitInterview,
  recordAssetReturn,
  createBenefitPlan,
  listBenefitPlans,
  enrollEmployeeBenefit,
  listBenefitEnrollments,
  createShift,
  listShifts,
  assignShift,
  listEmployeeShifts,
  createAnnouncement,
  listAnnouncements,
  createTaxRule,
  listTaxRules,
  createTaxBracket,
  getEnterpriseSummary,
  generateJobDraft,
  getCulturePulse,
} from '../controllers/enterprise.controller';

const router = Router();

router.use(authenticate);

// Role-specific dashboards
router.get('/dashboard', getRoleDashboard);
router.get('/summary', getEnterpriseSummary);

// Performance chain
router.get('/performance/department-kpis', requireRole(70), listDepartmentKPIs);
router.post('/performance/department-kpis', requireRole(80), createDepartmentKPI);
router.patch('/performance/department-kpis/:id', requireRole(80), updateDepartmentKPI);
router.delete('/performance/department-kpis/:id', requireRole(80), deleteDepartmentKPI);
router.post('/performance/team-targets', requireRole(70), createTeamTarget);
router.post('/performance/employee-targets', requireRole(70), createEmployeeTarget);
router.get('/performance/reviews', requireRole(60), listPerformanceReviews);
router.post('/performance/reviews', requireRole(50), upsertPerformanceReview);

// ATS
router.get('/recruitment/jobs', requireRole(60), listJobPositions);
router.post('/recruitment/jobs', requireRole(80), createJobPosition);
router.get('/recruitment/candidates', requireRole(60), listCandidates);
router.post('/recruitment/candidates', requireRole(60), createCandidate);
router.patch('/recruitment/candidates/:id/status', requireRole(70), updateCandidateStatus);
router.post('/recruitment/ai-generate-jd', requireRole(80), aiGuard, generateJobDraft);
router.get('/culture-pulse', requireRole(85), aiGuard, getCulturePulse);

// Onboarding / Offboarding
router.get('/onboarding/checklists', requireRole(60), listOnboardingChecklists);
router.post('/onboarding/tasks', requireRole(60), addOnboardingTask);
router.patch('/onboarding/tasks/:id', requireRole(60), updateOnboardingTask);

router.post('/offboarding/start', requireRole(70), startOffboarding);
router.post('/offboarding/exit-interview', requireRole(60), completeExitInterview);
router.post('/offboarding/asset-return', requireRole(60), recordAssetReturn);

// Benefits
router.get('/benefits/plans', requireRole(60), listBenefitPlans);
router.post('/benefits/plans', requireRole(80), createBenefitPlan);
router.get('/benefits/enrollments', requireRole(60), listBenefitEnrollments);
router.post('/benefits/enrollments', requireRole(70), enrollEmployeeBenefit);

// Shift management
router.get('/shifts', requireRole(50), listShifts);
router.post('/shifts', requireRole(70), createShift);
router.get('/shifts/assignments', requireRole(60), listEmployeeShifts);
router.post('/shifts/assign', requireRole(70), assignShift);

// Announcements
router.get('/announcements', requireRole(40), listAnnouncements);
router.post('/announcements', requireRole(70), createAnnouncement);

// Payroll tax rule engine
router.get('/tax/rules', requireRole(60), listTaxRules);
router.post('/tax/rules', requireRole(80), createTaxRule);
router.post('/tax/brackets', requireRole(80), createTaxBracket);

export default router;
