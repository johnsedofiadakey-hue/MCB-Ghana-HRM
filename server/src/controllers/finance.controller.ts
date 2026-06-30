import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const requestLoan = async (req: Request, res: Response) => {
    try {
        const { type, principalAmount, monthsDuration, purpose } = req.body;
        const employeeId = req.user?.id!;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const amount = Number(principalAmount);
        const duration = Number(monthsDuration);
        if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(duration) || duration < 1 || duration > 24) {
            return res.status(400).json({ error: 'Enter a positive amount and a repayment duration from 1 to 24 months' });
        }
        const loan = await prisma.loan.create({
            data: {
                organizationId,
                employeeId,
                type: type || 'ADVANCE',
                principalAmount: amount,
                totalRepayment: amount, // Zero interest for now
                installmentAmount: amount / duration,
                monthsDuration: duration,
                purpose
            }
        });
        res.status(201).json(loan);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const getMyLoans = async (req: Request, res: Response) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const loans = await prisma.loan.findMany({
            where: { employeeId: req.user?.id!, organizationId },
            include: { installments: true },
            orderBy: { requestedAt: 'desc' }
        });
        res.json(loans);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllLoans = async (req: Request, res: Response) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const loans = await prisma.loan.findMany({
            where: { organizationId },
            include: { employee: { select: { fullName: true, email: true, departmentObj: true } } },
            orderBy: { requestedAt: 'desc' }
        });
        res.json(loans);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const approveLoan = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id!;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';

        const loan = await prisma.loan.findFirst({ where: { id, organizationId, status: 'PENDING' } });
        if (!loan) return res.status(404).json({ error: 'Loan not found' });

        // Create installments
        const installmentsData: any[] = [];
        const date = new Date();
        for (let i = 1; i <= loan.monthsDuration; i++) {
            date.setMonth(date.getMonth() + 1);
            installmentsData.push({
                loanId: loan.id,
                organizationId,
                amount: loan.installmentAmount,
                month: date.getMonth() + 1,
                year: date.getFullYear()
            });
        }

        const updatedLoan = await prisma.$transaction([
            prisma.loan.update({
                where: { id },
                data: { status: 'APPROVED', approvedById: adminId, approvedAt: new Date() }
            }),
            prisma.loanInstallment.createMany({ data: installmentsData })
        ]);

        res.json(updatedLoan[0]);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const rejectLoan = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id!;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const existing = await prisma.loan.findFirst({ where: { id, organizationId, status: 'PENDING' }, select: { id: true } });
        if (!existing) return res.status(404).json({ error: 'Pending loan not found' });
        const loan = await prisma.loan.update({
            where: { id: existing.id },
            data: { status: 'REJECTED', approvedById: adminId, approvedAt: new Date() }
        });
        res.json(loan);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

// --- EXPENSES ---
export const submitExpense = async (req: Request, res: Response) => {
    try {
        const { title, description, amount, category } = req.body;
        const employeeId = req.user?.id!;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: 'Expense amount must be positive' });
        }
        const expense = await prisma.expenseClaim.create({
            data: {
                organizationId,
                employeeId,
                title,
                description,
                amount: numericAmount,
                category
            }
        });
        res.status(201).json(expense);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const getMyExpenses = async (req: Request, res: Response) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const expenses = await prisma.expenseClaim.findMany({
            where: { employeeId: req.user?.id!, organizationId },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(expenses);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllExpenses = async (req: Request, res: Response) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const expenses = await prisma.expenseClaim.findMany({
            where: { organizationId },
            include: { employee: { select: { fullName: true, email: true, departmentObj: true } } },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(expenses);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const approveExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id!;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';

        const existing = await prisma.expenseClaim.findFirst({ where: { id, organizationId, status: 'PENDING' }, select: { id: true } });
        if (!existing) return res.status(404).json({ error: 'Pending expense not found' });
        const expense = await prisma.expenseClaim.update({
            where: { id: existing.id },
            data: { status: 'APPROVED', approvedById: adminId, approvedAt: new Date() }
        });
        res.json(expense);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const rejectExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id!;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const existing = await prisma.expenseClaim.findFirst({ where: { id, organizationId, status: 'PENDING' }, select: { id: true } });
        if (!existing) return res.status(404).json({ error: 'Pending expense not found' });
        const expense = await prisma.expenseClaim.update({
            where: { id: existing.id },
            data: { status: 'REJECTED', approvedById: adminId, approvedAt: new Date() }
        });
        res.json(expense);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};
