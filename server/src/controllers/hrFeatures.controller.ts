import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { PolicyService } from '../services/policy.service';
import { Permission } from '../types/permissions';
import { ROLE_RANK_MAP } from '../types/roles';

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
        const employee = await prisma.user.findFirst({ where: { id: employeeId, organizationId: orgId }, select: { id: true } });
        if (!employee) return res.status(404).json({ error: 'Employee not found in this organization' });

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
        const orgId = getOrgId(req);
        const { status, outcome, resolvedAt, acknowledgedAt, hearingDate } = req.body;

        const existing = await prisma.disciplinaryCase.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
        if (!existing) return res.status(404).json({ error: 'Disciplinary case not found' });
        const updated = await prisma.disciplinaryCase.update({
            where: { id: existing.id },
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
        const orgId = getOrgId(req);
        const deleted = await prisma.disciplinaryCase.deleteMany({ where: { id, organizationId: orgId } });
        if (!deleted.count) return res.status(404).json({ error: 'Disciplinary case not found' });
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
        const canManage = (await PolicyService.evaluatePolicy(user.id, Permission.EMPLOYEE_WRITE)).allowed;

        const policies = await prisma.policyDocument.findMany({
            where: {
                organizationId: orgId,
                ...(canManage && status ? { status: status as string } : !canManage ? { status: 'PUBLISHED' } : {}),
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

        const visible = canManage ? policies : policies.filter((policy) => {
            if (!policy.targetRoles) return true;
            try {
                const roles = JSON.parse(policy.targetRoles);
                return !Array.isArray(roles) || roles.length === 0 || roles.includes(user.role);
            } catch {
                return true;
            }
        });
        res.json(visible);
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
        const orgId = getOrgId(req);
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

        const existing = await prisma.policyDocument.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
        if (!existing) return res.status(404).json({ error: 'Policy not found' });
        const policy = await prisma.policyDocument.update({ where: { id: existing.id }, data });
        res.json(policy);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const deletePolicy = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const deleted = await prisma.policyDocument.deleteMany({ where: { id, organizationId: orgId } });
        if (!deleted.count) return res.status(404).json({ error: 'Policy not found' });
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
        const policy = await prisma.policyDocument.findFirst({ where: { id, organizationId: orgId, status: 'PUBLISHED' }, select: { id: true } });
        if (!policy) return res.status(404).json({ error: 'Published policy not found' });

        const ack = await prisma.policyAcknowledgment.upsert({
            where: { policyId_employeeId: { policyId: policy.id, employeeId: user.id } },
            create: {
                organizationId: orgId,
                policyId: policy.id,
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
        const orgId = getOrgId(req);
        const policy = await prisma.policyDocument.findFirst({ where: { id, organizationId: orgId }, select: { id: true, organizationId: true } });
        if (!policy) return res.status(404).json({ error: 'Policy not found' });

        const acks = await prisma.policyAcknowledgment.findMany({
            where: { policyId: policy.id, organizationId: orgId },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true, profilePhoto: true } },
            },
            orderBy: { acknowledgedAt: 'desc' },
        });

        const totalEmployees = await prisma.user.count({
            where: { organizationId: policy.organizationId, isArchived: false, status: 'ACTIVE' },
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
        const employee = await prisma.user.findFirst({ where: { id: employeeId, organizationId: orgId }, select: { id: true } });
        if (!employee) return res.status(404).json({ error: 'Employee not found in this organization' });

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
        const orgId = getOrgId(req);
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

        const existing = await prisma.probationRecord.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
        if (!existing) return res.status(404).json({ error: 'Probation record not found' });
        const updated = await prisma.probationRecord.update({ where: { id: existing.id }, data });
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

        const serialized = requests.map(r => ({
            ...r,
            proposedSalary: r.proposedSalary ? Number(r.proposedSalary) : null
        }));

        res.json(serialized);
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
        const normalizedTargetRole = String(targetRole).toUpperCase().replace(/\s+/g, '_');
        const targetRank = ROLE_RANK_MAP[normalizedTargetRole];
        const actorRole = String(user.role || '').toUpperCase().replace(/\s+/g, '_');
        const actorRank = ROLE_RANK_MAP[actorRole] || 0;
        if (!targetRank) return res.status(400).json({ error: 'Invalid target role' });
        if (actorRole !== 'DEV' && targetRank >= actorRank) {
            return res.status(403).json({ error: 'You cannot approve a promotion to your own role level or above' });
        }
        const employee = await prisma.user.findFirst({ where: { id: employeeId, organizationId: orgId }, select: { id: true } });
        if (!employee) return res.status(404).json({ error: 'Employee not found in this organization' });

        const request = await prisma.promotionRequest.create({
            data: {
                organizationId: orgId,
                employeeId,
                managerId: user.id,
                targetRole: normalizedTargetRole,
                targetJobTitle,
                proposedSalary: proposedSalary ? Number(proposedSalary) : null,
                reason,
            },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true } },
                manager: { select: { id: true, fullName: true } },
            },
        });

        res.status(201).json({
            ...request,
            proposedSalary: request.proposedSalary ? Number(request.proposedSalary) : null
        });
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

        const existing = await prisma.promotionRequest.findFirst({ where: { id, organizationId: orgId } });
        if (!existing) return res.status(404).json({ error: 'Promotion request not found' });

        const request = await prisma.$transaction(async (tx) => {
            const updated = await tx.promotionRequest.update({
                where: { id: existing.id },
                data: { status, hrComment },
            });

            // If approved, update the employee's role/jobTitle/salary
            if (status === 'APPROVED') {
                const employee = await tx.user.findFirst({
                    where: { id: updated.employeeId, organizationId: orgId },
                    select: { id: true, salary: true, currency: true }
                });
                if (!employee) throw new Error('Promotion employee not found in this organization');
                const updateData: any = {
                    role: updated.targetRole,
                    rank: ROLE_RANK_MAP[String(updated.targetRole || '').toUpperCase()] || undefined,
                    jobTitle: updated.targetJobTitle || undefined,
                    salary: updated.proposedSalary ? Number(updated.proposedSalary) : undefined,
                };

                await tx.user.update({ where: { id: employee.id }, data: updateData });

                if (updated.proposedSalary !== null) {
                    await tx.compensationHistory.create({
                        data: {
                            organizationId: orgId,
                            employeeId: updated.employeeId,
                            type: 'PROMOTION',
                            previousSalary: employee.salary || 0,
                            newSalary: updated.proposedSalary,
                            currency: employee.currency || 'GHS',
                            reason: updated.reason,
                            effectiveDate: new Date(),
                            authorizedById: (req as any).user.id,
                        }
                    });
                }

                await tx.employeeHistory.create({
                    data: {
                        organizationId: orgId,
                        employeeId: updated.employeeId,
                        loggedById: (req as any).user.id,
                        title: 'Promotion Approved',
                        description: `Professional promotion approved to ${updated.targetJobTitle || updated.targetRole}.`,
                        type: 'PROMOTION',
                        severity: 'SUCCESS'
                    }
                });
            }
            return updated;
        });

        res.json(request);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
