import prisma from '../prisma/client';
import { sendPayslipEmail } from './email.service';
import { notify } from './websocket.service';

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
export const calculateGhanaSSNIT = (grossSalary: number, employeeRate = 0.055, employerRate = 0.13) => {
  const employeeSSNIT = Math.round(grossSalary * employeeRate * 100) / 100;
  const employerSSNIT = Math.round(grossSalary * employerRate * 100) / 100;
  return { employeeSSNIT, employerSSNIT };
};

// ── MASTER CALCULATION (call this per employee per payroll run) ────────────────
export const calculateGhanaPayroll = (params: {
  grossSalary: number; bonus?: number; allowances?: number;
  overtime?: number; loanDeductions?: number; otherDeductions?: number;
  ssnitRate?: number; employerSsnitRate?: number; payeBands?: any[];
}) => {
  const { grossSalary, bonus=0, allowances=0, overtime=0,
          loanDeductions=0, otherDeductions=0, 
          ssnitRate, employerSsnitRate, payeBands } = params;
  const totalGross = grossSalary + bonus + allowances + overtime;
  const { employeeSSNIT, employerSSNIT } = calculateGhanaSSNIT(totalGross, ssnitRate, employerSsnitRate);
  const taxableIncome = Math.max(0, totalGross - employeeSSNIT);
  const payeTax = calculateGhanaPAYE(taxableIncome, payeBands);
  const totalDeductions = employeeSSNIT + payeTax + loanDeductions + otherDeductions;
  const netPay = Math.max(0, Math.round((totalGross - totalDeductions) * 100) / 100);
  return { grossPay: Math.round(totalGross*100)/100, employeeSSNIT,
           employerSSNIT, taxableIncome: Math.round(taxableIncome*100)/100,
           payeTax, loanDeductions, otherDeductions, netPay,
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

  const org = await prisma.organization.findUnique({ 
    where: { id: organizationId },
    select: { ssnitRate: true, employerSsnitRate: true, payeBands: true }
  });
  const ssnitRate = Number(org?.ssnitRate ?? 0.055);
  const employerSsnitRate = Number(org?.employerSsnitRate ?? 0.13);
  const payeBands = typeof org?.payeBands === 'string' ? JSON.parse(org.payeBands) : (org?.payeBands as unknown as any[] || []);

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
    const allowances = (adj?.allowances ?? 0) + autoExpense;
    const otherDeductions = (adj?.otherDeductions ?? 0) + autoInstallment;

    const { employeeSSNIT, payeTax, netPay, grossPay: totalGrossPay } = calculateGhanaPayroll({
      grossSalary: base,
      bonus:          bonus,
      allowances:     allowances,
      overtime:       overtime,
      loanDeductions: autoInstallment,
      otherDeductions:adj?.otherDeductions ?? 0,
      ssnitRate,
      employerSsnitRate,
      payeBands
    });

    const item = await prisma.payrollItem.create({
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

export const approvePayrollRun = async (organizationId: string, runId: string, approverId: string) => {
  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, organizationId },
    include: { items: { include: { employee: true } } }
  });
  if (!run) throw new Error('Payroll run not found');
  if (run.status !== 'DRAFT' && run.status !== 'PENDING_HR' && run.status !== 'PENDING_MD') {
    throw new Error('Run is not in an approvable state');
  }

  // Multi-stage transitions with specific field tracking
  let nextStatus = 'APPROVED';
  let updateData: any = { status: '' };

  if (run.status === 'DRAFT') {
    nextStatus = 'PENDING_HR';
    updateData = { 
        status: nextStatus, 
        reviewedById: approverId, 
        reviewedAt: new Date() 
    };
  } else if (run.status === 'PENDING_HR') {
    nextStatus = 'PENDING_MD';
    updateData = { 
        status: nextStatus, 
        approvedById: approverId, 
        approvedAt: new Date() 
    };
  } else if (run.status === 'PENDING_MD') {
    nextStatus = 'APPROVED';
    updateData = { 
        status: nextStatus, 
        mdApprovedById: approverId, 
        mdApprovedAt: new Date() 
    };
  }

  await prisma.payrollRun.updateMany({
    where: { id: runId, organizationId },
    data: updateData
  });

  // Only finalize deductions and send emails if moving to APPROVED
  if (nextStatus !== 'APPROVED') {
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
     await triggerWebhook(organizationId, 'PAYROLL_RUN_COMPLETED', run);
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

export const voidPayrollRun = async (organizationId: string, runId: string) => {
  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, organizationId }
  });
  if (!run) throw new Error('Not found');
  if (run.status === 'PAID') throw new Error('Cannot void a PAID run');

  // Unlink expenses and installments so they can be picked up by the next run
  await prisma.expenseClaim.updateMany({
    where: { paidInRunId: runId, organizationId },
    data: { paidInRunId: null }
  });
  await prisma.loanInstallment.updateMany({
    where: { deductedRunId: runId, organizationId },
    data: { deductedRunId: null }
  });

  await prisma.payrollRun.updateMany({
    where: { id: runId, organizationId },
    data: { status: 'CANCELLED' }
  });
  
  return prisma.payrollRun.findFirst({ where: { id: runId, organizationId } });
};

