import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';

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
    const rank = req.user?.rank || 0;

    // If MD or HR Manager, see everything open. Otherwise, see subordinates.
    const claims = await prisma.expenseClaim.findMany({
      where: {
        organizationId,
        status: 'PENDING',
        ...(rank < 70 ? { employee: { supervisorId } } : {})
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
