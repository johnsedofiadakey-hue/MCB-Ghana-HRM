import prisma from '../prisma/client';
import { sendPayslipEmail } from './email.service';
import { notify } from './websocket.service';
import crypto from 'crypto';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const DEFAULT_CURRENCY = 'GHS';
const SSNIT_EMPLOYEE_RATE = 0.055;   // 5.5%
const SSNIT_EMPLOYER_RATE = 0.13;    // 13%

// ── GHANA PAYE (GRA Monthly Bands) ──────────────────────────────────────────
const DEFAULT_PAYE_BANDS = [
  { limit: 490,      rate: 0.00  },
  { limit: 110,      rate: 0.05  },
  { limit: 130,      rate: 0.10  },
  { limit: 3166.67,  rate: 0.175 },
  { limit: 16000,    rate: 0.25  },
  { limit: 30520,    rate: 0.30  },
  { limit: Infinity, rate: 0.35  },
];

export const calculateGhanaPAYE = (taxableIncome: number, customBands?: any[]): number => {
  if (taxableIncome <= 0) return 0;
  if (!customBands || customBands.length === 0) {
    console.warn('[Payroll] No custom PAYE bands configured — using hardcoded 2024 GRA monthly bands. Update via Settings → Payroll to stay compliant.');
  }
  const bands = (customBands && customBands.length > 0) ? customBands : DEFAULT_PAYE_BANDS;
  let tax = 0; let remaining = taxableIncome;
  for (const band of bands) {
    if (remaining <= 0) break;
    const amt = Math.min(remaining, band.limit);
    tax += amt * band.rate; remaining -= amt;
  }
  return Math.round(tax * 100) / 100;
};

// ── GHANA SSNIT ─────────────────────────────────────────────────────────────────
export const calculateGhanaSSNIT = (basicSalary: number, employeeRate = 0.055, employerRate = 0.13, minimum?: number, maximum?: number) => {
  const insurableEarnings = Math.min(Math.max(basicSalary, minimum || 0), maximum || Number.POSITIVE_INFINITY);
  const employeeSSNIT = Math.round(insurableEarnings * employeeRate * 100) / 100;
  const employerSSNIT = Math.round(insurableEarnings * employerRate * 100) / 100;
  return { employeeSSNIT, employerSSNIT };
};

// ── MASTER CALCULATION (call this per employee per payroll run) ────────────────
export const calculateGhanaPayroll = (params: {
  grossSalary: number; bonus?: number; allowances?: number;
  overtime?: number; loanDeductions?: number; otherDeductions?: number;
  expenseReimbursements?: number; preTaxDeductions?: number;
  ssnitRate?: number; employerSsnitRate?: number; payeBands?: any[];
  minimumInsurable?: number; maximumInsurable?: number;
  bonusYtd?: number; bonusAnnualThresholdRate?: number; bonusFlatRate?: number;
  overtimeFlatRate?: number;
  tier2PensionEnabled?: boolean; tier2PensionRate?: number;
}) => {
  const { grossSalary, bonus=0, allowances=0, overtime=0,
          loanDeductions=0, otherDeductions=0, expenseReimbursements=0, preTaxDeductions=0,
          ssnitRate, employerSsnitRate, payeBands,
          minimumInsurable, maximumInsurable,
          bonusYtd=0, bonusAnnualThresholdRate=0.15, bonusFlatRate=0.05, overtimeFlatRate,
          tier2PensionEnabled=false, tier2PensionRate=0.05 } = params;

  const totalGross = grossSalary + bonus + allowances + overtime;
  const { employeeSSNIT, employerSSNIT } = calculateGhanaSSNIT(grossSalary, ssnitRate, employerSsnitRate, minimumInsurable, maximumInsurable);

  // Tier 2 occupational pension (optional, deducted from basic salary before PAYE)
  const tier2Pension = tier2PensionEnabled
    ? Math.round(grossSalary * tier2PensionRate * 100) / 100
    : 0;

  const annualBonusThreshold = grossSalary * 12 * bonusAnnualThresholdRate;
  const remainingFlatBonus = Math.max(0, annualBonusThreshold - bonusYtd);
  const flatRateBonus = Math.min(bonus, remainingFlatBonus);
  const graduatedBonus = Math.max(0, bonus - flatRateBonus);
  const graduatedOvertime = overtimeFlatRate == null ? overtime : 0;
  // preTaxDeductions (custom pre-tax rules) reduce taxable income alongside SSNIT & Tier2
  const taxableIncome = Math.max(0, grossSalary + allowances + graduatedBonus + graduatedOvertime - employeeSSNIT - tier2Pension - preTaxDeductions);
  const payeTax = Math.round((calculateGhanaPAYE(taxableIncome, payeBands) + flatRateBonus * bonusFlatRate + (overtimeFlatRate == null ? 0 : overtime * overtimeFlatRate)) * 100) / 100;
  const totalDeductions = employeeSSNIT + tier2Pension + payeTax + loanDeductions + otherDeductions + preTaxDeductions;
  const netPay = Math.max(0, Math.round((totalGross - totalDeductions + expenseReimbursements) * 100) / 100);
  return { grossPay: Math.round(totalGross*100)/100, employeeSSNIT,
           employerSSNIT, taxableIncome: Math.round(taxableIncome*100)/100,
           tier2Pension, payeTax, loanDeductions, otherDeductions, netPay,
           currency: DEFAULT_CURRENCY };
};

