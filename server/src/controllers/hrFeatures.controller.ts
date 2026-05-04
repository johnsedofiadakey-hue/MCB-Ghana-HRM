import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getOrgId = (req: Request): string =>
    (req as any).user?.organizationId || 'mcb-ghana-tenant';

const getUser = (req: Request) => (req as any).user;

// ─────────────────────────────────────────────────────────────────────────────
// DISCIPLINARY & GRIEVANCE
// ─────────────────────────────────────────────────────────────────────────────

export const listDisciplinaryCases = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const { employeeId, status, type } = req.query;

        const cases = await prisma.disciplinaryCase.findMany({
            where: {
                organizationId: orgId,
                ...(employeeId ? { employeeId: employeeId as string } : {}),
                ...(status ? { status: status as string } : {}),
                ...(type ? { type: type as string } : {}),
            },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true, profilePhoto: true, avatarUrl: true } },
                issuedBy: { select: { id: true, fullName: true, jobTitle: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(cases);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const createDisciplinaryCase = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const user = getUser(req);
        const { employeeId, type, category, reason, details, evidence, hearingDate } = req.body;

        if (!employeeId || !type || !reason) {
            return res.status(400).json({ error: 'employeeId, type, and reason are required' });
        }

        const newCase = await prisma.disciplinaryCase.create({
            data: {
                organizationId: orgId,
                employeeId,
                issuedById: user.id,
                type,
                category: category || 'CONDUCT',
                reason,
                details: details || null,
                evidence: evidence || null,
                hearingDate: hearingDate ? new Date(hearingDate) : null,
            },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true } },
                issuedBy: { select: { id: true, fullName: true } },
            },
        });

        res.status(201).json(newCase);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const updateDisciplinaryCase = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, outcome, resolvedAt, acknowledgedAt, hearingDate } = req.body;

        const updated = await prisma.disciplinaryCase.update({
            where: { id },
            data: {
                ...(status !== undefined ? { status } : {}),
                ...(outcome !== undefined ? { outcome } : {}),
                ...(resolvedAt !== undefined ? { resolvedAt: resolvedAt ? new Date(resolvedAt) : null } : {}),
                ...(acknowledgedAt !== undefined ? { acknowledgedAt: acknowledgedAt ? new Date(acknowledgedAt) : null } : {}),
                ...(hearingDate !== undefined ? { hearingDate: hearingDate ? new Date(hearingDate) : null } : {}),
            },
        });

        res.json(updated);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteDisciplinaryCase = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.disciplinaryCase.delete({ where: { id } });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POLICY LIBRARY
// ─────────────────────────────────────────────────────────────────────────────

export const listPolicies = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const user = getUser(req);
        const { category, status } = req.query;

        const policies = await prisma.policyDocument.findMany({
            where: {
                organizationId: orgId,
                ...(status ? { status: status as string } : {}),
                ...(category ? { category: category as string } : {}),
            },
            include: {
                createdBy: { select: { id: true, fullName: true } },
                acknowledgments: {
                    where: { employeeId: user.id },
                    select: { id: true, acknowledgedAt: true },
                },
                _count: { select: { acknowledgments: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });

        res.json(policies);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const createPolicy = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const user = getUser(req);
        const { title, description, content, fileUrl, category, version, isRequired, targetRoles } = req.body;

        if (!title) return res.status(400).json({ error: 'Title is required' });

        const policy = await prisma.policyDocument.create({
            data: {
                organizationId: orgId,
                title,
                description: description || null,
                content: content || null,
                fileUrl: fileUrl || null,
                category: category || 'GENERAL',
                version: version || '1.0',
                isRequired: isRequired !== false,
                targetRoles: targetRoles ? JSON.stringify(targetRoles) : null,
                createdById: user.id,
            },
            include: { createdBy: { select: { id: true, fullName: true } } },
        });

        res.status(201).json(policy);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const updatePolicy = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, content, fileUrl, category, version, isRequired, status, targetRoles } = req.body;

        const data: any = {};
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (content !== undefined) data.content = content;
        if (fileUrl !== undefined) data.fileUrl = fileUrl;
        if (category !== undefined) data.category = category;
        if (version !== undefined) data.version = version;
        if (isRequired !== undefined) data.isRequired = isRequired;
        if (targetRoles !== undefined) data.targetRoles = JSON.stringify(targetRoles);
        if (status !== undefined) {
            data.status = status;
            if (status === 'PUBLISHED') data.publishedAt = new Date();
        }

        const policy = await prisma.policyDocument.update({ where: { id }, data });
        res.json(policy);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const deletePolicy = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.policyDocument.delete({ where: { id } });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const acknowledgePolicy = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const user = getUser(req);
        const ipAddress = req.ip;

        const ack = await prisma.policyAcknowledgment.upsert({
            where: { policyId_employeeId: { policyId: id, employeeId: user.id } },
            create: {
                organizationId: orgId,
                policyId: id,
                employeeId: user.id,
                ipAddress,
            },
            update: { acknowledgedAt: new Date(), ipAddress },
        });

        res.json(ack);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getPolicyAcknowledgments = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const acks = await prisma.policyAcknowledgment.findMany({
            where: { policyId: id },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true, profilePhoto: true } },
            },
            orderBy: { acknowledgedAt: 'desc' },
        });

        const policy = await prisma.policyDocument.findUnique({ where: { id } });
        const totalEmployees = await prisma.user.count({
            where: { organizationId: policy?.organizationId, isArchived: false, status: 'ACTIVE' },
        });

        res.json({ acknowledgments: acks, totalEmployees, acknowledged: acks.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PROBATION TRACKER
// ─────────────────────────────────────────────────────────────────────────────

export const listProbationRecords = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const { status } = req.query;
        const now = new Date();

        const records = await prisma.probationRecord.findMany({
            where: {
                organizationId: orgId,
                ...(status ? { status: status as string } : {}),
            },
            include: {
                employee: {
                    select: {
                        id: true, fullName: true, jobTitle: true, profilePhoto: true,
                        avatarUrl: true, joinDate: true,
                        departmentObj: { select: { name: true } },
                    },
                },
                reviewedBy: { select: { id: true, fullName: true } },
            },
            orderBy: { endDate: 'asc' },
        });

        // Annotate each with daysLeft
        const annotated = records.map(r => ({
            ...r,
            daysLeft: Math.ceil((new Date(r.endDate).getTime() - now.getTime()) / 86400000),
        }));

        res.json(annotated);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const createProbationRecord = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const { employeeId, startDate, period, goals, notes, reviewDate } = req.body;

        if (!employeeId || !startDate) {
            return res.status(400).json({ error: 'employeeId and startDate are required' });
        }

        const probationDays = period || 90;
        const start = new Date(startDate);
        const endDate = new Date(start);
        endDate.setDate(endDate.getDate() + probationDays);

        const record = await prisma.probationRecord.create({
            data: {
                organizationId: orgId,
                employeeId,
                startDate: start,
                endDate,
                period: probationDays,
                goals: goals ? JSON.stringify(goals) : null,
                notes: notes || null,
                reviewDate: reviewDate ? new Date(reviewDate) : null,
            },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true } },
            },
        });

        res.status(201).json(record);
    } catch (err: any) {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'This employee already has an active probation record' });
        }
        res.status(500).json({ error: err.message });
    }
};

