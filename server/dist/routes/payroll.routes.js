"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const payroll_controller_1 = require("../controllers/payroll.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const year_end_summary_service_1 = require("../services/year-end-summary.service");
const enterprise_controller_1 = require("../controllers/enterprise.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Employee self-service
router.get('/my-payslips', payroll_controller_1.getMyPayslips);
router.get('/payslip/:runId/:employeeId/pdf', payroll_controller_1.downloadPayslipPDF);
// Employee year-end tax summary (self-service)
router.get('/my-tax-summary/:year', async (req, res) => {
    try {
        const user = req.user;
        const year = parseInt(req.params.year);
        if (isNaN(year))
            return res.status(400).json({ error: 'Invalid year' });
        const summary = await year_end_summary_service_1.YearEndSummaryService.getEmployeeSummary(user.organizationId || 'mcb-ghana-tenant', user.id, year);
        if (!summary)
            return res.status(404).json({ error: 'No payroll data found for this year' });
        res.json(summary);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Admin — payroll management
router.get('/summary', (0, auth_middleware_1.requireRole)(85), payroll_controller_1.getYearlySummary);
router.get('/', (0, auth_middleware_1.requireRole)(85), payroll_controller_1.getRuns);
router.post('/run', (0, auth_middleware_1.requireRole)(85), (0, validate_middleware_1.validate)(validate_middleware_1.PayrollRunSchema), payroll_controller_1.createRun);
router.get('/:id', (0, auth_middleware_1.requireRole)(85), payroll_controller_1.getRunDetail);
router.post('/:id/approve', (0, auth_middleware_1.requireRole)(90), payroll_controller_1.approveRun);
router.post('/:id/void', (0, auth_middleware_1.requireRole)(90), payroll_controller_1.voidRun);
router.delete('/:id', (0, auth_middleware_1.requireRole)(90), payroll_controller_1.deleteRun);
router.patch('/items/:itemId', (0, auth_middleware_1.requireRole)(85), (0, validate_middleware_1.validate)(validate_middleware_1.PayrollItemUpdateSchema), payroll_controller_1.updateItem);
router.get('/:id/export/csv', (0, auth_middleware_1.requireRole)(85), payroll_controller_1.exportPayrollCSV);
router.get('/:id/bank-export/csv', (0, auth_middleware_1.requireRole)(85), payroll_controller_1.exportBankCSV);
// Admin year-end summary for all employees
router.get('/tax-summary/org/:year', (0, auth_middleware_1.requireRole)(85), async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const year = parseInt(req.params.year);
        if (isNaN(year))
            return res.status(400).json({ error: 'Invalid year' });
        const summaries = await year_end_summary_service_1.YearEndSummaryService.getOrganizationSummary(orgId, year);
        res.json(summaries);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