// ─── PAYROLL ADJUSTMENTS ─────────────────────────────────────────────────
// Per-employee overrides passed in by the HR/MD user
export interface PayrollAdjustment {
  employeeId: string;
  overtime?: number;
  bonus?: number;
  allowances?: number;
  otherDeductions?: number;
  notes?: string;
}

const getStatutoryRule = async (organizationId: string, periodDate: Date) => {
  const rule = await prisma.payrollStatutoryRule.findFirst({
    where: {
      organizationId,
      accountantApproved: true,
      effectiveFrom: { lte: periodDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodDate } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  });
  if (!rule) throw new Error('No accountant-approved statutory payroll rule is configured for this period.');
  return rule;
};

export const createPayrollRun = async (
  organizationId: string,
  month: number,
  year: number,
  employeeIds?: string[],
  adjustments?: PayrollAdjustment[]
) => {
  const period = `${year}-${String(month).padStart(2, '0')}`;
  const existing = await prisma.payrollRun.findFirst({ where: { period, organizationId } });
  if (existing) throw new Error(`Payroll run for ${period} already exists. Delete or void it first.`);

  const [org, statutoryRule] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { tier2PensionEnabled: true, tier2PensionRate: true } }),
    getStatutoryRule(organizationId, new Date(Date.UTC(year, month - 1, 1))),
  ]);
  const ssnitRate = Number(statutoryRule.employeeSsnitRate);
  const employerSsnitRate = Number(statutoryRule.employerSsnitRate);
  const payeBands = statutoryRule.payeBands as any[];
  const tier2PensionEnabled = org?.tier2PensionEnabled ?? false;
  const tier2PensionRate = Number(org?.tier2PensionRate ?? 0.05);

  const employees = await prisma.user.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      salary: { not: null },
      ...(employeeIds?.length ? { id: { in: employeeIds } } : {})
    }
  });
  if (!employees.length) throw new Error('No active employees with salary records found.');

  // Auto-fetch approved expenses and pending loan installments
  const pendingExpenses = await prisma.expenseClaim.findMany({
    where: {
      organizationId,
      status: 'APPROVED',
      paidInRunId: null,
      ...(employeeIds?.length ? { employeeId: { in: employeeIds } } : {})
    }
  });
  const expenseMap = new Map();
  pendingExpenses.forEach(e => expenseMap.set(e.employeeId, (expenseMap.get(e.employeeId) || 0) + Number(e.amount)));

  const pendingInstallments = await prisma.loanInstallment.findMany({
    where: {
      organizationId,
      status: 'PENDING',
      month,
      year
    },
    include: { loan: { select: { employeeId: true } } }
  });
  const priorBonuses = await prisma.payrollItem.groupBy({
    by: ['employeeId'],
    where: { organizationId, run: { year, status: 'RELEASED' } },
    _sum: { bonus: true },
  });
  const bonusYtdMap = new Map(priorBonuses.map((entry) => [entry.employeeId, Number(entry._sum.bonus || 0)]));

  // Load all active custom deduction templates for this org
  const deductionTemplates = await (prisma as any).payrollDeductionTemplate.findMany({
    where: { organizationId, isActive: true },
  });

  const installmentMap = new Map();
  pendingInstallments.forEach(i => {
    if (employeeIds?.length && !employeeIds.includes(i.loan.employeeId)) return;
    installmentMap.set(i.loan.employeeId, (installmentMap.get(i.loan.employeeId) || 0) + Number(i.amount));
  });

  const run = await prisma.payrollRun.create({
    data: { organizationId, period, month, year }
  });

  let totalGross = 0, totalNet = 0;
  const items: any[] = [];
  const adjMap = new Map((adjustments || []).map(a => [a.employeeId, a]));

  for (const emp of employees) {
    const base = Number(emp.salary) || 0;
    const currency = (emp.currency as string) || 'GHS';
    const adj = adjMap.get(emp.id);

    const overtime = adj?.overtime ?? 0;
    const bonus = adj?.bonus ?? 0;

    // Aggregate manual adjustments with automatic module deductions
    const autoExpense = expenseMap.get(emp.id) || 0;
    const autoInstallment = installmentMap.get(emp.id) || 0;
    const allowances = adj?.allowances ?? 0;

    // Apply custom deduction templates (GLOBAL + EMPLOYEE-scoped for this employee)
    const applicableTemplates = deductionTemplates.filter(
      (t: any) => t.type !== 'EMPLOYER_CONTRIBUTION' &&
        (t.scope === 'GLOBAL' || (t.scope === 'EMPLOYEE' && t.employeeId === emp.id))
    );
    const employerContribTemplates = deductionTemplates.filter(
      (t: any) => t.type === 'EMPLOYER_CONTRIBUTION' &&
        (t.scope === 'GLOBAL' || (t.scope === 'EMPLOYEE' && t.employeeId === emp.id))
    );

    let customPreTaxTotal = 0;
    let customPostTaxTotal = 0;
    const customDeductionsSnapshot: any[] = [];

    for (const tpl of applicableTemplates) {
      const tplAmount = tpl.basis === 'PERCENTAGE_BASIC'
        ? Math.round(base * (Number(tpl.amount) / 100) * 100) / 100
        : Math.round(Number(tpl.amount) * 100) / 100;
      if (tpl.taxTreatment === 'PRE_TAX') customPreTaxTotal += tplAmount;
      else customPostTaxTotal += tplAmount;
      customDeductionsSnapshot.push({ name: tpl.name, amount: tplAmount, type: tpl.type, taxTreatment: tpl.taxTreatment, basis: tpl.basis });
    }
    for (const tpl of employerContribTemplates) {
      const tplAmount = tpl.basis === 'PERCENTAGE_BASIC'
        ? Math.round(base * (Number(tpl.amount) / 100) * 100) / 100
        : Math.round(Number(tpl.amount) * 100) / 100;
      customDeductionsSnapshot.push({ name: tpl.name, amount: tplAmount, type: 'EMPLOYER_CONTRIBUTION', taxTreatment: tpl.taxTreatment, basis: tpl.basis });
    }

    const otherDeductions = (adj?.otherDeductions ?? 0) + autoInstallment + customPostTaxTotal;

    const calc = calculateGhanaPayroll({
      grossSalary: base,
      bonus,
      allowances,
      overtime,
      expenseReimbursements: autoExpense,
      loanDeductions: autoInstallment,
      otherDeductions: (adj?.otherDeductions ?? 0) + customPostTaxTotal,
      preTaxDeductions: customPreTaxTotal,
      ssnitRate,
      employerSsnitRate,
      payeBands,
      minimumInsurable: statutoryRule.minimumInsurable == null ? undefined : Number(statutoryRule.minimumInsurable),
      maximumInsurable: statutoryRule.maximumInsurable == null ? undefined : Number(statutoryRule.maximumInsurable),
      bonusYtd: bonusYtdMap.get(emp.id) || 0,
      bonusAnnualThresholdRate: Number((statutoryRule.bonusRules as any)?.annualThresholdRate ?? 0.15),
      bonusFlatRate: Number((statutoryRule.bonusRules as any)?.flatRate ?? 0.05),
      overtimeFlatRate: (statutoryRule.overtimeRules as any)?.flatRate == null ? undefined : Number((statutoryRule.overtimeRules as any).flatRate),
      tier2PensionEnabled,
      tier2PensionRate,
    });

    const item = await prisma.payrollItem.create({
      data: {
        organizationId,
        runId: run.id, employeeId: emp.id,
        baseSalary: base, currency: DEFAULT_CURRENCY, overtime, bonus, allowances, expenseReimbursements: autoExpense, otherDeductions,
        tax: calc.payeTax, ssnit: calc.employeeSSNIT, employerSsnit: calc.employerSSNIT, taxableIncome: calc.taxableIncome, tier2Pension: calc.tier2Pension,
        grossPay: calc.grossPay, netPay: calc.netPay,
        notes: adj?.notes,
        ...(customDeductionsSnapshot.length ? { customDeductionsSnapshot } : {})
      }
    } as any);
    items.push({ ...item, employee: emp });
    totalGross += calc.grossPay;
    totalNet += calc.netPay;
  }

  await prisma.payrollRun.updateMany({
    where: { id: run.id, organizationId },
    data: { totalGross, totalNet }
  });

  // Link expenses and installments to this draft run
  if (pendingExpenses.length > 0) {
    await prisma.expenseClaim.updateMany({
      where: { id: { in: pendingExpenses.map(e => e.id) }, organizationId },
      data: { paidInRunId: run.id }
    });
  }

  // Filter installments to only the ones actually processed
  const processedInstallments = pendingInstallments.filter(i =>
    !employeeIds?.length || employeeIds.includes(i.loan.employeeId)
  );
  if (processedInstallments.length > 0) {
    await prisma.loanInstallment.updateMany({
      where: { id: { in: processedInstallments.map(i => i.id) }, organizationId },
      data: { deductedRunId: run.id }
    });
  }

  return { run, items };
};

