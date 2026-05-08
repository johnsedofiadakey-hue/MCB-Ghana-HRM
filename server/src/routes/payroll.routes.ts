import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  createRun, approveRun, voidRun, deleteRun, updateItem,
  getRuns, getRunDetail, getMyPayslips,
  downloadPayslipPDF, exportPayrollCSV, exportBankCSV, getYearlySummary
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
router.get('/summary', requireRole(85), getYearlySummary);
router.get('/', requireRole(85), getRuns);
router.post('/run', requireRole(85), validate(PayrollRunSchema), createRun);
router.get('/:id', requireRole(85), getRunDetail);
router.post('/:id/approve', requireRole(90), approveRun);
router.post('/:id/void', requireRole(90), voidRun);
router.delete('/:id', requireRole(90), deleteRun);
router.patch('/items/:itemId', requireRole(85), validate(PayrollItemUpdateSchema), updateItem);
router.get('/:id/export/csv', requireRole(85), exportPayrollCSV);
router.get('/:id/bank-export/csv', requireRole(85), exportBankCSV);

// Admin year-end summary for all employees
router.get('/tax-summary/org/:year', requireRole(85), async (req, res) => {
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
