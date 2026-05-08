import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const requestLoan = async (req: Request, res: Response) => {
    try {
        const { employeeId, type, principalAmount, monthsDuration, purpose } = req.body;
        const loan = await prisma.loan.create({
            data: {
                employeeId,
                type: type || 'ADVANCE',
                principalAmount: Number(principalAmount),
                totalRepayment: Number(principalAmount), // Zero interest for now
                installmentAmount: Number(principalAmount) / Number(monthsDuration),
                monthsDuration: Number(monthsDuration),
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
        const loans = await prisma.loan.findMany({
            where: { employeeId: (req as any).user.id },
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
        const loans = await prisma.loan.findMany({
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
        const adminId = (req as any).user.id;

        const loan = await prisma.loan.findUnique({ where: { id } });
        if (!loan) return res.status(404).json({ error: 'Loan not found' });

        // Create installments
        const installmentsData: any[] = [];
        const date = new Date();
        for (let i = 1; i <= loan.monthsDuration; i++) {
            date.setMonth(date.getMonth() + 1);
            installmentsData.push({
                loanId: loan.id,
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
        const adminId = (req as any).user.id;
        const loan = await prisma.loan.update({
            where: { id },
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
        const { employeeId, title, description, amount, category } = req.body;
        const expense = await prisma.expenseClaim.create({
            data: {
                employeeId,
                title,
                description,
                amount: Number(amount),
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
        const expenses = await prisma.expenseClaim.findMany({
            where: { employeeId: (req as any).user.id },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(expenses);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllExpenses = async (req: Request, res: Response) => {
    try {
        const expenses = await prisma.expenseClaim.findMany({
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
        const adminId = (req as any).user.id;

        const expense = await prisma.expenseClaim.update({
            where: { id },
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
        const adminId = (req as any).user.id;
        const expense = await prisma.expenseClaim.update({
            where: { id },
            data: { status: 'REJECTED', approvedById: adminId, approvedAt: new Date() }
        });
        res.json(expense);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};