export const transitionPayrollRun = async (
  organizationId: string,
  runId: string,
  actorId: string,
  action: 'SUBMIT' | 'HR_APPROVE' | 'HR_REJECT' | 'RELEASE' | 'MD_REJECT' | 'VOID',
  reason?: string,
) => {
  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, organizationId },
    include: { items: { include: { employee: true } } }
  });
  if (!run) throw new Error('Payroll run not found');
  const transitions: Record<string, { from: string[]; status: string; data: any }> = {
    SUBMIT: { from: ['DRAFT', 'REJECTED'], status: 'PENDING_HR', data: { reviewedById: actorId, reviewedAt: new Date(), rejectionReason: null } },
    HR_APPROVE: { from: ['PENDING_HR'], status: 'PENDING_MD', data: { approvedById: actorId, approvedAt: new Date() } },
    HR_REJECT: { from: ['PENDING_HR'], status: 'REJECTED', data: { rejectedById: actorId, rejectedAt: new Date(), rejectionReason: reason || 'Rejected by HR' } },
    MD_REJECT: { from: ['PENDING_MD'], status: 'REJECTED', data: { rejectedById: actorId, rejectedAt: new Date(), rejectionReason: reason || 'Rejected by MD' } },
    RELEASE: { from: ['PENDING_MD'], status: 'RELEASED', data: { mdApprovedById: actorId, mdApprovedAt: new Date(), releasedById: actorId, releasedAt: new Date() } },
    VOID: { from: ['DRAFT', 'PENDING_HR', 'PENDING_MD', 'REJECTED'], status: 'VOIDED', data: { voidedById: actorId, voidedAt: new Date(), rejectionReason: reason || null } },
  };
  const transition = transitions[action];
  if (!transition.from.includes(run.status)) throw new Error(`Cannot ${action} a payroll run in ${run.status} status`);
  const nextStatus = transition.status;
  const snapshot = action === 'RELEASE' ? {
    period: run.period,
    totals: { gross: run.totalGross.toString(), net: run.totalNet.toString() },
    items: run.items.map((item) => ({
      employeeId: item.employeeId, baseSalary: item.baseSalary.toString(), overtime: item.overtime.toString(),
      bonus: item.bonus.toString(), allowances: item.allowances.toString(), expenseReimbursements: item.expenseReimbursements.toString(),
      tax: item.tax.toString(), ssnit: item.ssnit.toString(), employerSsnit: item.employerSsnit.toString(),
      grossPay: item.grossPay.toString(), netPay: item.netPay.toString(),
    })),
  } : null;
  const checksum = snapshot ? crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex') : null;
  const updateData: any = { status: nextStatus, ...transition.data, ...(snapshot ? { calculationSnapshot: snapshot, calculationChecksum: checksum } : {}) };

  await prisma.payrollRun.updateMany({
    where: { id: runId, organizationId },
    data: updateData
  });

  // Only finalize deductions and release payslips after MD release.
  if (nextStatus !== 'RELEASED') {
    return prisma.payrollRun.findFirst({ where: { id: runId, organizationId } }) as any;
  }

  // Finalize auto-deductions
  await prisma.expenseClaim.updateMany({
    where: { paidInRunId: runId, organizationId },
    data: { status: 'PAID' }
  });
  
  // Trigger Enterprise Webhook
  try {
     const { triggerWebhook } = await import('./webhook.service');
     await triggerWebhook(organizationId, 'PAYROLL_RUN_RELEASED', run);
  } catch (err) {
     console.error('Failed to trigger webhook:', err);
  }
  await prisma.loanInstallment.updateMany({
    where: { deductedRunId: runId, organizationId },
    data: { status: 'PAID', paidAt: new Date() }
  });

  for (const item of run.items) {
    const emp = item.employee;
    if (emp.email) {
      await sendPayslipEmail(
        emp.email, emp.fullName, run.period,
        Number(item.netPay).toLocaleString('en-US', { minimumFractionDigits: 2 }),
        item.currency
      ).catch(console.error);
    }
    await notify(emp.id, 'Payslip Ready 💰',
      `Your ${run.period} payslip is ready. Net pay: ${item.currency} ${Number(item.netPay).toLocaleString()}`,
      'SUCCESS', '/payroll'
    );
  }

  const finalRun = await prisma.payrollRun.findFirst({
    where: { id: runId, organizationId },
    include: { items: true }
  });

  return finalRun!;
};

