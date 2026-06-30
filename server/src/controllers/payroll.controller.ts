import { getRoleRank } from '../middleware/auth.middleware';
import { Request, Response } from 'express';
import * as payrollService from '../services/payroll.service';
import { logAction } from '../services/audit.service';
import prisma from '../prisma/client';
import { PdfExportService } from '../services/pdf.service';
import { createObjectCsvStringifier } from 'csv-writer';
import { getOrgId } from './enterprise.controller';
import { i18n } from '../services/i18n.service';

export const createRun = async (req: Request, res: Response) => {
  try {
    const { month, year, employeeIds, adjustments } = req.body;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const userReq = (req as any).user;

    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });
    const result = await payrollService.createPayrollRun(
      organizationId, parseInt(month), parseInt(year), employeeIds, adjustments
    );
    await logAction(userReq.id, 'PAYROLL_RUN_CREATED', 'PayrollRun', result.run.id,
      { period: result.run.period, employeeCount: result.items.length }, req.ip);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const approveRun = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const currentRun = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
    if (!currentRun) return res.status(404).json({ error: 'Run not found' });

    const userRank = getRoleRank(userReq.role);
    
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
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const approverId = userReq.id;
    const run = await payrollService.approvePayrollRun(organizationId, req.params.id, approverId);
    await logAction(approverId, 'PAYROLL_APPROVED', 'PayrollRun', run.id, { period: run.period }, req.ip);
    res.json(run);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

const transitionRun = (action: 'SUBMIT' | 'HR_APPROVE' | 'HR_REJECT' | 'RELEASE' | 'MD_REJECT') => async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
    const run = await payrollService.transitionPayrollRun(organizationId, req.params.id, user.id, action, req.body?.reason);
    await logAction(user.id, `PAYROLL_${action}`, 'PayrollRun', run.id, { period: run.period, reason: req.body?.reason }, req.ip);
    return res.json(run);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const submitRun = transitionRun('SUBMIT');
export const hrApproveRun = transitionRun('HR_APPROVE');
export const hrRejectRun = transitionRun('HR_REJECT');
export const releaseRun = transitionRun('RELEASE');
export const mdRejectRun = transitionRun('MD_REJECT');

