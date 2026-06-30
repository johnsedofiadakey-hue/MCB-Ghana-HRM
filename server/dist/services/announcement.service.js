"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const websocket_service_1 = require("./websocket.service");
class AnnouncementService {
    /**
     * Create an announcement
     */
    static async create(organizationId, createdById, data) {
        const { title, content, targetAudience, departmentId, priority, expirationDate } = data;
        if (targetAudience === 'DEPARTMENT') {
            const department = await client_1.default.department.findFirst({
                where: { id: Number(departmentId), organizationId },
                select: { id: true }
            });
            if (!department)
                throw new Error('Target department not found in this organization');
        }
        const announcement = await client_1.default.announcement.create({
            data: {
                organizationId,
                createdById,
                title,
                content,
                targetAudience: targetAudience || 'ALL',
                departmentId: departmentId ? parseInt(departmentId) : null,
                priority: priority || 'NORMAL',
                expirationDate: expirationDate ? new Date(expirationDate) : null,
            },
            include: {
                createdBy: { select: { fullName: true, role: true } },
                department: { select: { name: true } }
            }
        });
        // Notify the target audience
        let targetUserIds = [];
        if (targetAudience === 'ALL') {
            const users = await client_1.default.user.findMany({ where: { organizationId, isArchived: false }, select: { id: true } });
            targetUserIds = users.map(u => u.id);
        }
        else if (targetAudience === 'DEPARTMENT' && departmentId) {
            const users = await client_1.default.user.findMany({ where: { organizationId, departmentId: parseInt(departmentId), isArchived: false }, select: { id: true } });
            targetUserIds = users.map(u => u.id);
        }
        else if (targetAudience === 'MANAGERS') {
            const users = await client_1.default.user.findMany({ where: { organizationId, role: { in: ['MD', 'DIRECTOR', 'MANAGER', 'SUPERVISOR', 'IT_MANAGER', 'HR_OFFICER'] }, isArchived: false }, select: { id: true } });
            targetUserIds = users.map(u => u.id);
        }
        // Bulk notify (via WebSocket)
        for (const uid of targetUserIds) {
            if (uid === createdById)
                continue; // Skip self
            await (0, websocket_service_1.notify)(uid, `📢 ${title}`, content.substring(0, 100), priority === 'URGENT' ? 'WARNING' : 'INFO', '/announcements');
        }
        return announcement;
    }
    /**
     * List announcements for a user based on their role and department
     */
    static async listForUser(organizationId, userId) {
        const user = await client_1.default.user.findFirst({ where: { id: userId, organizationId } });
        if (!user)
            throw new Error('User not found');
        const now = new Date();
        const role = String(user.role || '').toUpperCase();
        const isManager = ['MD', 'DIRECTOR', 'HR_DIRECTOR', 'HR_MANAGER', 'FINANCE_MANAGER', 'MARKETING_HEAD', 'IT_MANAGER', 'MANAGER', 'MID_MANAGER', 'SUPERVISOR', 'DEV'].includes(role);
        const isExecutive = ['MD', 'DIRECTOR', 'HR_DIRECTOR', 'DEV'].includes(role);
        const audiences = [
            { targetAudience: 'ALL' },
            { targetAudience: 'DEPARTMENT', departmentId: user.departmentId },
        ];
        if (isManager)
            audiences.push({ targetAudience: 'MANAGERS' });
        if (isExecutive)
            audiences.push({ targetAudience: 'EXECUTIVES' });
        return client_1.default.announcement.findMany({
            where: {
                organizationId,
                OR: audiences,
                AND: [
                    { OR: [{ expirationDate: null }, { expirationDate: { gte: now } }] }
                ]
            },
            include: {
                createdBy: { select: { fullName: true, role: true, avatarUrl: true } },
                department: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    /**
     * Delete an announcement
     */
    static async delete(id, organizationId, actorId, actorRole) {
        const announcement = await client_1.default.announcement.findFirst({ where: { id, organizationId } });
        if (!announcement)
            throw new Error('Announcement not found');
        // Authorization: Creator or MD/Admin
        if (announcement.createdById !== actorId && actorRole !== 'MD' && actorRole !== 'DEV') {
            throw new Error('Unauthorized to delete this announcement');
        }
        return client_1.default.announcement.delete({ where: { id: announcement.id } });
    }
}
exports.AnnouncementService = AnnouncementService;