/** @deprecated use transitionPayrollRun with an explicit action */
export const approvePayrollRun = async (organizationId: string, runId: string, approverId: string) => {
  const run = await prisma.payrollRun.findFirst({ where: { id: runId, organizationId } });
  if (!run) throw new Error('Payroll run not found');
  const action = run.status === 'DRAFT' ? 'SUBMIT' : run.status === 'PENDING_HR' ? 'HR_APPROVE' : 'RELEASE';
  return transitionPayrollRun(organizationId, runId, approverId, action);
};

export const voidPayrollRun = async (organizationId: string, runId: string, actorId = '') => {
  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, organizationId }
  });
  if (!run) throw new Error('Not found');
  if (run.status === 'RELEASED') throw new Error('Released payroll is immutable; create a reversal or adjustment run.');

  // Unlink expenses and installments so they can be picked up by the next run
  await prisma.expenseClaim.updateMany({
    where: { paidInRunId: runId, organizationId },
    data: { paidInRunId: null }
  });
  await prisma.loanInstallment.updateMany({
    where: { deductedRunId: runId, organizationId },
    data: { deductedRunId: null }
  });

  return transitionPayrollRun(organizationId, runId, actorId, 'VOID');
};

export const deletePayrollRun = async (organizationId: string, runId: string) => {
  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, organizationId }
  });
  if (!run) throw new Error('Payroll run not found');
  
  // Restricted deletion: Only allow if not paid
  if (run.status !== 'DRAFT') throw new Error('Only DRAFT payroll runs can be deleted. Released runs are immutable.');

  // Unlink expenses and installments so they can be picked up by the next run
  await prisma.expenseClaim.updateMany({
    where: { paidInRunId: runId, organizationId },
    data: { paidInRunId: null }
  });
  await prisma.loanInstallment.updateMany({
    where: { deductedRunId: runId, organizationId },
    data: { deductedRunId: null }
  });

  // Delete all items first (Cascade relation exists but we ensure clean removal)
  await prisma.payrollItem.deleteMany({
    where: { runId, organizationId }
  });

  await prisma.payrollRun.deleteMany({
    where: { id: runId, organizationId }
  });

  return { success: true };
};

