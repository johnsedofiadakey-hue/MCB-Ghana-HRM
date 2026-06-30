"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePromotionStatus = exports.createPromotionRequest = exports.listPromotionRequests = exports.getProbationStats = exports.updateProbationRecord = exports.createProbationRecord = exports.listProbationRecords = exports.getPolicyAcknowledgments = exports.acknowledgePolicy = exports.deletePolicy = exports.updatePolicy = exports.createPolicy = exports.listPolicies = exports.deleteDisciplinaryCase = exports.updateDisciplinaryCase = exports.createDisciplinaryCase = exports.listDisciplinaryCases = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const policy_service_1 = require("../services/policy.service");
const permissions_1 = require("../types/permissions");
const roles_1 = require("../types/roles");
const getOrgId = (req) => req.user?.organizationId || 'mcb-ghana-tenant';
const getUser = (req) => req.user;
// ─────────────────────────────────────────────────────────────────────────────
// DISCIPLINARY & GRIEVANCE
// ─────────────────────────────────────────────────────────────────────────────
const listDisciplinaryCases = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { employeeId, status, type } = req.query;
        const cases = await client_1.default.disciplinaryCase.findMany({
            where: {
                organizationId: orgId,
                ...(employeeId ? { employeeId: employeeId } : {}),
                ...(status ? { status: status } : {}),
                ...(type ? { type: type } : {}),
            },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true, profilePhoto: true, avatarUrl: true } },
                issuedBy: { select: { id: true, fullName: true, jobTitle: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(cases);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.listDisciplinaryCases = listDisciplinaryCases;
const createDisciplinaryCase = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const user = getUser(req);
        const { employeeId, type, category, reason, details, evidence, hearingDate } = req.body;
        if (!employeeId || !type || !reason) {
            return res.status(400).json({ error: 'employeeId, type, and reason are required' });
        }
        const employee = await client_1.default.user.findFirst({ where: { id: employeeId, organizationId: orgId }, select: { id: true } });
        if (!employee)
            return res.status(404).json({ error: 'Employee not found in this organization' });
        const newCase = await client_1.default.disciplinaryCase.create({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.createDisciplinaryCase = createDisciplinaryCase;
const updateDisciplinaryCase = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const { status, outcome, resolvedAt, acknowledgedAt, hearingDate } = req.body;
        const existing = await client_1.default.disciplinaryCase.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
        if (!existing)
            return res.status(404).json({ error: 'Disciplinary case not found' });
        const updated = await client_1.default.disciplinaryCase.update({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updateDisciplinaryCase = updateDisciplinaryCase;
const deleteDisciplinaryCase = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const deleted = await client_1.default.disciplinaryCase.deleteMany({ where: { id, organizationId: orgId } });
        if (!deleted.count)
            return res.status(404).json({ error: 'Disciplinary case not found' });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteDisciplinaryCase = deleteDisciplinaryCase;
// ─────────────────────────────────────────────────────────────────────────────
// POLICY LIBRARY
// ─────────────────────────────────────────────────────────────────────────────
const listPolicies = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const user = getUser(req);
        const { category, status } = req.query;
        const canManage = (await policy_service_1.PolicyService.evaluatePolicy(user.id, permissions_1.Permission.EMPLOYEE_WRITE)).allowed;
        const policies = await client_1.default.policyDocument.findMany({
            where: {
                organizationId: orgId,
                ...(canManage && status ? { status: status } : !canManage ? { status: 'PUBLISHED' } : {}),
                ...(category ? { category: category } : {}),
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
            if (!policy.targetRoles)
                return true;
            try {
                const roles = JSON.parse(policy.targetRoles);
                return !Array.isArray(roles) || roles.length === 0 || roles.includes(user.role);
            }
            catch {
                return true;
            }
        });
        res.json(visible);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.listPolicies = listPolicies;
const createPolicy = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const user = getUser(req);
        const { title, description, content, fileUrl, category, version, isRequired, targetRoles } = req.body;
        if (!title)
            return res.status(400).json({ error: 'Title is required' });
        const policy = await client_1.default.policyDocument.create({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.createPolicy = createPolicy;
const updatePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const { title, description, content, fileUrl, category, version, isRequired, status, targetRoles } = req.body;
        const data = {};
        if (title !== undefined)
            data.title = title;
        if (description !== undefined)
            data.description = description;
        if (content !== undefined)
            data.content = content;
        if (fileUrl !== undefined)
            data.fileUrl = fileUrl;
        if (category !== undefined)
            data.category = category;
        if (version !== undefined)
            data.version = version;
        if (isRequired !== undefined)
            data.isRequired = isRequired;
        if (targetRoles !== undefined)
            data.targetRoles = JSON.stringify(targetRoles);
        if (status !== undefined) {
            data.status = status;
            if (status === 'PUBLISHED')
                data.publishedAt = new Date();
        }
        const existing = await client_1.default.policyDocument.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
        if (!existing)
            return res.status(404).json({ error: 'Policy not found' });
        const policy = await client_1.default.policyDocument.update({ where: { id: existing.id }, data });
        res.json(policy);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updatePolicy = updatePolicy;
const deletePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const deleted = await client_1.default.policyDocument.deleteMany({ where: { id, organizationId: orgId } });
        if (!deleted.count)
            return res.status(404).json({ error: 'Policy not found' });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deletePolicy = deletePolicy;
const acknowledgePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const user = getUser(req);
        const ipAddress = req.ip;
        const policy = await client_1.default.policyDocument.findFirst({ where: { id, organizationId: orgId, status: 'PUBLISHED' }, select: { id: true } });
        if (!policy)
            return res.status(404).json({ error: 'Published policy not found' });
        const ack = await client_1.default.policyAcknowledgment.upsert({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.acknowledgePolicy = acknowledgePolicy;
const getPolicyAcknowledgments = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const policy = await client_1.default.policyDocument.findFirst({ where: { id, organizationId: orgId }, select: { id: true, organizationId: true } });
        if (!policy)
            return res.status(404).json({ error: 'Policy not found' });
        const acks = await client_1.default.policyAcknowledgment.findMany({
            where: { policyId: policy.id, organizationId: orgId },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true, profilePhoto: true } },
            },
            orderBy: { acknowledgedAt: 'desc' },
        });
        const totalEmployees = await client_1.default.user.count({
            where: { organizationId: policy.organizationId, isArchived: false, status: 'ACTIVE' },
        });
        res.json({ acknowledgments: acks, totalEmployees, acknowledged: acks.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getPolicyAcknowledgments = getPolicyAcknowledgments;
// ─────────────────────────────────────────────────────────────────────────────
// PROBATION TRACKER
// ─────────────────────────────────────────────────────────────────────────────
const listProbationRecords = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { status } = req.query;
        const now = new Date();
        const records = await client_1.default.probationRecord.findMany({
            where: {
                organizationId: orgId,
                ...(status ? { status: status } : {}),
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.listProbationRecords = listProbationRecords;
const createProbationRecord = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { employeeId, startDate, period, goals, notes, reviewDate } = req.body;
        if (!employeeId || !startDate) {
            return res.status(400).json({ error: 'employeeId and startDate are required' });
        }
        const employee = await client_1.default.user.findFirst({ where: { id: employeeId, organizationId: orgId }, select: { id: true } });
        if (!employee)
            return res.status(404).json({ error: 'Employee not found in this organization' });
        const probationDays = period || 90;
        const start = new Date(startDate);
        const endDate = new Date(start);
        endDate.setDate(endDate.getDate() + probationDays);
        const record = await client_1.default.probationRecord.create({
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
    }
    catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'This employee already has an active probation record' });
        }
        res.status(500).json({ error: err.message });
    }
};
exports.createProbationRecord = createProbationRecord;
const updateProbationRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const user = getUser(req);
        const { status, outcome, reviewDate, goals, notes, endDate } = req.body;
        const data = {};
        if (status !== undefined)
            data.status = status;
        if (outcome !== undefined)
            data.outcome = outcome;
        if (reviewDate !== undefined)
            data.reviewDate = reviewDate ? new Date(reviewDate) : null;
        if (goals !== undefined)
            data.goals = JSON.stringify(goals);
        if (notes !== undefined)
            data.notes = notes;
        if (endDate !== undefined)
            data.endDate = new Date(endDate);
        if (status && status !== 'IN_PROGRESS')
            data.reviewedById = user.id;
        const existing = await client_1.default.probationRecord.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
        if (!existing)
            return res.status(404).json({ error: 'Probation record not found' });
        const updated = await client_1.default.probationRecord.update({ where: { id: existing.id }, data });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updateProbationRecord = updateProbationRecord;
const getProbationStats = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const now = new Date();
        const in14Days = new Date();
        in14Days.setDate(in14Days.getDate() + 14);
        const [total, inProgress, expiringSoon, passed, failed] = await Promise.all([
            client_1.default.probationRecord.count({ where: { organizationId: orgId } }),
            client_1.default.probationRecord.count({ where: { organizationId: orgId, status: 'IN_PROGRESS' } }),
            client_1.default.probationRecord.count({
                where: {
                    organizationId: orgId,
                    status: 'IN_PROGRESS',
                    endDate: { lte: in14Days, gte: now },
                },
            }),
            client_1.default.probationRecord.count({ where: { organizationId: orgId, status: 'PASSED' } }),
            client_1.default.probationRecord.count({ where: { organizationId: orgId, status: 'FAILED' } }),
        ]);
        res.json({ total, inProgress, expiringSoon, passed, failed });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getProbationStats = getProbationStats;
// ─────────────────────────────────────────────────────────────────────────────
// PROMOTION REQUESTS
// ─────────────────────────────────────────────────────────────────────────────
const listPromotionRequests = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { employeeId, status } = req.query;
        const requests = await client_1.default.promotionRequest.findMany({
            where: {
                organizationId: orgId,
                ...(employeeId ? { employeeId: employeeId } : {}),
                ...(status ? { status: status } : {}),
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.listPromotionRequests = listPromotionRequests;
const createPromotionRequest = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const user = getUser(req);
        const { employeeId, targetRole, targetJobTitle, proposedSalary, reason } = req.body;
        if (!employeeId || !targetRole || !reason) {
            return res.status(400).json({ error: 'employeeId, targetRole, and reason are required' });
        }
        const normalizedTargetRole = String(targetRole).toUpperCase().replace(/\s+/g, '_');
        const targetRank = roles_1.ROLE_RANK_MAP[normalizedTargetRole];
        const actorRole = String(user.role || '').toUpperCase().replace(/\s+/g, '_');
        const actorRank = roles_1.ROLE_RANK_MAP[actorRole] || 0;
        if (!targetRank)
            return res.status(400).json({ error: 'Invalid target role' });
        if (actorRole !== 'DEV' && targetRank >= actorRank) {
            return res.status(403).json({ error: 'You cannot approve a promotion to your own role level or above' });
        }
        const employee = await client_1.default.user.findFirst({ where: { id: employeeId, organizationId: orgId }, select: { id: true } });
        if (!employee)
            return res.status(404).json({ error: 'Employee not found in this organization' });
        const request = await client_1.default.promotionRequest.create({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.createPromotionRequest = createPromotionRequest;
const updatePromotionStatus = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { id } = req.params;
        const { status, hrComment } = req.body;
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const existing = await client_1.default.promotionRequest.findFirst({ where: { id, organizationId: orgId } });
        if (!existing)
            return res.status(404).json({ error: 'Promotion request not found' });
        const request = await client_1.default.$transaction(async (tx) => {
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
                if (!employee)
                    throw new Error('Promotion employee not found in this organization');
                const updateData = {
                    role: updated.targetRole,
                    rank: roles_1.ROLE_RANK_MAP[String(updated.targetRole || '').toUpperCase()] || undefined,
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
                            authorizedById: req.user.id,
                        }
                    });
                }
                await tx.employeeHistory.create({
                    data: {
                        organizationId: orgId,
                        employeeId: updated.employeeId,
                        loggedById: req.user.id,
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updatePromotionStatus = updatePromotionStatus;
