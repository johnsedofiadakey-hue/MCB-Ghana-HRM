"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitInterviewFeedback = exports.scheduleInterview = exports.updateCandidateStatus = exports.getCandidates = exports.applyForJob = exports.updateJobPosition = exports.getJobPositions = exports.createJobPosition = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
const websocket_service_1 = require("../services/websocket.service");
/**
 * RECRUITMENT & ATS CONTROLLER
 * Handles Job Postings, Candidate Applications, and Interview Pipelines.
 */
// ─── JOB POSITIONS ────────────────────────────────────────────────────────
const createJobPosition = async (req, res) => {
    try {
        const { title, departmentId, description, location, employmentType } = req.body;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const job = await client_1.default.jobPosition.create({
            data: {
                organizationId,
                title,
                departmentId: departmentId ? parseInt(departmentId) : null,
                description,
                location,
                employmentType,
                status: 'OPEN',
                openedById: req.user?.id
            }
        });
        await (0, audit_service_1.logAction)(req.user?.id, 'CREATE_JOB_POSITION', 'JobPosition', job.id, { title }, req.ip);
        res.status(201).json(job);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.createJobPosition = createJobPosition;
const getJobPositions = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const { status } = req.query;
        const jobs = await client_1.default.jobPosition.findMany({
            where: {
                organizationId,
                ...(status ? { status: status } : {})
            },
            include: {
                _count: {
                    select: { candidates: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(jobs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getJobPositions = getJobPositions;
const updateJobPosition = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const data = req.body;
        const existing = await client_1.default.jobPosition.findFirst({ where: { id, organizationId }, select: { id: true } });
        if (!existing)
            return res.status(404).json({ error: 'Job position not found' });
        const job = await client_1.default.jobPosition.update({
            where: { id: existing.id },
            data
        });
        res.json(job);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.updateJobPosition = updateJobPosition;
// ─── CANDIDATES & APPLICATIONS ───────────────────────────────────────────
const applyForJob = async (req, res) => {
    try {
        const { jobPositionId, fullName, email, phone, resumeUrl, source, notes } = req.body;
        const job = await client_1.default.jobPosition.findFirst({
            where: { id: jobPositionId, status: 'OPEN' },
            select: { id: true, organizationId: true }
        });
        if (!job)
            return res.status(404).json({ error: 'Open job position not found' });
        const organizationId = job.organizationId;
        const candidate = await client_1.default.candidate.create({
            data: {
                organizationId,
                jobPositionId,
                fullName,
                email,
                phone,
                resumeUrl,
                source,
                notes,
                status: 'APPLIED'
            }
        });
        // Notify HR/MD
        const admins = await client_1.default.user.findMany({
            where: {
                organizationId,
                role: { in: ['MD', 'HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN'] },
                status: { not: 'TERMINATED' }
            },
            select: { id: true }
        });
        for (const admin of admins) {
            await (0, websocket_service_1.notify)(admin.id, 'New Applicant 📄', `New application from ${fullName} for a position.`, 'INFO', `/recruitment/candidates/${candidate.id}`);
        }
        res.status(201).json(candidate);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.applyForJob = applyForJob;
const getCandidates = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const { jobPositionId, status } = req.query;
        const candidates = await client_1.default.candidate.findMany({
            where: {
                organizationId,
                ...(jobPositionId ? { jobPositionId: jobPositionId } : {}),
                ...(status ? { status: status } : {})
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(candidates);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getCandidates = getCandidates;
const updateCandidateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const existing = await client_1.default.candidate.findFirst({ where: { id, organizationId }, select: { id: true } });
        if (!existing)
            return res.status(404).json({ error: 'Candidate not found' });
        const candidate = await client_1.default.candidate.update({
            where: { id: existing.id },
            data: { status, notes }
        });
        res.json(candidate);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.updateCandidateStatus = updateCandidateStatus;
// ─── INTERVIEWS & STAGES ────────────────────────────────────────────────
const scheduleInterview = async (req, res) => {
    try {
        const { candidateId, stage, scheduledAt, interviewerId } = req.body;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const [candidate, interviewer] = await Promise.all([
            client_1.default.candidate.findFirst({ where: { id: candidateId, organizationId }, select: { id: true } }),
            interviewerId
                ? client_1.default.user.findFirst({ where: { id: interviewerId, organizationId, status: { not: 'TERMINATED' } }, select: { id: true } })
                : Promise.resolve(null),
        ]);
        if (!candidate)
            return res.status(404).json({ error: 'Candidate not found' });
        if (interviewerId && !interviewer)
            return res.status(404).json({ error: 'Interviewer not found in this organization' });
        const interview = await client_1.default.$transaction(async (tx) => {
            const created = await tx.interviewStage.create({
                data: {
                    organizationId,
                    candidateId,
                    stage,
                    scheduledAt: new Date(scheduledAt),
                    interviewerId
                }
            });
            await tx.candidate.update({
                where: { id: candidate.id },
                data: { status: 'INTERVIEW_SCHEDULED' }
            });
            return created;
        });
        if (interviewerId) {
            await (0, websocket_service_1.notify)(interviewerId, 'New Interview Assigned 📅', `You have been scheduled to interview a candidate for ${stage}.`, 'INFO', '/recruitment/interviews');
        }
        res.status(201).json(interview);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.scheduleInterview = scheduleInterview;
const submitInterviewFeedback = async (req, res) => {
    try {
        const { candidateId, interviewStageId, rating, feedback, recommendation } = req.body;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const reviewerId = req.user?.id;
        const [candidate, interviewStage] = await Promise.all([
            client_1.default.candidate.findFirst({ where: { id: candidateId, organizationId }, select: { id: true } }),
            interviewStageId
                ? client_1.default.interviewStage.findFirst({ where: { id: interviewStageId, candidateId, organizationId }, select: { id: true, interviewerId: true } })
                : Promise.resolve(null),
        ]);
        if (!candidate)
            return res.status(404).json({ error: 'Candidate not found' });
        if (interviewStageId && !interviewStage)
            return res.status(404).json({ error: 'Interview stage not found' });
        const isHrReviewer = ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'MD', 'DEV'].includes(String(req.user?.role || '').toUpperCase());
        if (!interviewStage && !isHrReviewer) {
            return res.status(403).json({ error: 'An interview stage assignment is required to submit feedback' });
        }
        if (interviewStage && interviewStage.interviewerId !== reviewerId && !isHrReviewer) {
            return res.status(403).json({ error: 'Only the assigned interviewer or HR may submit feedback' });
        }
        const entry = await client_1.default.interviewFeedback.create({
            data: {
                organizationId,
                candidateId,
                interviewStageId,
                reviewerId,
                rating,
                feedback,
                recommendation
            }
        });
        res.status(201).json(entry);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.submitInterviewFeedback = submitInterviewFeedback;