export const updateProbationRecord = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = getUser(req);
        const { status, outcome, reviewDate, goals, notes, endDate } = req.body;

        const data: any = {};
        if (status !== undefined) data.status = status;
        if (outcome !== undefined) data.outcome = outcome;
        if (reviewDate !== undefined) data.reviewDate = reviewDate ? new Date(reviewDate) : null;
        if (goals !== undefined) data.goals = JSON.stringify(goals);
        if (notes !== undefined) data.notes = notes;
        if (endDate !== undefined) data.endDate = new Date(endDate);
        if (status && status !== 'IN_PROGRESS') data.reviewedById = user.id;

        const updated = await prisma.probationRecord.update({ where: { id }, data });
        res.json(updated);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getProbationStats = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const now = new Date();
        const in14Days = new Date();
        in14Days.setDate(in14Days.getDate() + 14);

        const [total, inProgress, expiringSoon, passed, failed] = await Promise.all([
            prisma.probationRecord.count({ where: { organizationId: orgId } }),
            prisma.probationRecord.count({ where: { organizationId: orgId, status: 'IN_PROGRESS' } }),
            prisma.probationRecord.count({
                where: {
                    organizationId: orgId,
                    status: 'IN_PROGRESS',
                    endDate: { lte: in14Days, gte: now },
                },
            }),
            prisma.probationRecord.count({ where: { organizationId: orgId, status: 'PASSED' } }),
            prisma.probationRecord.count({ where: { organizationId: orgId, status: 'FAILED' } }),
        ]);

        res.json({ total, inProgress, expiringSoon, passed, failed });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
// ─────────────────────────────────────────────────────────────────────────────
// PROMOTION REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

export const listPromotionRequests = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const { employeeId, status } = req.query;

        const requests = await prisma.promotionRequest.findMany({
            where: {
                organizationId: orgId,
                ...(employeeId ? { employeeId: employeeId as string } : {}),
                ...(status ? { status: status as string } : {}),
            },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true } },
                manager: { select: { id: true, fullName: true, jobTitle: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(requests);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const createPromotionRequest = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const user = getUser(req);
        const { employeeId, targetRole, targetJobTitle, proposedSalary, reason } = req.body;

        if (!employeeId || !targetRole || !reason) {
            return res.status(400).json({ error: 'employeeId, targetRole, and reason are required' });
        }

        const request = await prisma.promotionRequest.create({
            data: {
                organizationId: orgId,
                employeeId,
                managerId: user.id,
                targetRole,
                targetJobTitle,
                proposedSalary: proposedSalary ? Number(proposedSalary) : null,
                reason,
            },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true } },
                manager: { select: { id: true, fullName: true } },
            },
        });

        res.status(201).json(request);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const updatePromotionStatus = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const { id } = req.params;
        const { status, hrComment } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const request = await prisma.promotionRequest.update({
            where: { id },
            data: { status, hrComment },
        });

        // If approved, update the employee's role/jobTitle/salary
        if (status === 'APPROVED') {
            const updateData: any = {
                role: request.targetRole,
                jobTitle: request.targetJobTitle || undefined,
                salary: request.proposedSalary ? Number(request.proposedSalary) : undefined,
            };

            await prisma.user.update({
                where: { id: request.employeeId },
                data: updateData
            });

            // Log history
            await prisma.employeeHistory.create({
                data: {
                    organizationId: orgId,
                    employeeId: request.employeeId,
                    title: 'Promotion Approved',
                    description: `Promoted to ${request.targetJobTitle || request.targetRole}.`,
                    type: 'PROMOTION',
                    severity: 'INFO'
                }
            });
        }

        res.json(request);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
