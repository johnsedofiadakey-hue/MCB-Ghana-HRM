"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboxService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const auth_middleware_1 = require("../middleware/auth.middleware");
class InboxService {
    static async getActions(organizationId, userId) {
        const actions = [];
        // 1. Targets (Assignee Acknowledge)
        try {
            const pendingTargets = await client_1.default.target.findMany({
                where: { organizationId, assigneeId: userId, status: 'ASSIGNED' }
            });
            pendingTargets.forEach(t => {
                actions.push({
                    id: `target-ack-${t.id}`,
                    type: 'TARGET_ACK',
                    title: 'Target Acknowledgement Required',
                    subtitle: `Please acknowledge: ${t.title || 'New Target'}`,
                    priority: 'MEDIUM',
                    link: '/kpi/my-targets',
                    createdAt: t.createdAt
                });
            });
        }
        catch (e) {
            console.error('[InboxService] Target fetch error:', e);
        }
        // 2. Appraisal Packets
        try {
            const appraisalPackets = await client_1.default.appraisalPacket.findMany({
                where: { organizationId, status: 'OPEN' }, // Status is OPEN for active packets
                include: { employee: true, cycle: true }
            });
            appraisalPackets.forEach(p => {
                let isReviewer = false;
                if (p.currentStage === 'SUPERVISOR_REVIEW' && p.employee.supervisorId === userId)
                    isReviewer = true;
                if (p.currentStage === 'MANAGER' && p.managerId === userId)
                    isReviewer = true;
                // p for AppraisalPacket has hrReviewerId stored
                if (p.currentStage === 'HR' && p.hrReviewerId === userId)
                    isReviewer = true;
                if (isReviewer) {
                    actions.push({
                        id: `appraisal-${p.id}`,
                        type: 'APPRAISAL_REVIEW',
                        title: 'Appraisal Review Required',
                        subtitle: `Review for ${p.employee?.fullName || 'Staff Member'} (${p.currentStage} stage)`,
                        priority: 'HIGH',
                        link: `/reviews/packet/${p.id}`,
                        createdAt: p.updatedAt
                    });
                }
            });
        }
        catch (e) {
            console.error('[InboxService] Appraisal fetch error:', e);
        }
        // 3. Leave Requests
        try {
            const leaveRequests = await client_1.default.leaveRequest.findMany({
                where: {
                    organizationId,
                    status: { in: ['SUBMITTED', 'MANAGER_REVIEW', 'HR_REVIEW', 'MD_REVIEW'] }
                },
                include: { employee: true }
            });
            const user = await client_1.default.user.findUnique({ where: { id: userId }, select: { role: true } });
            const userRank = (0, auth_middleware_1.getRoleRank)(user?.role || 'STAFF');
            leaveRequests.forEach(l => {
                // 3a. Relief Request (Targeted to reliever)
                if (l.status === 'SUBMITTED' && l.relieverId === userId) {
                    actions.push({
                        id: `leave-relief-${l.id}`,
                        type: 'LEAVE_RELIEF',
                        title: 'Relief Request',
                        subtitle: `${l.employee?.fullName || 'Staff Member'} requested you as a reliever.`,
                        priority: 'MEDIUM',
                        link: '/leave',
                        createdAt: l.createdAt
                    });
                }
                // 3b. Manager Review (Targeted to supervisor OR Department Manager)
                const isManagerAction = l.status === 'MANAGER_REVIEW' && (l.employee?.supervisorId === userId || userRank >= 70);
                // 3c. MD/Final Review (Targeted to MD Rank 90+)
                const isMDAction = l.status === 'MD_REVIEW' && userRank >= 90;
                // 3d. HR Review (Targeted to HR Rank 75+)
                const isHRAction = l.status === 'HR_REVIEW' && userRank >= 75;
                if (isManagerAction || isMDAction || isHRAction) {
                    actions.push({
                        id: `leave-approve-${l.id}`,
                        type: 'LEAVE_APPROVE',
                        title: 'Leave Approval Required',
                        subtitle: `${l.employee?.fullName || 'Staff Member'} - Stage: ${l.status.replace('_', ' ')}`,
                        priority: 'HIGH',
                        link: '/leave',
                        createdAt: l.createdAt
                    });
                }
            });
        }
        catch (e) {
            console.error('[InboxService] Leave fetch error:', e);
        }
        return actions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
}
exports.InboxService = InboxService;