export const updatePayrollItem = async (
  organizationId: string,
  itemId: string,
  data: Partial<{ overtime: number; bonus: number; allowances: number; otherDeductions: number; notes: string }>
) => {
  const item = await prisma.payrollItem.findFirst({
    where: { id: itemId, organizationId }
  });
  if (!item) throw new Error('Item not found');

  const run = await prisma.payrollRun.findFirst({
    where: { id: item.runId, organizationId }
  });
  if (run?.status !== 'DRAFT') {
    throw new Error('Can only edit items in a DRAFT run');
  }

  const [org, statutoryRule] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { tier2PensionEnabled: true, tier2PensionRate: true } }),
    getStatutoryRule(organizationId, new Date()),
  ]);
  const ssnitRate = Number(statutoryRule.employeeSsnitRate);
  const employerSsnitRate = Number(statutoryRule.employerSsnitRate);
  const payeBands = statutoryRule.payeBands as any[];
  const tier2PensionEnabled = org?.tier2PensionEnabled ?? false;
  const tier2PensionRate = Number(org?.tier2PensionRate ?? 0.05);

  const base = Number(item.baseSalary);
  const overtime = data.overtime ?? Number(item.overtime);
  const bonus = data.bonus ?? Number(item.bonus);
  const allowances = data.allowances ?? Number(item.allowances);
  const otherDeductions = data.otherDeductions ?? Number(item.otherDeductions);
  const calc = calculateGhanaPayroll({
    grossSalary: base,
    bonus,
    allowances,
    overtime,
    expenseReimbursements: Number(item.expenseReimbursements),
    loanDeductions: otherDeductions,
    otherDeductions: 0,
    ssnitRate,
    employerSsnitRate,
    payeBands,
    minimumInsurable: statutoryRule.minimumInsurable == null ? undefined : Number(statutoryRule.minimumInsurable),
    maximumInsurable: statutoryRule.maximumInsurable == null ? undefined : Number(statutoryRule.maximumInsurable),
    tier2PensionEnabled,
    tier2PensionRate,
  });

  await prisma.payrollItem.updateMany({
    where: { id: itemId, organizationId },
    data: {
      overtime, bonus, allowances, otherDeductions,
      grossPay: calc.grossPay, tax: calc.payeTax,
      ssnit: calc.employeeSSNIT, tier2Pension: calc.tier2Pension,
      employerSsnit: calc.employerSSNIT, taxableIncome: calc.taxableIncome,
      netPay: calc.netPay, notes: data.notes ?? item.notes
    }
  });

  const updated = await prisma.payrollItem.findFirst({ where: { id: itemId, organizationId } });

  // Recalculate run totals
  const allItems = await prisma.payrollItem.findMany({
    where: { runId: item.runId, organizationId }
  });
  const totalGross = allItems.reduce((sum, i) => sum + Number(i.grossPay), 0);
  const totalNet = allItems.reduce((sum, i) => sum + Number(i.netPay), 0);
  await prisma.payrollRun.updateMany({
    where: { id: item.runId, organizationId },
    data: { totalGross, totalNet }
  });

  return updated;
};

