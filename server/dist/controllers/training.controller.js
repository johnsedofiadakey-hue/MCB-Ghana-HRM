"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportTrainingCSV = exports.getMyTraining = exports.markComplete = exports.enroll = exports.createProgram = exports.getPrograms = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
const websocket_service_1 = require("../services/websocket.service");
const enterprise_controller_1 = require("./enterprise.controller");
const isHrTrainingAdmin = (role) => ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'MD', 'DEV'].includes(String(role || '').toUpperCase());
const getPrograms = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const programs = await client_1.default.trainingProgram.findMany({
            where: whereOrg,
            include: { enrollments: { select: { id: true, status: true, completedAt: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(programs);
    }
    catch (err) {
        console.error('[training.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getPrograms = getPrograms;
const createProgram = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = req.user;
        const createdById = user.id;
        const program = await client_1.default.trainingProgram.create({
            data: {
                ...req.body,
                createdById,
                organizationId,
                startDate: req.body.startDate ? new Date(req.body.startDate) : null,
                endDate: req.body.endDate ? new Date(req.body.endDate) : null
            }
        });
        res.status(201).json(program);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
};
exports.createProgram = createProgram;
const enroll = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = req.user;
        const actorId = user.id;
        const { programId, employeeId } = req.body;
        const targetEmpId = employeeId || actorId;
        if (targetEmpId !== actorId && !isHrTrainingAdmin(user.role)) {
            return res.status(403).json({ error: 'Only HR may enroll another employee' });
        }
        const [program, employee] = await Promise.all([
            client_1.default.trainingProgram.findFirst({ where: { id: programId, organizationId }, select: { id: true, title: true } }),
            client_1.default.user.findFirst({ where: { id: targetEmpId, organizationId, status: { not: 'TERMINATED' } }, select: { id: true } }),
        ]);
        if (!program)
            return res.status(404).json({ error: 'Training program not found' });
        if (!employee)
            return res.status(404).json({ error: 'Employee not found in this organization' });
        const enrollment = await client_1.default.trainingEnrollment.create({
            data: { programId, employeeId: targetEmpId, organizationId }
        });
        await (0, websocket_service_1.notify)(targetEmpId, 'Training Enrollment', `You have been enrolled in "${program.title}"`, 'INFO', '/training');
        await (0, audit_service_1.logAction)(actorId, 'TRAINING_ENROLLED', 'TrainingEnrollment', enrollment.id, { programId, employeeId: targetEmpId }, req.ip);
        res.status(201).json(enrollment);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
};
exports.enroll = enroll;
const markComplete = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const { enrollmentId, score, certificate } = req.body;
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const actor = req.user;
        const existing = await client_1.default.trainingEnrollment.findFirst({
            where: { id: enrollmentId, ...whereOrg },
            select: { id: true, employeeId: true }
        });
        if (!existing)
            return res.status(404).json({ error: 'Training enrollment not found' });
        if (existing.employeeId !== actor.id && !isHrTrainingAdmin(actor.role)) {
            return res.status(403).json({ error: 'You may only complete your own training enrollment' });
        }
        const normalizedScore = score === undefined ? undefined : Math.min(100, Math.max(0, Number(score)));
        if (normalizedScore !== undefined && !Number.isFinite(normalizedScore)) {
            return res.status(400).json({ error: 'Score must be a number from 0 to 100' });
        }
        const enrollment = await client_1.default.trainingEnrollment.update({
            where: { id: existing.id },
            data: { status: 'COMPLETED', completedAt: new Date(), score: normalizedScore, certificate },
            include: { program: true }
        });
        // --- INTEGRATION: Update KPI progress if applicable ---
        try {
            // Find an active KPI sheet for this employee
            const activeSheet = await client_1.default.kpiSheet.findFirst({
                where: {
                    employeeId: enrollment.employeeId,
                    organizationId: enrollment.organizationId,
                    status: 'ACTIVE',
                    isLocked: false
                }
            });
            if (activeSheet) {
                // Look for items in 'Development' or 'Training' category
                const kpiItem = await client_1.default.kpiItem.findFirst({
                    where: {
                        sheetId: activeSheet.id,
                        category: { in: ['Development', 'Training', 'Learning'] }
                    }
                });
                if (kpiItem) {
                    // Increment actual value
                    const actualValue = Number(kpiItem.actualValue) || 0;
                    const targetValue = Number(kpiItem.targetValue) || 0;
                    const weight = Number(kpiItem.weight) || 0;
                    const newActual = actualValue + 1;
                    const raw = targetValue > 0 ? (newActual / targetValue) * weight : 0;
                    const newScore = Math.min(raw, weight * 1.2);
                    await client_1.default.kpiItem.update({
                        where: { id: kpiItem.id },
                        data: {
                            actualValue: newActual,
                            score: newScore,
                            lastEntryDate: new Date()
                        }
                    });
                    // Update sheet total score
                    const allItems = await client_1.default.kpiItem.findMany({ where: { sheetId: activeSheet.id } });
                    const total = allItems.reduce((s, i) => s + (Number(i.score) || 0), 0);
                    await client_1.default.kpiSheet.update({
                        where: { id: activeSheet.id },
                        data: { totalScore: total }
                    });
                    await (0, websocket_service_1.notify)(enrollment.employeeId, '🎯 KPI Auto-Updated', `Your completion of "${enrollment.program.title}" has been added to your KPI progress.`, 'SUCCESS');
                }
            }
        }
        catch (kpiErr) {
            console.error('[training.controller] KPI Auto-update failed but training marked complete:', kpiErr);
        }
        await (0, websocket_service_1.notify)(enrollment.employeeId, 'Training Completed! 🎓', 'Congratulations on completing your training.', 'SUCCESS');
        res.json(enrollment);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
};
exports.markComplete = markComplete;
const getMyTraining = async (req, res) => {
    try {
        const user = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const userId = user.id;
        const enrollments = await client_1.default.trainingEnrollment.findMany({
            where: { employeeId: userId, ...whereOrg },
            include: { program: true },
            orderBy: { enrolledAt: 'desc' },
            take: 50
        });
        res.json(enrollments);
    }
    catch (err) {
        console.error('[training.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getMyTraining = getMyTraining;
const exportTrainingCSV = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const programs = await client_1.default.trainingProgram.findMany({
            where: whereOrg,
            include: {
                enrollments: {
                    include: { employee: { select: { fullName: true, jobTitle: true } } }
                }
            }
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="training-report.csv"');
        let csv = 'Program,Provider,Status,Employee,Enrolled Date,Completed Date,Score\n';
        programs.forEach(p => {
            p.enrollments.forEach(e => {
                csv += `"${p.title}","${p.provider || ''}","${e.status}","${e.employee.fullName}","${e.enrolledAt.toLocaleDateString()}","${e.completedAt?.toLocaleDateString() || ''}","${e.score || ''}"\n`;
            });
        });
        res.send(csv);
    }
    catch (err) {
        console.error('[training.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.exportTrainingCSV = exportTrainingCSV;