export const deletePayrollRun = async (organizationId: string, runId: string) => {
  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, organizationId }
  });
  if (!run) throw new Error('Payroll run not found');
  
  // Restricted deletion: Only allow if not paid
  if (run.status === 'PAID') throw new Error('Cannot delete a finalized (PAID) payroll cycle');

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

  const org = await prisma.organization.findUnique({ 
    where: { id: organizationId },
    select: { ssnitRate: true, employerSsnitRate: true, payeBands: true }
  });
  const ssnitRate = Number(org?.ssnitRate ?? 0.055);
  const employerSsnitRate = Number(org?.employerSsnitRate ?? 0.13);
  const payeBands = typeof org?.payeBands === 'string' ? JSON.parse(org.payeBands) : (org?.payeBands as unknown as any[] || []);

  const base = Number(item.baseSalary);
  const overtime = data.overtime ?? Number(item.overtime);
  const bonus = data.bonus ?? Number(item.bonus);
  const allowances = data.allowances ?? Number(item.allowances);
  const otherDeductions = data.otherDeductions ?? Number(item.otherDeductions);
  const { employeeSSNIT, payeTax, netPay, grossPay: totalGrossPay } = calculateGhanaPayroll({
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

  await prisma.payrollItem.updateMany({
    where: { id: itemId, organizationId },
    data: { overtime, bonus, allowances, otherDeductions, grossPay: totalGrossPay, tax: payeTax, ssnit: employeeSSNIT, netPay, notes: data.notes ?? item.notes }
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
    where: { employeeId, organizationId },
    include: { run: { select: { period: true, status: true, approvedAt: true } } },
    orderBy: { run: { year: 'desc' } }
  });
};

// Multi-currency summary across all paid runs for a given year
export const getPayrollSummaryByYear = async (organizationId: string, year: number) => {
  const items = await prisma.payrollItem.findMany({
    where: {
      organizationId,
      run: { year, status: { in: ['APPROVED', 'PAID'] } }
    },
    select: { currency: true, grossPay: true, netPay: true, tax: true, ssnit: true }
  });

  const byCurrency: Record<string, { gross: number; net: number; tax: number; ssnit: number; count: number }> = {};
  for (const i of items) {
    if (!byCurrency[i.currency]) byCurrency[i.currency] = { gross: 0, net: 0, tax: 0, ssnit: 0, count: 0 };
    byCurrency[i.currency].gross += Number(i.grossPay);
    byCurrency[i.currency].net += Number(i.netPay);
    byCurrency[i.currency].tax += Number(i.tax);
    byCurrency[i.currency].ssnit += Number(i.ssnit);
    byCurrency[i.currency].count++;
  }
  return byCurrency;
};
