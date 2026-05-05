"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YearEndSummaryService = void 0;
/**
 * Year-End Tax Summary Service — v4.5 Clarity
 *
 * Generates annual P60-style tax summary documents
 * for employees, aggregating all payroll runs for a fiscal year.
 */
const client_1 = __importDefault(require("../prisma/client"));
class YearEndSummaryService {
    /**
     * Generate a year-end summary for a single employee.
     */
    static async getEmployeeSummary(organizationId, employeeId, year) {
        const items = await client_1.default.payrollItem.findMany({
            where: {
                organizationId,
                employeeId,
                run: { year, status: { in: ['APPROVED', 'PAID'] } },
            },
            include: {
                run: true,
                employee: {
                    select: {
                        fullName: true,
                        employeeCode: true,
                        jobTitle: true,
                        departmentObj: { select: { name: true } },
                    },
                },
            },
            orderBy: { run: { month: 'asc' } },
        });
        if (items.length === 0)
            return null;
        const employee = items[0].employee;
        const currency = items[0].currency || 'GHS';
        let totalBase = 0, totalOT = 0, totalBonus = 0, totalAllow = 0;
        let totalGross = 0, totalTax = 0, totalSS = 0, totalOther = 0, totalNet = 0;
        const monthlyBreakdown = [];
        for (const item of items) {
            const base = Number(item.baseSalary);
            const ot = Number(item.overtime);
            const bon = Number(item.bonus);
            const allow = Number(item.allowances);
            const gross = Number(item.grossPay);
            const tax = Number(item.tax);
            const ss = Number(item.ssnit);
            const other = Number(item.otherDeductions);
            const net = Number(item.netPay);
            totalBase += base;
            totalOT += ot;
            totalBonus += bon;
            totalAllow += allow;
            totalGross += gross;
            totalTax += tax;
            totalSS += ss;
            totalOther += other;
            totalNet += net;
            monthlyBreakdown.push({
                month: item.run.month,
                period: item.run.period,
                gross,
                tax,
                net,
            });
        }
        return {
            employeeId,
            employeeName: employee.fullName,
            employeeCode: employee.employeeCode || 'N/A',
            jobTitle: employee.jobTitle || 'N/A',
            department: employee.departmentObj?.name || 'N/A',
            year,
            currency,
            totalBaseSalary: round2(totalBase),
            totalOvertime: round2(totalOT),
            totalBonus: round2(totalBonus),
            totalAllowances: round2(totalAllow),
            totalGrossEarnings: round2(totalGross),
            totalTax: round2(totalTax),
            totalSocialSecurity: round2(totalSS),
            totalOtherDeductions: round2(totalOther),
            totalNetPay: round2(totalNet),
            totalDeductions: round2(totalTax + totalSS + totalOther),
            monthlyBreakdown,
            runCount: items.length,
        };
    }
    /**
     * Generate year-end summaries for all employees in an organization.
     */
    static async getOrganizationSummary(organizationId, year) {
        const employees = await client_1.default.user.findMany({
            where: {
                organizationId,
                isArchived: false,
                role: { not: 'DEV' },
            },
            select: { id: true },
        });
        const summaries = [];
        for (const emp of employees) {
            const summary = await this.getEmployeeSummary(organizationId, emp.id, year);
            if (summary && summary.runCount > 0) {
                summaries.push(summary);
            }
        }
        return summaries.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    }
}
exports.YearEndSummaryService = YearEndSummaryService;
function round2(n) {
    return Math.round(n * 100) / 100;
}
