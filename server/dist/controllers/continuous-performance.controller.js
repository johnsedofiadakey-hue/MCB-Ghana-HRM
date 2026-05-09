"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContinuousPerformanceController = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const enterprise_controller_1 = require("./enterprise.controller");
const websocket_service_1 = require("../services/websocket.service");
class ContinuousPerformanceController {
    // --- CHECK-INS ---
    static async scheduleCheckIn(req, res) {
        try {
            const { employeeId, scheduledAt } = req.body;
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const organizationId = orgId || 'mcb-ghana-tenant';
            const user = req.user;
            const managerId = user.id;
            if (!employeeId || !scheduledAt) {
                return res.status(400).json({ error: 'employeeId and scheduledAt are required' });
            }
            const checkIn = await client_1.default.checkIn.create({
                data: {
                    organizationId,
                    employeeId,
                    managerId,
                    scheduledAt: new Date(scheduledAt),
                },
            });
            await (0, websocket_service_1.notify)(employeeId, '📅 Check-In Scheduled', `Your manager has scheduled a check-in on ${new Date(scheduledAt).toLocaleString()}`, 'INFO', '/performance');
            return res.status(201).json(checkIn);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async completeCheckIn(req, res) {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const whereOrg = orgId ? { organizationId: orgId } : {};
            const checkIn = await client_1.default.checkIn.updateMany({
                where: { id, ...whereOrg },
                data: {
                    completedAt: new Date(),
                    notes,
                },
            });
            return res.json({ success: true, checkIn });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getCheckIns(req, res) {
        try {
            const user = req.user;
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const whereOrg = orgId ? { organizationId: orgId } : {};
            const checkIns = await client_1.default.checkIn.findMany({
                where: {
                    ...whereOrg,
                    OR: [
                        { employeeId: user.id },
                        { managerId: user.id },
                    ],
                },
                include: {
                    employee: { select: { fullName: true, avatarUrl: true } },
                    manager: { select: { fullName: true, avatarUrl: true } },
                },
                orderBy: { scheduledAt: 'desc' },
            });
            return res.json(checkIns);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    // --- 360 FEEDBACK ---
    static async submitFeedback(req, res) {
        try {
            const { receiverId, content, rating } = req.body;
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const organizationId = orgId || 'mcb-ghana-tenant';
            const user = req.user;
            const providerId = user.id;
            if (!receiverId || !content) {
                return res.status(400).json({ error: 'receiverId and content are required' });
            }
            const feedback = await client_1.default.feedback360.create({
                data: {
                    organizationId,
                    providerId,
                    receiverId,
                    content,
                    rating: rating ? parseInt(rating) : null,
                },
            });
            await (0, websocket_service_1.notify)(receiverId, '💬 New 360 Feedback', `You have received new feedback from a colleague.`, 'INFO', '/performance');
            return res.status(201).json(feedback);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getFeedback(req, res) {
        try {
            const user = req.user;
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const whereOrg = orgId ? { organizationId: orgId } : {};
            const feedback = await client_1.default.feedback360.findMany({
                where: {
                    ...whereOrg,
                    OR: [
                        { receiverId: user.id },
                        { providerId: user.id },
                    ],
                },
                include: {
                    provider: { select: { fullName: true, avatarUrl: true } },
                    receiver: { select: { fullName: true, avatarUrl: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
            return res.json(feedback);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.ContinuousPerformanceController = ContinuousPerformanceController;
