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
        const job = await client_1.default.jobPosition.update({
            where: { id },
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
        const organizationId = req.body.organizationId || 'mcb-ghana-tenant'; // Public apply might not have req.user
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
            where: { role: { in: ['MD', 'DIRECTOR', 'HR_OFFICER', 'IT_MANAGER'] } },
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
        const candidate = await client_1.default.candidate.update({
            where: { id },
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
        const interview = await client_1.default.interviewStage.create({
            data: {
                organizationId,
                candidateId,
                stage,
                scheduledAt: new Date(scheduledAt),
                interviewerId
            }
        });
        // Update candidate status
        await client_1.default.candidate.update({
            where: { id: candidateId },
            data: { status: 'INTERVIEW_SCHEDULED' }
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
