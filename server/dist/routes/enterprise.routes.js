"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const ai_guard_middleware_1 = require("../middleware/ai-guard.middleware");
const enterprise_controller_1 = require("../controllers/enterprise.controller");
const router = (0, express_1.Router)();
const hrRoles = ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'MD', 'DEV'];
const hrItRoles = [...hrRoles, 'IT_MANAGER', 'IT_ADMIN'];
const payrollRoles = ['FINANCE_MANAGER', 'HR_DIRECTOR', 'MD', 'DEV'];
const communicationRoles = ['MARKETING_HEAD', 'HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV'];
router.use(auth_middleware_1.authenticate);
// Role-specific dashboards
router.get('/dashboard', enterprise_controller_1.getRoleDashboard);
router.get('/summary', enterprise_controller_1.getEnterpriseSummary);
// Performance chain
router.get('/performance/department-kpis', (0, auth_middleware_1.requireRole)(70), enterprise_controller_1.listDepartmentKPIs);
router.post('/performance/department-kpis', (0, auth_middleware_1.requireRole)(80), enterprise_controller_1.createDepartmentKPI);
router.patch('/performance/department-kpis/:id', (0, auth_middleware_1.requireRole)(80), enterprise_controller_1.updateDepartmentKPI);
router.delete('/performance/department-kpis/:id', (0, auth_middleware_1.requireRole)(80), enterprise_controller_1.deleteDepartmentKPI);
router.post('/performance/team-targets', (0, auth_middleware_1.requireRole)(70), enterprise_controller_1.createTeamTarget);
router.post('/performance/employee-targets', (0, auth_middleware_1.requireRole)(70), enterprise_controller_1.createEmployeeTarget);
router.get('/performance/reviews', (0, auth_middleware_1.requireRole)(60), enterprise_controller_1.listPerformanceReviews);
router.post('/performance/reviews', (0, auth_middleware_1.requireRole)(50), enterprise_controller_1.upsertPerformanceReview);
// ATS
router.get('/recruitment/jobs', (0, auth_middleware_1.requireSpecificRole)(hrRoles), enterprise_controller_1.listJobPositions);
router.post('/recruitment/jobs', (0, auth_middleware_1.requireSpecificRole)(hrRoles), enterprise_controller_1.createJobPosition);
router.get('/recruitment/candidates', (0, auth_middleware_1.requireSpecificRole)(hrRoles), enterprise_controller_1.listCandidates);
router.post('/recruitment/candidates', (0, auth_middleware_1.requireSpecificRole)(hrRoles), enterprise_controller_1.createCandidate);
router.patch('/recruitment/candidates/:id/status', (0, auth_middleware_1.requireSpecificRole)(hrRoles), enterprise_controller_1.updateCandidateStatus);
router.post('/recruitment/ai-generate-jd', (0, auth_middleware_1.requireSpecificRole)(hrRoles), ai_guard_middleware_1.aiGuard, enterprise_controller_1.generateJobDraft);
router.get('/culture-pulse', (0, auth_middleware_1.requireSpecificRole)(hrRoles), ai_guard_middleware_1.aiGuard, enterprise_controller_1.getCulturePulse);
// Onboarding / Offboarding
router.get('/onboarding/checklists', (0, auth_middleware_1.requireSpecificRole)(hrItRoles), enterprise_controller_1.listOnboardingChecklists);
router.post('/onboarding/tasks', (0, auth_middleware_1.requireSpecificRole)(hrItRoles), enterprise_controller_1.addOnboardingTask);
router.patch('/onboarding/tasks/:id', (0, auth_middleware_1.requireSpecificRole)(hrItRoles), enterprise_controller_1.updateOnboardingTask);
router.post('/offboarding/start', (0, auth_middleware_1.requireSpecificRole)(hrRoles), enterprise_controller_1.startOffboarding);
router.post('/offboarding/exit-interview', (0, auth_middleware_1.requireSpecificRole)(hrRoles), enterprise_controller_1.completeExitInterview);
router.post('/offboarding/asset-return', (0, auth_middleware_1.requireSpecificRole)(hrItRoles), enterprise_controller_1.recordAssetReturn);
// Benefits
router.get('/benefits/plans', (0, auth_middleware_1.requireSpecificRole)(hrRoles), enterprise_controller_1.listBenefitPlans);
router.post('/benefits/plans', (0, auth_middleware_1.requireSpecificRole)(hrRoles), enterprise_controller_1.createBenefitPlan);
router.get('/benefits/enrollments', (0, auth_middleware_1.requireSpecificRole)(hrRoles), enterprise_controller_1.listBenefitEnrollments);
router.post('/benefits/enrollments', (0, auth_middleware_1.requireSpecificRole)(hrRoles), enterprise_controller_1.enrollEmployeeBenefit);
// Shift management
router.get('/shifts', (0, auth_middleware_1.requireRole)(50), enterprise_controller_1.listShifts);
router.post('/shifts', (0, auth_middleware_1.requireRole)(70), enterprise_controller_1.createShift);
router.get('/shifts/assignments', (0, auth_middleware_1.requireRole)(60), enterprise_controller_1.listEmployeeShifts);
router.post('/shifts/assign', (0, auth_middleware_1.requireRole)(70), enterprise_controller_1.assignShift);
// Announcements
router.get('/announcements', (0, auth_middleware_1.requireRole)(40), enterprise_controller_1.listAnnouncements);
router.post('/announcements', (0, auth_middleware_1.requireSpecificRole)(communicationRoles), enterprise_controller_1.createAnnouncement);
// Payroll tax rule engine
router.get('/tax/rules', (0, auth_middleware_1.requireSpecificRole)(payrollRoles), enterprise_controller_1.listTaxRules);
router.post('/tax/rules', (0, auth_middleware_1.requireSpecificRole)(payrollRoles), enterprise_controller_1.createTaxRule);
router.post('/tax/brackets', (0, auth_middleware_1.requireSpecificRole)(payrollRoles), enterprise_controller_1.createTaxBracket);
exports.default = router;