export const voidRun = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    if (getRoleRank(userReq.role) < 90) {
      return res.status(403).json({ error: 'Only MD can void payroll runs' });
    }
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const actorId = userReq.id;
    const run = await payrollService.voidPayrollRun(organizationId, req.params.id, actorId);
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    await logAction(actorId, 'PAYROLL_VOIDED', 'PayrollRun', run.id, {}, req.ip);
    res.json(run);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteRun = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const actorId = userReq.id;
    await payrollService.deletePayrollRun(organizationId, req.params.id);
    await logAction(actorId, 'PAYROLL_DELETED', 'PayrollRun', req.params.id, {}, req.ip);
    res.json({ message: 'Payroll run deleted and associations unlinked' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const item = await payrollService.updatePayrollItem(organizationId, req.params.itemId, req.body);
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getRuns = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const data = await payrollService.getPayrollRuns(
      organizationId,
      parseInt(req.query.page as string) || 1
    );
    res.json(data);
  } catch (err: any) {
    console.error('[payroll.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getRunDetail = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const run = await payrollService.getPayrollRunDetail(organizationId, req.params.id);
    if (!run) return res.status(404).json({ error: 'Not found' });
    res.json(run);
  } catch (err: any) {
    console.error('[payroll.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getMyPayslips = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const employeeId = userReq.id;
    const slips = await payrollService.getMyPayslips(organizationId, employeeId);
    res.json(slips);
  } catch (err: any) {
    console.error('[payroll.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getYearlySummary = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const summary = await payrollService.getPayrollSummaryByYear(organizationId, year);
    res.json(summary);
  } catch (err: any) {
    console.error('[payroll.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const downloadPayslipPDF = async (req: Request, res: Response) => {
  try {
    const { runId, employeeId } = req.params;
    const userReq = (req as any).user;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const requesterId = userReq.id;
    const requesterRole = userReq.role;

    const isSelf = requesterId === employeeId;

    const [item, org] = await Promise.all([
      prisma.payrollItem.findFirst({
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
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { 
          name: true, logoUrl: true, address: true, phone: true, email: true, language: true,
          primaryColor: true, textPrimary: true
        }
      })
    ]);

    if (!item) return res.status(404).json({ error: 'Payslip not found' });
    if (!isSelf && !['FINANCE_MANAGER', 'HR_DIRECTOR', 'MD', 'DEV'].includes(requesterRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const pdfBuffer = await PdfExportService.generateBrandedPdf(
      organizationId, 
      `Electronic Payslip: ${item.run.period}`, 
      item as any, 
      'PAYSLIP'
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${item.employee.employeeCode || employeeId}-${item.run.period}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    console.error('PDF error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'PDF generation failed' });
  }
};

export const exportPayrollCSV = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const run = await payrollService.getPayrollRunDetail(organizationId, req.params.id);
    if (!run) return res.status(404).json({ error: 'Not found' });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${run.period}.csv"`);

    const headers = 'Employee Code,Name,Department,Job Title,Base Salary,Overtime,Bonus,Allowances,Gross Pay,Tax,SSNIT/Social Security,Other Deductions,Net Pay,Currency,Notes\n';
    const rows = run.items.map(item =>
      `"${item.employee.employeeCode || ''}","${item.employee.fullName}","${item.employee.departmentObj?.name || ''}","${item.employee.jobTitle}",${item.baseSalary},${item.overtime},${item.bonus},${item.allowances},${item.grossPay},${item.tax},${item.ssnit},${item.otherDeductions},${item.netPay},${item.currency},"${item.notes || ''}"`
    ).join('\n');

    res.send(headers + rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const exportBankCSV = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const run = await prisma.payrollRun.findFirst({
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

    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    if (run.status !== 'RELEASED') return res.status(409).json({ error: 'Bank export is available only after MD release.' });

    const csvStringifier = createObjectCsvStringifier({
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getStatutoryRules = async (req: Request, res: Response) => {
  const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
  const rules = await prisma.payrollStatutoryRule.findMany({ where: { organizationId }, orderBy: { effectiveFrom: 'desc' } });
  return res.json(rules);
};

export const createStatutoryRule = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
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
    if (!payeBands.every((band: any) => Number.isFinite(Number(band.limit)) && Number(band.limit) > 0 && Number.isFinite(Number(band.rate)) && Number(band.rate) >= 0 && Number(band.rate) <= 1)) {
      return res.status(400).json({ error: 'Every PAYE band requires a positive limit and a decimal rate between 0 and 1.' });
    }
    if (Number(minimumInsurable) > Number(maximumInsurable)) {
      return res.status(400).json({ error: 'Minimum insurable earnings cannot exceed the maximum.' });
    }
    const rule = await prisma.payrollStatutoryRule.create({
      data: {
        organizationId, name, effectiveFrom: from, effectiveTo: to,
        employeeSsnitRate: employeeRate, employerSsnitRate: employerRate, minimumInsurable, maximumInsurable, payeBands, bonusRules, overtimeRules,
        accountantApproved: false,
      },
    });
    return res.status(201).json(rule);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const approveStatutoryRule = async (req: Request, res: Response) => {
  const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
  const user = (req as any).user;
  if (req.body?.accountantConfirmation !== true) {
    return res.status(400).json({ error: 'Explicit accountant confirmation is required.' });
  }
  const rule = await prisma.payrollStatutoryRule.findFirst({ where: { id: req.params.id, organizationId } });
  if (!rule) return res.status(404).json({ error: 'Statutory rule not found' });
  const overlap = await prisma.payrollStatutoryRule.findFirst({
    where: {
      organizationId,
      id: { not: rule.id },
      accountantApproved: true,
      effectiveFrom: { lte: rule.effectiveTo || new Date('9999-12-31T00:00:00.000Z') },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: rule.effectiveFrom } }],
    },
    select: { id: true, name: true },
  });
  if (overlap) return res.status(409).json({ error: `This period overlaps approved rule "${overlap.name}".` });
  const result = await prisma.payrollStatutoryRule.updateMany({
    where: { id: rule.id, organizationId, accountantApproved: false },
    data: { accountantApproved: true, approvedBy: user.id, approvedAt: new Date() },
  });
  if (!result.count) return res.status(409).json({ error: 'Statutory rule is already approved' });
  return res.json({ success: true });
};
