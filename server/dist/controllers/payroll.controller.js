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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveStatutoryRule = exports.createStatutoryRule = exports.getStatutoryRules = exports.exportSsnitCsv = exports.exportGraPayeCsv = exports.exportBankCSV = exports.exportPayrollCSV = exports.downloadPayslipPDF = exports.getYearlySummary = exports.getMyPayslips = exports.getRunDetail = exports.getRuns = exports.updateItem = exports.deleteRun = exports.voidRun = exports.releaseRun = exports.mdRejectRun = exports.hrRejectRun = exports.hrApproveRun = exports.submitRun = exports.approveRun = exports.createRun = void 0;
const auth_middleware_1 = require("../middleware/auth.middleware");
const payrollService = __importStar(require("../services/payroll.service"));
const audit_service_1 = require("../services/audit.service");
const client_1 = __importDefault(require("../prisma/client"));
const pdf_service_1 = require("../services/pdf.service");
const csv_writer_1 = require("csv-writer");
const enterprise_controller_1 = require("./enterprise.controller");
const email_service_1 = require("../services/email.service");
const createRun = async (req, res) => {
    try {
        const { month, year, employeeIds, adjustments } = req.body;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const userReq = req.user;
        if (!month || !year)
            return res.status(400).json({ error: 'month and year are required' });
        const result = await payrollService.createPayrollRun(organizationId, parseInt(month), parseInt(year), employeeIds, adjustments);
        await (0, audit_service_1.logAction)(userReq.id, 'PAYROLL_RUN_CREATED', 'PayrollRun', result.run.id, { period: result.run.period, employeeCount: result.items.length }, req.ip);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.createRun = createRun;
const approveRun = async (req, res) => {
    try {
        const userReq = req.user;
        const currentRun = await client_1.default.payrollRun.findUnique({ where: { id: req.params.id } });
        if (!currentRun)
            return res.status(404).json({ error: 'Run not found' });
        const userRank = (0, auth_middleware_1.getRoleRank)(userReq.role);
        // Authorization Matrix
        if (currentRun.status === 'DRAFT' && userRank < 87) {
            return res.status(403).json({ error: 'Requires Finance Manager rank to request review' });
        }
        if (currentRun.status === 'PENDING_HR' && userRank < 88) {
            return res.status(403).json({ error: 'Requires HR Manager rank to approve HR review' });
        }
        if (currentRun.status === 'PENDING_MD' && userRank < 95) {
            return res.status(403).json({ error: 'Requires Managing Director rank for final approval' });
        }
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const approverId = userReq.id;
        const run = await payrollService.approvePayrollRun(organizationId, req.params.id, approverId);
        await (0, audit_service_1.logAction)(approverId, 'PAYROLL_APPROVED', 'PayrollRun', run.id, { period: run.period }, req.ip);
        res.json(run);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.approveRun = approveRun;
const transitionRun = (action) => async (req, res) => {
    try {
        const user = req.user;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const run = await payrollService.transitionPayrollRun(organizationId, req.params.id, user.id, action, req.body?.reason);
        await (0, audit_service_1.logAction)(user.id, `PAYROLL_${action}`, 'PayrollRun', run.id, { period: run.period, reason: req.body?.reason }, req.ip);
        return res.json(run);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.submitRun = transitionRun('SUBMIT');
exports.hrApproveRun = transitionRun('HR_APPROVE');
exports.hrRejectRun = transitionRun('HR_REJECT');
exports.mdRejectRun = transitionRun('MD_REJECT');
const releaseRun = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const run = await payrollService.transitionPayrollRun(organizationId, req.params.id, user.id, 'RELEASE', req.body?.reason);
        await (0, audit_service_1.logAction)(user.id, 'PAYROLL_RELEASE', 'PayrollRun', run.id, { period: run.period }, req.ip);
        // Fire-and-forget payslip emails — do not block the HTTP response
        client_1.default.payrollItem.findMany({
            where: { runId: run.id, organizationId },
            select: { employee: { select: { email: true, fullName: true } } }
        }).then(items => {
            const period = run.period;
            for (const item of items) {
                if (item.employee?.email) {
                    (0, email_service_1.sendPayslipEmail)(item.employee.email, period, item.employee.fullName, organizationId)
                        .catch(err => console.error('[payroll] payslip email failed:', item.employee?.email, err?.message));
                }
            }
        }).catch(err => console.error('[payroll] payslip email fetch failed:', err?.message));
        return res.json(run);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.releaseRun = releaseRun;
const voidRun = async (req, res) => {
    try {
        const userReq = req.user;
        if ((0, auth_middleware_1.getRoleRank)(userReq.role) < 90) {
            return res.status(403).json({ error: 'Only MD can void payroll runs' });
        }
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const actorId = userReq.id;
        const run = await payrollService.voidPayrollRun(organizationId, req.params.id, actorId);
        if (!run)
            return res.status(404).json({ error: 'Payroll run not found' });
        await (0, audit_service_1.logAction)(actorId, 'PAYROLL_VOIDED', 'PayrollRun', run.id, {}, req.ip);
        res.json(run);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.voidRun = voidRun;
const deleteRun = async (req, res) => {
    try {
        const userReq = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const actorId = userReq.id;
        await payrollService.deletePayrollRun(organizationId, req.params.id);
        await (0, audit_service_1.logAction)(actorId, 'PAYROLL_DELETED', 'PayrollRun', req.params.id, {}, req.ip);
        res.json({ message: 'Payroll run deleted and associations unlinked' });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.deleteRun = deleteRun;
const updateItem = async (req, res) => {
    try {
        const userReq = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const item = await payrollService.updatePayrollItem(organizationId, req.params.itemId, req.body);
        res.json(item);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.updateItem = updateItem;
const getRuns = async (req, res) => {
    try {
        const userReq = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const data = await payrollService.getPayrollRuns(organizationId, parseInt(req.query.page) || 1);
        res.json(data);
    }
    catch (err) {
        console.error('[payroll.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getRuns = getRuns;
const getRunDetail = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const run = await payrollService.getPayrollRunDetail(organizationId, req.params.id);
        if (!run)
            return res.status(404).json({ error: 'Not found' });
        res.json(run);
    }
    catch (err) {
        console.error('[payroll.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getRunDetail = getRunDetail;
const getMyPayslips = async (req, res) => {
    try {
        const userReq = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const employeeId = userReq.id;
        const slips = await payrollService.getMyPayslips(organizationId, employeeId);
        res.json(slips);
    }
    catch (err) {
        console.error('[payroll.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getMyPayslips = getMyPayslips;
const getYearlySummary = async (req, res) => {
    try {
        const userReq = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const summary = await payrollService.getPayrollSummaryByYear(organizationId, year);
        res.json(summary);
    }
    catch (err) {
        console.error('[payroll.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getYearlySummary = getYearlySummary;
const downloadPayslipPDF = async (req, res) => {
    try {
        const { runId, employeeId } = req.params;
        const userReq = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const requesterId = userReq.id;
        const requesterRole = userReq.role;
        const isSelf = requesterId === employeeId;
        const [item, org] = await Promise.all([
            client_1.default.payrollItem.findFirst({
                where: { runId, employeeId, organizationId, run: { status: 'RELEASED' } },
                include: {
                    run: true,
                    employee: {
                        select: {
                            fullName: true, jobTitle: true, email: true, employeeCode: true,
                            bankName: true, bankAccountNumber: true,
                            address: true, contactNumber: true,
                            departmentObj: { select: { name: true } }
                        }
                    }
                }
            }),
            client_1.default.organization.findUnique({
                where: { id: organizationId },
                select: {
                    name: true, logoUrl: true, address: true, phone: true, email: true, language: true,
                    primaryColor: true, textPrimary: true
                }
            })
        ]);
        if (!item)
            return res.status(404).json({ error: 'Payslip not found' });
        if (!isSelf && !['FINANCE_MANAGER', 'HR_DIRECTOR', 'MD', 'DEV'].includes(requesterRole)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const pdfBuffer = await pdf_service_1.PdfExportService.generateBrandedPdf(organizationId, `Electronic Payslip: ${item.run.period}`, item, 'PAYSLIP');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="payslip-${item.employee.employeeCode || employeeId}-${item.run.period}.pdf"`);
        return res.send(pdfBuffer);
    }
    catch (err) {
        console.error('PDF error:', err);
        if (!res.headersSent)
            res.status(500).json({ error: 'PDF generation failed' });
    }
};
exports.downloadPayslipPDF = downloadPayslipPDF;
const exportPayrollCSV = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const run = await payrollService.getPayrollRunDetail(organizationId, req.params.id);
        if (!run)
            return res.status(404).json({ error: 'Not found' });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="payroll-${run.period}.csv"`);
        const headers = 'Employee Code,Name,Department,Job Title,Base Salary,Overtime,Bonus,Allowances,Gross Pay,Tax,SSNIT/Social Security,Other Deductions,Net Pay,Currency,Notes\n';
        const rows = run.items.map(item => `"${item.employee.employeeCode || ''}","${item.employee.fullName}","${item.employee.departmentObj?.name || ''}","${item.employee.jobTitle}",${item.baseSalary},${item.overtime},${item.bonus},${item.allowances},${item.grossPay},${item.tax},${item.ssnit},${item.otherDeductions},${item.netPay},${item.currency},"${item.notes || ''}"`).join('\n');
        res.send(headers + rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportPayrollCSV = exportPayrollCSV;
const exportBankCSV = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const run = await client_1.default.payrollRun.findFirst({
            where: { id: req.params.id, organizationId },
            include: {
                items: {
                    include: {
                        employee: {
                            select: {
                                fullName: true,
                                bankName: true,
                                bankAccountNumber: true,
                                bankBranch: true
                            }
                        }
                    }
                }
            }
        });
        if (!run)
            return res.status(404).json({ error: 'Payroll run not found' });
        if (run.status !== 'RELEASED')
            return res.status(409).json({ error: 'Bank export is available only after MD release.' });
        const csvStringifier = (0, csv_writer_1.createObjectCsvStringifier)({
            header: [
                { id: 'name', title: 'ACCOUNT NAME' },
                { id: 'number', title: 'ACCOUNT NUMBER' },
                { id: 'bank', title: 'BANK NAME' },
                { id: 'branch', title: 'BRANCH' },
                { id: 'amount', title: 'AMOUNT' },
                { id: 'currency', title: 'CURRENCY' },
                { id: 'narration', title: 'NARRATION' }
            ]
        });
        const records = run.items.map(item => ({
            name: item.employee.fullName,
            number: item.employee.bankAccountNumber || 'N/A',
            bank: item.employee.bankName || 'N/A',
            branch: item.employee.bankBranch || 'N/A',
            amount: item.netPay,
            currency: item.currency,
            narration: `Salary Payment - ${run.period}`
        }));
        const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="bank-transfer-${run.period}.csv"`);
        res.send(csvString);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportBankCSV = exportBankCSV;
const exportGraPayeCsv = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const run = await client_1.default.payrollRun.findFirst({
            where: { id: req.params.id, organizationId },
            include: {
                items: {
                    include: {
                        employee: { select: { fullName: true, departmentObj: { select: { name: true } } } }
                    }
                }
            }
        });
        if (!run)
            return res.status(404).json({ error: 'Payroll run not found' });
        const csvStringifier = (0, csv_writer_1.createObjectCsvStringifier)({
            header: [
                { id: 'name', title: 'Employee Name' },
                { id: 'tin', title: 'TIN' },
                { id: 'employmentIncome', title: 'Employment Income' },
                { id: 'nonCashBenefits', title: 'Non-Cash Benefits' },
                { id: 'totalGross', title: 'Total Gross' },
                { id: 'allowableDeductions', title: 'Allowable Deductions' },
                { id: 'chargeableIncome', title: 'Chargeable Income' },
                { id: 'taxPayable', title: 'Tax Payable' },
            ]
        });
        const records = run.items.map(item => ({
            name: item.employee.fullName,
            tin: '',
            employmentIncome: +item.baseSalary + +item.overtime + +item.bonus,
            nonCashBenefits: +item.allowances,
            totalGross: +item.grossPay,
            allowableDeductions: +item.ssnit,
            chargeableIncome: Math.max(0, +item.grossPay - +item.ssnit),
            taxPayable: +item.tax,
        }));
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="gra-paye-${run.period}.csv"`);
        res.send(csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportGraPayeCsv = exportGraPayeCsv;
const exportSsnitCsv = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const run = await client_1.default.payrollRun.findFirst({
            where: { id: req.params.id, organizationId },
            include: {
                items: {
                    include: {
                        employee: { select: { fullName: true, ssnitNumber: true } }
                    }
                }
            }
        });
        if (!run)
            return res.status(404).json({ error: 'Payroll run not found' });
        const csvStringifier = (0, csv_writer_1.createObjectCsvStringifier)({
            header: [
                { id: 'name', title: 'Employee Name' },
                { id: 'ssnitNumber', title: 'SSNIT Number' },
                { id: 'basicSalary', title: 'Basic Salary' },
                { id: 'employeeContribution', title: 'Employee Contribution (5.5%)' },
                { id: 'employerContribution', title: 'Employer Contribution (13%)' },
            ]
        });
        const records = run.items.map(item => ({
            name: item.employee.fullName,
            ssnitNumber: item.employee.ssnitNumber || '',
            basicSalary: item.baseSalary,
            employeeContribution: item.ssnit,
            employerContribution: +(+item.baseSalary * 0.13).toFixed(2),
        }));
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="ssnit-${run.period}.csv"`);
        res.send(csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportSsnitCsv = exportSsnitCsv;
const getStatutoryRules = async (req, res) => {
    const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
    const rules = await client_1.default.payrollStatutoryRule.findMany({ where: { organizationId }, orderBy: { effectiveFrom: 'desc' } });
    return res.json(rules);
};
exports.getStatutoryRules = getStatutoryRules;
const createStatutoryRule = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const { name, effectiveFrom, effectiveTo, employeeSsnitRate, employerSsnitRate, minimumInsurable, maximumInsurable, payeBands, bonusRules, overtimeRules } = req.body;
        if (!name || !effectiveFrom || !Array.isArray(payeBands) || !payeBands.length) {
            return res.status(400).json({ error: 'name, effectiveFrom and payeBands are required.' });
        }
        const from = new Date(effectiveFrom);
        const to = effectiveTo ? new Date(effectiveTo) : null;
        if (Number.isNaN(from.getTime()) || (to && Number.isNaN(to.getTime())) || (to && to < from)) {
            return res.status(400).json({ error: 'The statutory-rule effective date range is invalid.' });
        }
        const employeeRate = Number(employeeSsnitRate);
        const employerRate = Number(employerSsnitRate);
        if (![employeeRate, employerRate].every(rate => Number.isFinite(rate) && rate >= 0 && rate <= 1)) {
            return res.status(400).json({ error: 'SSNIT rates must be decimal values between 0 and 1.' });
        }
        if (!payeBands.every((band) => Number.isFinite(Number(band.limit)) && Number(band.limit) > 0 && Number.isFinite(Number(band.rate)) && Number(band.rate) >= 0 && Number(band.rate) <= 1)) {
            return res.status(400).json({ error: 'Every PAYE band requires a positive limit and a decimal rate between 0 and 1.' });
        }
        if (Number(minimumInsurable) > Number(maximumInsurable)) {
            return res.status(400).json({ error: 'Minimum insurable earnings cannot exceed the maximum.' });
        }
        const rule = await client_1.default.payrollStatutoryRule.create({
            data: {
                organizationId, name, effectiveFrom: from, effectiveTo: to,
                employeeSsnitRate: employeeRate, employerSsnitRate: employerRate, minimumInsurable, maximumInsurable, payeBands, bonusRules, overtimeRules,
                accountantApproved: false,
            },
        });
        return res.status(201).json(rule);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.createStatutoryRule = createStatutoryRule;
const approveStatutoryRule = async (req, res) => {
    const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
    const user = req.user;
    if (req.body?.accountantConfirmation !== true) {
        return res.status(400).json({ error: 'Explicit accountant confirmation is required.' });
    }
    const rule = await client_1.default.payrollStatutoryRule.findFirst({ where: { id: req.params.id, organizationId } });
    if (!rule)
        return res.status(404).json({ error: 'Statutory rule not found' });
    const overlap = await client_1.default.payrollStatutoryRule.findFirst({
        where: {
            organizationId,
            id: { not: rule.id },
            accountantApproved: true,
            effectiveFrom: { lte: rule.effectiveTo || new Date('9999-12-31T00:00:00.000Z') },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: rule.effectiveFrom } }],
        },
        select: { id: true, name: true },
    });
    if (overlap)
        return res.status(409).json({ error: `This period overlaps approved rule "${overlap.name}".` });
    const result = await client_1.default.payrollStatutoryRule.updateMany({
        where: { id: rule.id, organizationId, accountantApproved: false },
        data: { accountantApproved: true, approvedBy: user.id, approvedAt: new Date() },
    });
    if (!result.count)
        return res.status(409).json({ error: 'Statutory rule is already approved' });
    return res.json({ success: true });
};
exports.approveStatutoryRule = approveStatutoryRule;
