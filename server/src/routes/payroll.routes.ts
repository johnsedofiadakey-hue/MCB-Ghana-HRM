import { Router } from 'express';
import { authenticate, requirePermission, requireAnyPermission } from '../middleware/auth.middleware';
import { Permission } from '../types/permissions';
import {
  createRun, submitRun, hrApproveRun, hrRejectRun, releaseRun, mdRejectRun, voidRun, deleteRun, updateItem,
  getRuns, getRunDetail, getMyPayslips,
  downloadPayslipPDF, exportPayrollCSV, exportBankCSV, getYearlySummary,
  getStatutoryRules, createStatutoryRule, approveStatutoryRule
} from '../controllers/payroll.controller';
import { validate, PayrollRunSchema, PayrollItemUpdateSchema } from '../middleware/validate.middleware';
import { YearEndSummaryService } from '../services/year-end-summary.service';
import { getOrgId } from '../controllers/enterprise.controller';

const router = Router();
router.use(authenticate);

// Employee self-service
router.get('/my-payslips', getMyPayslips);
router.get('/payslip/:runId/:employeeId/pdf', downloadPayslipPDF);

// Employee year-end tax summary (self-service)
router.get('/my-tax-summary/:year', async (req, res) => {
  try {
    const user = (req as any).user;
    const year = parseInt(req.params.year);
    if (isNaN(year)) return res.status(400).json({ error: 'Invalid year' });
    const summary = await YearEndSummaryService.getEmployeeSummary(
      user.organizationId || 'mcb-ghana-tenant', user.id, year
    );
    if (!summary) return res.status(404).json({ error: 'No payroll data found for this year' });
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin — payroll management
// HR_DIRECTOR added: needs full payroll visibility per client requirements
const payrollViewPermissions = [Permission.PAYROLL_PREPARE, Permission.PAYROLL_HR_APPROVE, Permission.PAYROLL_RELEASE];

router.get('/summary', requireAnyPermission(payrollViewPermissions), getYearlySummary);
router.get('/', requireAnyPermission(payrollViewPermissions), getRuns);
// Statutory rule drafting/approval: Finance prepares, HR Director can also draft/approve per client requirements
const statutoryRuleManagePermissions = [Permission.PAYROLL_PREPARE, Permission.PAYROLL_HR_APPROVE];
router.get('/statutory-rules', requireAnyPermission(payrollViewPermissions), getStatutoryRules);
router.post('/statutory-rules', requireAnyPermission(statutoryRuleManagePermissions), createStatutoryRule);
router.post('/statutory-rules/:id/approve', requireAnyPermission(statutoryRuleManagePermissions), approveStatutoryRule);
router.post('/runs', requirePermission(Permission.PAYROLL_PREPARE), validate(PayrollRunSchema), createRun);
router.post('/run', requirePermission(Permission.PAYROLL_PREPARE), validate(PayrollRunSchema), createRun); // compatibility
router.get('/:id', requireAnyPermission(payrollViewPermissions), getRunDetail);
router.post('/runs/:id/submit', requirePermission(Permission.PAYROLL_SUBMIT), submitRun);
router.post('/runs/:id/hr-approve', requirePermission(Permission.PAYROLL_HR_APPROVE), hrApproveRun);
router.post('/runs/:id/hr-reject', requirePermission(Permission.PAYROLL_HR_APPROVE), hrRejectRun);
router.post('/runs/:id/release', requirePermission(Permission.PAYROLL_RELEASE), releaseRun);
router.post('/runs/:id/md-reject', requirePermission(Permission.PAYROLL_RELEASE), mdRejectRun);
router.post('/runs/:id/void', requirePermission(Permission.PAYROLL_RELEASE), voidRun);
router.delete('/:id', requirePermission(Permission.PAYROLL_PREPARE), deleteRun);
router.patch('/items/:itemId', requirePermission(Permission.PAYROLL_PREPARE), validate(PayrollItemUpdateSchema), updateItem);
router.get('/:id/export/csv', requireAnyPermission(payrollViewPermissions), exportPayrollCSV);
router.get('/:id/bank-export/csv', requirePermission(Permission.PAYROLL_EXPORT), exportBankCSV);

// Admin year-end summary for all employees
router.get('/tax-summary/org/:year', requireAnyPermission(payrollViewPermissions), async (req, res) => {
  try {
    const orgId = getOrgId(req) || 'mcb-ghana-tenant';
    const year = parseInt(req.params.year);
    if (isNaN(year)) return res.status(400).json({ error: 'Invalid year' });
    const summaries = await YearEndSummaryService.getOrganizationSummary(orgId, year);
    res.json(summaries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
