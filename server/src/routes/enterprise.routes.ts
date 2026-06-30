import { Router } from 'express';
import { authenticate, requireRole, requireSpecificRole } from '../middleware/auth.middleware';
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
const hrRoles = ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'MD', 'DEV'];
const hrItRoles = [...hrRoles, 'IT_MANAGER', 'IT_ADMIN'];
const payrollRoles = ['FINANCE_MANAGER', 'HR_DIRECTOR', 'MD', 'DEV'];
const communicationRoles = ['MARKETING_HEAD', 'HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV'];

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
router.get('/recruitment/jobs', requireSpecificRole(hrRoles), listJobPositions);
router.post('/recruitment/jobs', requireSpecificRole(hrRoles), createJobPosition);
router.get('/recruitment/candidates', requireSpecificRole(hrRoles), listCandidates);
router.post('/recruitment/candidates', requireSpecificRole(hrRoles), createCandidate);
router.patch('/recruitment/candidates/:id/status', requireSpecificRole(hrRoles), updateCandidateStatus);
router.post('/recruitment/ai-generate-jd', requireSpecificRole(hrRoles), aiGuard, generateJobDraft);
router.get('/culture-pulse', requireSpecificRole(hrRoles), aiGuard, getCulturePulse);

// Onboarding / Offboarding
router.get('/onboarding/checklists', requireSpecificRole(hrItRoles), listOnboardingChecklists);
router.post('/onboarding/tasks', requireSpecificRole(hrItRoles), addOnboardingTask);
router.patch('/onboarding/tasks/:id', requireSpecificRole(hrItRoles), updateOnboardingTask);

router.post('/offboarding/start', requireSpecificRole(hrRoles), startOffboarding);
router.post('/offboarding/exit-interview', requireSpecificRole(hrRoles), completeExitInterview);
router.post('/offboarding/asset-return', requireSpecificRole(hrItRoles), recordAssetReturn);

// Benefits
router.get('/benefits/plans', requireSpecificRole(hrRoles), listBenefitPlans);
router.post('/benefits/plans', requireSpecificRole(hrRoles), createBenefitPlan);
router.get('/benefits/enrollments', requireSpecificRole(hrRoles), listBenefitEnrollments);
router.post('/benefits/enrollments', requireSpecificRole(hrRoles), enrollEmployeeBenefit);

// Shift management
router.get('/shifts', requireRole(50), listShifts);
router.post('/shifts', requireRole(70), createShift);
router.get('/shifts/assignments', requireRole(60), listEmployeeShifts);
router.post('/shifts/assign', requireRole(70), assignShift);

// Announcements
router.get('/announcements', requireRole(40), listAnnouncements);
router.post('/announcements', requireSpecificRole(communicationRoles), createAnnouncement);

// Payroll tax rule engine
router.get('/tax/rules', requireSpecificRole(payrollRoles), listTaxRules);
router.post('/tax/rules', requireSpecificRole(payrollRoles), createTaxRule);
router.post('/tax/brackets', requireSpecificRole(payrollRoles), createTaxBracket);

export default router;
