import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';
import { PolicyService } from '../services/policy.service';
import { Permission } from '../types/permissions';

/**
 * EXPENSE & REIMBURSEMENT CONTROLLER
 */

export const createExpenseClaim = async (req: Request, res: Response) => {
  try {
    const { title, category, amount, currency, description, receiptUrl } = req.body;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const employeeId = req.user?.id!;

    const claim = await prisma.expenseClaim.create({
      data: {
        organizationId,
        employeeId,
        title: title || 'Expense Claim',
        category: category || 'OTHER',
        amount,
        currency: currency || 'GHS',
        description,
        receiptUrl,
        status: 'PENDING'
      }
    });

    await logAction(employeeId, 'CREATE_EXPENSE_CLAIM', 'ExpenseClaim', claim.id, { amount, currency }, req.ip);
    
    // Notify Direct Supervisor or HR
    const user = await prisma.user.findUnique({ where: { id: employeeId }, select: { supervisorId: true, fullName: true } });
    if (user?.supervisorId) {
      await notify(user.supervisorId, 'New Expense Claim 💰', `${user.fullName} submitted a claim for ${currency} ${amount}`, 'INFO', '/expenses/approvals');
    }

    res.status(201).json(claim);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getMyExpenses = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.id!;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';

    const claims = await prisma.expenseClaim.findMany({
      where: { employeeId, organizationId },
      orderBy: { submittedAt: 'desc' }
    });

    res.json(claims);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const supervisorId = req.user?.id!;
    const financeAccess = await PolicyService.evaluatePolicy(supervisorId, Permission.EXPENSE_MANAGE);

    // Finance operations can review the organization queue. Other managers see
    // only claims submitted by their direct reports.
    const claims = await prisma.expenseClaim.findMany({
      where: {
        organizationId,
        status: 'PENDING',
        ...(financeAccess.allowed ? {} : { employee: { supervisorId } })
      },
      include: {
        employee: { select: { fullName: true, departmentObj: { select: { name: true } } } }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json(claims);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const approveExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approvedById = req.user?.id!;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const financeAccess = await PolicyService.evaluatePolicy(approvedById, Permission.EXPENSE_MANAGE);

    const existing = await prisma.expenseClaim.findFirst({
      where: { id, organizationId, status: 'PENDING' },
      include: { employee: { select: { supervisorId: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Pending expense claim not found' });
    if (!financeAccess.allowed && existing.employee.supervisorId !== approvedById) {
      return res.status(403).json({ error: 'Only the employee\'s supervisor or Finance may approve this claim' });
    }

    const claim = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date()
      }
    });

    await logAction(approvedById, 'APPROVE_EXPENSE', 'ExpenseClaim', id, {}, req.ip);
    await notify(claim.employeeId, 'Expense Approved ✅', `Your expense claim for ${claim.amount} has been approved.`, 'SUCCESS', '/expenses');

    res.json(claim);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const rejectExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const rejectedById = req.user?.id!;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const financeAccess = await PolicyService.evaluatePolicy(rejectedById, Permission.EXPENSE_MANAGE);

    if (!reason || String(reason).trim().length < 3) {
      return res.status(400).json({ error: 'A rejection reason is required' });
    }
    const existing = await prisma.expenseClaim.findFirst({
      where: { id, organizationId, status: 'PENDING' },
      include: { employee: { select: { supervisorId: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Pending expense claim not found' });
    if (!financeAccess.allowed && existing.employee.supervisorId !== rejectedById) {
      return res.status(403).json({ error: 'Only the employee\'s supervisor or Finance may reject this claim' });
    }

    const claim = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason
      }
    });

    await logAction(rejectedById, 'REJECT_EXPENSE', 'ExpenseClaim', id, { reason }, req.ip);
    await notify(claim.employeeId, 'Expense Rejected ❌', `Your expense claim for ${claim.amount} was rejected. Reason: ${reason}`, 'ERROR', '/expenses');

    res.json(claim);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
