"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePromotionStatus = exports.createPromotionRequest = exports.listPromotionRequests = exports.getProbationStats = exports.updateProbationRecord = exports.createProbationRecord = exports.listProbationRecords = exports.getPolicyAcknowledgments = exports.acknowledgePolicy = exports.deletePolicy = exports.updatePolicy = exports.createPolicy = exports.listPolicies = exports.deleteDisciplinaryCase = exports.updateDisciplinaryCase = exports.createDisciplinaryCase = exports.listDisciplinaryCases = void 0;
const client_1 = __importDefault(require("../prisma/client"));
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
        const { status, outcome, resolvedAt, acknowledgedAt, hearingDate } = req.body;
        const updated = await client_1.default.disciplinaryCase.update({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updateDisciplinaryCase = updateDisciplinaryCase;
const deleteDisciplinaryCase = async (req, res) => {
    try {
        const { id } = req.params;
        await client_1.default.disciplinaryCase.delete({ where: { id } });
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
        const policies = await client_1.default.policyDocument.findMany({
            where: {
                organizationId: orgId,
                ...(status ? { status: status } : {}),
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
        res.json(policies);
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
        const policy = await client_1.default.policyDocument.update({ where: { id }, data });
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
        await client_1.default.policyDocument.delete({ where: { id } });
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
        const ack = await client_1.default.policyAcknowledgment.upsert({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.acknowledgePolicy = acknowledgePolicy;
const getPolicyAcknowledgments = async (req, res) => {
    try {
        const { id } = req.params;
        const acks = await client_1.default.policyAcknowledgment.findMany({
            where: { policyId: id },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true, profilePhoto: true } },
            },
            orderBy: { acknowledgedAt: 'desc' },
        });
        const policy = await client_1.default.policyDocument.findUnique({ where: { id } });
        const totalEmployees = await client_1.default.user.count({
            where: { organizationId: policy?.organizationId, isArchived: false, status: 'ACTIVE' },
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
        const updated = await client_1.default.probationRecord.update({ where: { id }, data });
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
        res.json(requests);
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
        const request = await client_1.default.promotionRequest.create({
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
        const request = await client_1.default.promotionRequest.update({
            where: { id },
            data: { status, hrComment },
        });
        // If approved, update the employee's role/jobTitle/salary
        if (status === 'APPROVED') {
            const updateData = {
                role: request.targetRole,
                jobTitle: request.targetJobTitle || undefined,
                salary: request.proposedSalary ? Number(request.proposedSalary) : undefined,
            };
            await client_1.default.user.update({
                where: { id: request.employeeId },
                data: updateData
            });
            // Log history
            await client_1.default.employeeHistory.create({
                data: {
                    organizationId: orgId,
                    employeeId: request.employeeId,
                    loggedById: req.user.id,
                    title: 'Promotion Approved',
                    description: `Professional promotion approved to ${request.targetJobTitle || request.targetRole}.`,
                    type: 'PROMOTION',
                    severity: 'SUCCESS'
                }
            });
        }
        res.json(request);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updatePromotionStatus = updatePromotionStatus;
