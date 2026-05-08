"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOffboarding = exports.getOffboardingDetails = exports.trackAssetReturn = exports.updateExitInterview = exports.completeClearanceTask = exports.completeOffboarding = exports.getOffboardingList = exports.initiateOffboarding = exports.createTemplate = exports.getTemplates = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
const websocket_service_1 = require("../services/websocket.service");
/**
 * EXIT & SEPARATION (OFFBOARDING) CONTROLLER
 */
// ─── Templates (Admin) ────────────────────────────────────────────────────
const getTemplates = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const templates = await client_1.default.offboardingTemplate.findMany({
            where: { organizationId },
            include: { tasks: { orderBy: { order: 'asc' } } }
        });
        res.json(templates);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getTemplates = getTemplates;
const createTemplate = async (req, res) => {
    try {
        const { name, description, tasks } = req.body;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const template = await client_1.default.offboardingTemplate.create({
            data: {
                organizationId,
                name, description,
                tasks: { create: tasks?.map((t, i) => ({ ...t, organizationId, order: i })) || [] }
            },
            include: { tasks: true }
        });
        res.status(201).json(template);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
};
exports.createTemplate = createTemplate;
const initiateOffboarding = async (req, res) => {
    try {
        const { employeeId, effectiveDate, reason, templateId } = req.body;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const triggeredById = req.user?.id;
        let template = null;
        if (templateId) {
            template = await client_1.default.offboardingTemplate.findUnique({
                where: { id: templateId },
                include: { tasks: { orderBy: { order: 'asc' } } }
            });
        }
        const process = await client_1.default.offboardingProcess.create({
            data: {
                organizationId,
                employeeId,
                triggeredById,
                templateId,
                effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
                status: 'INITIATED',
                items: {
                    create: template?.tasks.map(task => ({
                        organizationId,
                        title: task.title,
                        category: task.category,
                        isRequired: task.isRequired,
                        dueDate: effectiveDate ? new Date(effectiveDate) : new Date()
                    })) || []
                }
            },
            include: { items: true }
        });
        // Create exit interview placeholder
        await client_1.default.exitInterview.create({
            data: {
                organizationId,
                offboardingId: process.id,
                reason
            }
        });
        await (0, audit_service_1.logAction)(triggeredById, 'INITIATE_OFFBOARDING', 'User', employeeId, { processId: process.id }, req.ip);
        await (0, websocket_service_1.notify)(employeeId, 'Offboarding Commenced 🚪', `Your offboarding process has been initiated, effective ${effectiveDate || 'soon'}.`, 'WARNING', '/offboarding');
        res.status(201).json(process);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.initiateOffboarding = initiateOffboarding;
const getOffboardingList = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const list = await client_1.default.offboardingProcess.findMany({
            where: { organizationId },
            include: {
                employee: { select: { fullName: true, employeeCode: true, jobTitle: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(list);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getOffboardingList = getOffboardingList;
const completeOffboarding = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        // Verify all mandatory clearance items are done
        const processCheck = await client_1.default.offboardingProcess.findUnique({
            where: { id },
            include: { items: true }
        });
        const pendingRequired = processCheck?.items.filter(i => i.isRequired && !i.completedAt);
        if (pendingRequired && pendingRequired.length > 0) {
            return res.status(400).json({
                error: 'Cannot complete offboarding. Mandatory clearance items are still pending.',
                pendingTasks: pendingRequired.map(t => t.title)
            });
        }
        const process = await client_1.default.offboardingProcess.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                accountDisabledAt: new Date()
            }
        });
        // Deactivate user account
        await client_1.default.user.update({
            where: { id: process.employeeId },
            data: { status: 'TERMINATED' }
        });
        await (0, audit_service_1.logAction)(req.user?.id, 'COMPLETE_OFFBOARDING', 'User', process.employeeId, { processId: id }, req.ip);
        res.json(process);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.completeOffboarding = completeOffboarding;
const completeClearanceTask = async (req, res) => {
    try {
        const { itemId, notes } = req.body;
        // @ts-ignore
        const userId = req.user?.id;
        const item = await client_1.default.offboardingItem.update({
            where: { id: itemId },
            data: {
                completedAt: new Date(),
                completedBy: userId,
                notes
            }
        });
        res.json(item);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
};
exports.completeClearanceTask = completeClearanceTask;
const updateExitInterview = async (req, res) => {
    try {
        const { offboardingId } = req.params;
        const { interviewerId, interviewDate, feedback, rehireEligible } = req.body;
        const interview = await client_1.default.exitInterview.updateMany({
            where: { offboardingId },
            data: {
                interviewerId,
                interviewDate: interviewDate ? new Date(interviewDate) : null,
                feedback,
                rehireEligible
            }
        });
        res.json(interview);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.updateExitInterview = updateExitInterview;
const trackAssetReturn = async (req, res) => {
    try {
        const { offboardingId, assetId, conditionNotes } = req.body;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const returnRecord = await client_1.default.assetReturn.create({
            data: {
                organizationId,
                offboardingId,
                assetId,
                returned: true,
                returnedAt: new Date(),
                conditionNotes
            }
        });
        res.status(201).json(returnRecord);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.trackAssetReturn = trackAssetReturn;
const getOffboardingDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const process = await client_1.default.offboardingProcess.findUnique({
            where: { id },
            include: {
                employee: { select: { fullName: true, employeeCode: true, jobTitle: true, departmentObj: { select: { name: true } } } },
                exitInterviews: { include: { interviewer: { select: { fullName: true } } } },
                assetReturns: true,
                items: { orderBy: { title: 'asc' } }
            }
        });
        if (!process)
            return res.status(404).json({ error: 'Process not found' });
        res.json(process);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getOffboardingDetails = getOffboardingDetails;
/**
 * DELETE OFFBOARDING PROCESS (MD ONLY)
 */
const deleteOffboarding = async (req, res) => {
    try {
        const { id } = req.params;
        const actorId = req.user?.id;
        const rank = req.user?.rank || 0;
        if (rank < 90) {
            return res.status(403).json({ error: 'Unauthorized: Only the Managing Director can delete exit processes' });
        }
        const process = await client_1.default.offboardingProcess.findUnique({ where: { id } });
        if (!process)
            return res.status(404).json({ error: 'Process not found' });
        // Delete associated relations manually since schema might not have cascade
        await Promise.all([
            client_1.default.offboardingItem.deleteMany({ where: { offboardingId: id } }),
            client_1.default.exitInterview.deleteMany({ where: { offboardingId: id } }),
            client_1.default.assetReturn.deleteMany({ where: { offboardingId: id } })
        ]);
        await client_1.default.offboardingProcess.delete({ where: { id } });
        await (0, audit_service_1.logAction)(actorId, 'DELETE_OFFBOARDING_PROCESS', 'User', process.employeeId, { processId: id }, req.ip);
        res.json({ success: true, message: 'Offboarding process and associated data deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.deleteOffboarding = deleteOffboarding;
