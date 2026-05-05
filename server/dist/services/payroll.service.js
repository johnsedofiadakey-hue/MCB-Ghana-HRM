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
exports.getPayrollSummaryByYear = exports.getMyPayslips = exports.getPayrollRunDetail = exports.getPayrollRuns = exports.updatePayrollItem = exports.deletePayrollRun = exports.voidPayrollRun = exports.approvePayrollRun = exports.createPayrollRun = exports.calculateGhanaPayroll = exports.calculateGhanaSSNIT = exports.calculateGhanaPAYE = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const email_service_1 = require("./email.service");
const websocket_service_1 = require("./websocket.service");
// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const DEFAULT_CURRENCY = 'GHS';
const SSNIT_EMPLOYEE_RATE = 0.055; // 5.5%
const SSNIT_EMPLOYER_RATE = 0.13; // 13%
// ── GHANA PAYE (2024 GRA Monthly Bands) ────────────────────────────────────────
// ── GHANA PAYE (GRA Monthly Bands) ──────────────────────────────────────────
const calculateGhanaPAYE = (taxableIncome, customBands) => {
    if (taxableIncome <= 0)
        return 0;
    const bands = customBands || [
        { limit: 490, rate: 0.00 },
        { limit: 110, rate: 0.05 },
        { limit: 130, rate: 0.10 },
        { limit: 3166.67, rate: 0.175 },
        { limit: 16000, rate: 0.25 },
        { limit: 30520, rate: 0.30 },
        { limit: Infinity, rate: 0.35 },
    ];
    let tax = 0;
    let remaining = taxableIncome;
    for (const band of bands) {
        if (remaining <= 0)
            break;
        const amt = Math.min(remaining, band.limit);
        tax += amt * band.rate;
        remaining -= amt;
    }
    return Math.round(tax * 100) / 100;
};
exports.calculateGhanaPAYE = calculateGhanaPAYE;
// ── GHANA SSNIT ─────────────────────────────────────────────────────────────────
const calculateGhanaSSNIT = (grossSalary, employeeRate = 0.055, employerRate = 0.13) => {
    const employeeSSNIT = Math.round(grossSalary * employeeRate * 100) / 100;
    const employerSSNIT = Math.round(grossSalary * employerRate * 100) / 100;
    return { employeeSSNIT, employerSSNIT };
};
exports.calculateGhanaSSNIT = calculateGhanaSSNIT;
// ── MASTER CALCULATION (call this per employee per payroll run) ────────────────
const calculateGhanaPayroll = (params) => {
    const { grossSalary, bonus = 0, allowances = 0, overtime = 0, loanDeductions = 0, otherDeductions = 0, ssnitRate, employerSsnitRate, payeBands } = params;
    const totalGross = grossSalary + bonus + allowances + overtime;
    const { employeeSSNIT, employerSSNIT } = (0, exports.calculateGhanaSSNIT)(totalGross, ssnitRate, employerSsnitRate);
    const taxableIncome = Math.max(0, totalGross - employeeSSNIT);
    const payeTax = (0, exports.calculateGhanaPAYE)(taxableIncome, payeBands);
    const totalDeductions = employeeSSNIT + payeTax + loanDeductions + otherDeductions;
    const netPay = Math.max(0, Math.round((totalGross - totalDeductions) * 100) / 100);
    return { grossPay: Math.round(totalGross * 100) / 100, employeeSSNIT,
        employerSSNIT, taxableIncome: Math.round(taxableIncome * 100) / 100,
        payeTax, loanDeductions, otherDeductions, netPay,
        currency: DEFAULT_CURRENCY };
};
exports.calculateGhanaPayroll = calculateGhanaPayroll;
const createPayrollRun = async (organizationId, month, year, employeeIds, adjustments) => {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const existing = await client_1.default.payrollRun.findFirst({ where: { period, organizationId } });
    if (existing)
        throw new Error(`Payroll run for ${period} already exists. Delete or void it first.`);
    const org = await client_1.default.organization.findUnique({
        where: { id: organizationId },
        select: { ssnitRate: true, employerSsnitRate: true, payeBands: true }
    });
    const ssnitRate = Number(org?.ssnitRate ?? 0.055);
    const employerSsnitRate = Number(org?.employerSsnitRate ?? 0.13);
    const payeBands = typeof org?.payeBands === 'string' ? JSON.parse(org.payeBands) : (org?.payeBands || []);
    const employees = await client_1.default.user.findMany({
        where: {
            organizationId,
            status: 'ACTIVE',
            salary: { not: null },
            ...(employeeIds?.length ? { id: { in: employeeIds } } : {})
        }
    });
    if (!employees.length)
        throw new Error('No active employees with salary records found.');
    // Auto-fetch approved expenses and pending loan installments
    const pendingExpenses = await client_1.default.expenseClaim.findMany({
        where: {
            organizationId,
            status: 'APPROVED',
            paidInRunId: null,
            ...(employeeIds?.length ? { employeeId: { in: employeeIds } } : {})
        }
    });
    const expenseMap = new Map();
    pendingExpenses.forEach(e => expenseMap.set(e.employeeId, (expenseMap.get(e.employeeId) || 0) + Number(e.amount)));
    const pendingInstallments = await client_1.default.loanInstallment.findMany({
        where: {
            organizationId,
            status: 'PENDING',
            month,
            year
        },
        include: { loan: { select: { employeeId: true } } }
    });
    const installmentMap = new Map();
    pendingInstallments.forEach(i => {
        if (employeeIds?.length && !employeeIds.includes(i.loan.employeeId))
            return;
        installmentMap.set(i.loan.employeeId, (installmentMap.get(i.loan.employeeId) || 0) + Number(i.amount));
    });
    const run = await client_1.default.payrollRun.create({
        data: { organizationId, period, month, year }
    });
    let totalGross = 0, totalNet = 0;
    const items = [];
    const adjMap = new Map((adjustments || []).map(a => [a.employeeId, a]));
    for (const emp of employees) {
        const base = Number(emp.salary) || 0;
        const currency = emp.currency || 'GHS';
        const adj = adjMap.get(emp.id);
        const overtime = adj?.overtime ?? 0;
        const bonus = adj?.bonus ?? 0;
        // Aggregate manual adjustments with automatic module deductions
        const autoExpense = expenseMap.get(emp.id) || 0;
        const autoInstallment = installmentMap.get(emp.id) || 0;
        const allowances = (adj?.allowances ?? 0) + autoExpense;
        const otherDeductions = (adj?.otherDeductions ?? 0) + autoInstallment;
        const { employeeSSNIT, payeTax, netPay, grossPay: totalGrossPay } = (0, exports.calculateGhanaPayroll)({
            grossSalary: base,
            bonus: bonus,
            allowances: allowances,
            overtime: overtime,
            loanDeductions: autoInstallment,
            otherDeductions: adj?.otherDeductions ?? 0,
            ssnitRate,
            employerSsnitRate,
            payeBands
        });
        const item = await client_1.default.payrollItem.create({
            data: {
                organizationId,
                runId: run.id, employeeId: emp.id,
                baseSalary: base, currency: DEFAULT_CURRENCY, overtime, bonus, allowances, otherDeductions,
                tax: payeTax, ssnit: employeeSSNIT, grossPay: totalGrossPay, netPay,
                notes: adj?.notes
            }
        });
        items.push({ ...item, employee: emp });
        totalGross += totalGrossPay;
        totalNet += netPay;
    }
    await client_1.default.payrollRun.updateMany({
        where: { id: run.id, organizationId },
        data: { totalGross, totalNet }
    });
    // Link expenses and installments to this draft run
    if (pendingExpenses.length > 0) {
        await client_1.default.expenseClaim.updateMany({
            where: { id: { in: pendingExpenses.map(e => e.id) }, organizationId },
            data: { paidInRunId: run.id }
        });
    }
    // Filter installments to only the ones actually processed
    const processedInstallments = pendingInstallments.filter(i => !employeeIds?.length || employeeIds.includes(i.loan.employeeId));
    if (processedInstallments.length > 0) {
        await client_1.default.loanInstallment.updateMany({
            where: { id: { in: processedInstallments.map(i => i.id) }, organizationId },
            data: { deductedRunId: run.id }
        });
    }
    return { run, items };
};
exports.createPayrollRun = createPayrollRun;
const approvePayrollRun = async (organizationId, runId, approverId) => {
    const run = await client_1.default.payrollRun.findFirst({
        where: { id: runId, organizationId },
        include: { items: { include: { employee: true } } }
    });
    if (!run)
        throw new Error('Payroll run not found');
    if (run.status !== 'DRAFT' && run.status !== 'PENDING_HR' && run.status !== 'PENDING_MD') {
        throw new Error('Run is not in an approvable state');
    }
    // Multi-stage transitions with specific field tracking
    let nextStatus = 'APPROVED';
    let updateData = { status: '' };
    if (run.status === 'DRAFT') {
        nextStatus = 'PENDING_HR';
        updateData = {
            status: nextStatus,
            reviewedById: approverId,
            reviewedAt: new Date()
        };
    }
    else if (run.status === 'PENDING_HR') {
        nextStatus = 'PENDING_MD';
        updateData = {
            status: nextStatus,
            approvedById: approverId,
            approvedAt: new Date()
        };
    }
    else if (run.status === 'PENDING_MD') {
        nextStatus = 'APPROVED';
        updateData = {
            status: nextStatus,
            mdApprovedById: approverId,
            mdApprovedAt: new Date()
        };
    }
    await client_1.default.payrollRun.updateMany({
        where: { id: runId, organizationId },
        data: updateData
    });
    // Only finalize deductions and send emails if moving to APPROVED
    if (nextStatus !== 'APPROVED') {
        return client_1.default.payrollRun.findFirst({ where: { id: runId, organizationId } });
    }
    // Finalize auto-deductions
    await client_1.default.expenseClaim.updateMany({
        where: { paidInRunId: runId, organizationId },
        data: { status: 'PAID' }
    });
    // Trigger Enterprise Webhook
    try {
        const { triggerWebhook } = await Promise.resolve().then(() => __importStar(require('./webhook.service')));
        await triggerWebhook(organizationId, 'PAYROLL_RUN_COMPLETED', run);
    }
    catch (err) {
        console.error('Failed to trigger webhook:', err);
    }
    await client_1.default.loanInstallment.updateMany({
        where: { deductedRunId: runId, organizationId },
        data: { status: 'PAID', paidAt: new Date() }
    });
    for (const item of run.items) {
        const emp = item.employee;
        if (emp.email) {
            await (0, email_service_1.sendPayslipEmail)(emp.email, emp.fullName, run.period, Number(item.netPay).toLocaleString('en-US', { minimumFractionDigits: 2 }), item.currency).catch(console.error);
        }
        await (0, websocket_service_1.notify)(emp.id, 'Payslip Ready 💰', `Your ${run.period} payslip is ready. Net pay: ${item.currency} ${Number(item.netPay).toLocaleString()}`, 'SUCCESS', '/payroll');
    }
    const finalRun = await client_1.default.payrollRun.findFirst({
        where: { id: runId, organizationId },
        include: { items: true }
    });
    return finalRun;
};
exports.approvePayrollRun = approvePayrollRun;
const voidPayrollRun = async (organizationId, runId) => {
    const run = await client_1.default.payrollRun.findFirst({
        where: { id: runId, organizationId }
    });
    if (!run)
        throw new Error('Not found');
    if (run.status === 'PAID')
        throw new Error('Cannot void a PAID run');
    // Unlink expenses and installments so they can be picked up by the next run
    await client_1.default.expenseClaim.updateMany({
        where: { paidInRunId: runId, organizationId },
        data: { paidInRunId: null }
    });
    await client_1.default.loanInstallment.updateMany({
        where: { deductedRunId: runId, organizationId },
        data: { deductedRunId: null }
    });
    await client_1.default.payrollRun.updateMany({
        where: { id: runId, organizationId },
        data: { status: 'CANCELLED' }
    });
    return client_1.default.payrollRun.findFirst({ where: { id: runId, organizationId } });
};
exports.voidPayrollRun = voidPayrollRun;
const deletePayrollRun = async (organizationId, runId) => {
    const run = await client_1.default.payrollRun.findFirst({
        where: { id: runId, organizationId }
    });
    if (!run)
        throw new Error('Payroll run not found');
    // Restricted deletion: Only allow if not paid
    if (run.status === 'PAID')
        throw new Error('Cannot delete a finalized (PAID) payroll cycle');
    // Unlink expenses and installments so they can be picked up by the next run
    await client_1.default.expenseClaim.updateMany({
        where: { paidInRunId: runId, organizationId },
        data: { paidInRunId: null }
    });
    await client_1.default.loanInstallment.updateMany({
        where: { deductedRunId: runId, organizationId },
        data: { deductedRunId: null }
    });
    // Delete all items first (Cascade relation exists but we ensure clean removal)
    await client_1.default.payrollItem.deleteMany({
        where: { runId, organizationId }
    });
    await client_1.default.payrollRun.deleteMany({
        where: { id: runId, organizationId }
    });
    return { success: true };
};
exports.deletePayrollRun = deletePayrollRun;
const updatePayrollItem = async (organizationId, itemId, data) => {
    const item = await client_1.default.payrollItem.findFirst({
        where: { id: itemId, organizationId }
    });
    if (!item)
        throw new Error('Item not found');
    const run = await client_1.default.payrollRun.findFirst({
        where: { id: item.runId, organizationId }
    });
    if (run?.status !== 'DRAFT') {
        throw new Error('Can only edit items in a DRAFT run');
    }
    const org = await client_1.default.organization.findUnique({
        where: { id: organizationId },
        select: { ssnitRate: true, employerSsnitRate: true, payeBands: true }
    });
    const ssnitRate = Number(org?.ssnitRate ?? 0.055);
    const employerSsnitRate = Number(org?.employerSsnitRate ?? 0.13);
    const payeBands = typeof org?.payeBands === 'string' ? JSON.parse(org.payeBands) : (org?.payeBands || []);
    const base = Number(item.baseSalary);
    const overtime = data.overtime ?? Number(item.overtime);
    const bonus = data.bonus ?? Number(item.bonus);
    const allowances = data.allowances ?? Number(item.allowances);
    const otherDeductions = data.otherDeductions ?? Number(item.otherDeductions);
    const { employeeSSNIT, payeTax, netPay, grossPay: totalGrossPay } = (0, exports.calculateGhanaPayroll)({
        grossSalary: base,
        bonus,
        allowances,
        overtime,
        loanDeductions: otherDeductions, // Assuming otherDeductions here includes loan installments as in createPayrollRun
        otherDeductions: 0,
        ssnitRate,
        employerSsnitRate,
        payeBands
    });
    await client_1.default.payrollItem.updateMany({
        where: { id: itemId, organizationId },
        data: { overtime, bonus, allowances, otherDeductions, grossPay: totalGrossPay, tax: payeTax, ssnit: employeeSSNIT, netPay, notes: data.notes ?? item.notes }
    });
    const updated = await client_1.default.payrollItem.findFirst({ where: { id: itemId, organizationId } });
    // Recalculate run totals
    const allItems = await client_1.default.payrollItem.findMany({
        where: { runId: item.runId, organizationId }
    });
    const totalGross = allItems.reduce((sum, i) => sum + Number(i.grossPay), 0);
    const totalNet = allItems.reduce((sum, i) => sum + Number(i.netPay), 0);
    await client_1.default.payrollRun.updateMany({
        where: { id: item.runId, organizationId },
        data: { totalGross, totalNet }
    });
    return updated;
};
exports.updatePayrollItem = updatePayrollItem;
const getPayrollRuns = async (organizationId, page = 1, limit = 20) => {
    const [runs, total] = await Promise.all([
        client_1.default.payrollRun.findMany({
            where: { organizationId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            skip: (page - 1) * limit, take: limit
        }),
        client_1.default.payrollRun.count({ where: { organizationId } })
    ]);
    return { runs, total, page, pages: Math.ceil(total / limit) };
};
exports.getPayrollRuns = getPayrollRuns;
const getPayrollRunDetail = async (organizationId, runId) => {
    return client_1.default.payrollRun.findFirst({
        where: { id: runId, organizationId },
        include: {
            items: {
                where: { organizationId },
                include: {
                    employee: {
                        select: {
                            fullName: true, jobTitle: true, email: true, employeeCode: true,
                            departmentObj: { select: { name: true } }
                        }
                    }
                },
                orderBy: { employee: { fullName: 'asc' } }
            }
        }
    });
};
exports.getPayrollRunDetail = getPayrollRunDetail;
const getMyPayslips = async (organizationId, employeeId) => {
    return client_1.default.payrollItem.findMany({
        where: { employeeId, organizationId },
        include: { run: { select: { period: true, status: true, approvedAt: true } } },
        orderBy: { run: { year: 'desc' } }
    });
};
exports.getMyPayslips = getMyPayslips;
// Multi-currency summary across all paid runs for a given year
const getPayrollSummaryByYear = async (organizationId, year) => {
    const items = await client_1.default.payrollItem.findMany({
        where: {
            organizationId,
            run: { year, status: { in: ['APPROVED', 'PAID'] } }
        },
        select: { currency: true, grossPay: true, netPay: true, tax: true, ssnit: true }
    });
    const byCurrency = {};
    for (const i of items) {
        if (!byCurrency[i.currency])
            byCurrency[i.currency] = { gross: 0, net: 0, tax: 0, ssnit: 0, count: 0 };
        byCurrency[i.currency].gross += Number(i.grossPay);
        byCurrency[i.currency].net += Number(i.netPay);
        byCurrency[i.currency].tax += Number(i.tax);
        byCurrency[i.currency].ssnit += Number(i.ssnit);
        byCurrency[i.currency].count++;
    }
    return byCurrency;
};
exports.getPayrollSummaryByYear = getPayrollSummaryByYear;