export const getPayrollRuns = async (organizationId: string, page = 1, limit = 20) => {
  const [runs, total] = await Promise.all([
    prisma.payrollRun.findMany({
      where: { organizationId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      skip: (page - 1) * limit, take: limit
    }),
    prisma.payrollRun.count({ where: { organizationId } })
  ]);
  return { runs, total, page, pages: Math.ceil(total / limit) };
};

export const getPayrollRunDetail = async (organizationId: string, runId: string) => {
  return prisma.payrollRun.findFirst({
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

export const getMyPayslips = async (organizationId: string, employeeId: string) => {
  return prisma.payrollItem.findMany({
    where: { employeeId, organizationId, run: { status: 'RELEASED' } },
    include: { run: { select: { period: true, status: true, approvedAt: true } } },
    orderBy: { run: { year: 'desc' } }
  });
};

// Multi-currency summary across all paid runs for a given year
export const getPayrollSummaryByYear = async (organizationId: string, year: number) => {
  const items = await prisma.payrollItem.findMany({
    where: {
      organizationId,
      run: { year, status: 'RELEASED' }
    },
    select: { currency: true, grossPay: true, netPay: true, tax: true, ssnit: true, tier2Pension: true }
  });

  const byCurrency: Record<string, { gross: number; net: number; tax: number; ssnit: number; tier2Pension: number; count: number }> = {};
  for (const i of items) {
    if (!byCurrency[i.currency]) byCurrency[i.currency] = { gross: 0, net: 0, tax: 0, ssnit: 0, tier2Pension: 0, count: 0 };
    byCurrency[i.currency].gross += Number(i.grossPay);
    byCurrency[i.currency].net += Number(i.netPay);
    byCurrency[i.currency].tax += Number(i.tax);
    byCurrency[i.currency].ssnit += Number(i.ssnit);
    byCurrency[i.currency].tier2Pension += Number(i.tier2Pension ?? 0);
    byCurrency[i.currency].count++;
  }
  return byCurrency;
};
