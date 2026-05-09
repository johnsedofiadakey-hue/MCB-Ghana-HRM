"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
class AnalyticsService {
    static async getHeadcount(organizationId, departmentId) {
        return await client_1.default.user.count({
            where: {
                organizationId,
                isArchived: false,
                status: 'ACTIVE',
                ...(departmentId ? { departmentId } : {}),
            },
        });
    }
    static async getAvgPerformance(organizationId, departmentId) {
        const sheets = await client_1.default.kpiSheet.findMany({
            where: {
                organizationId,
                isTemplate: false,
                ...(departmentId ? { employee: { departmentId } } : {}),
            },
            select: { totalScore: true },
        });
        const total = sheets.reduce((sum, s) => sum + Number(s.totalScore || 0), 0);
        return sheets.length > 0 ? Math.round(total / sheets.length) : 0;
    }
    static async getLeaveUtilization(organizationId, departmentId) {
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31);
        const leaves = await client_1.default.leaveRequest.findMany({
            where: {
                organizationId,
                status: 'APPROVED',
                startDate: { gte: startOfYear, lte: endOfYear },
                ...(departmentId ? { employee: { departmentId } } : {}),
            },
            select: { leaveDays: true },
        });
        const totalDays = leaves.reduce((sum, l) => sum + Number(l.leaveDays || 0), 0);
        return totalDays;
    }
    static async getPredictiveSignals(organizationId) {
        // Attrition Risk: Low performance (< 50)
        const lowPerformers = await client_1.default.kpiSheet.findMany({
            where: {
                organizationId,
                totalScore: { lt: 50 },
                isTemplate: false,
            },
            include: { employee: { select: { id: true, fullName: true } } },
        });
        // Leave Abuse Signal: Frequent short leaves (> 3 short leaves in 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const shortLeaves = await client_1.default.leaveRequest.findMany({
            where: {
                organizationId,
                status: 'APPROVED',
                leaveDays: { lt: 3 },
                startDate: { gte: threeMonthsAgo },
            },
            select: { employeeId: true },
        });
        const leaveCounts = {};
        shortLeaves.forEach(l => {
            leaveCounts[l.employeeId] = (leaveCounts[l.employeeId] || 0) + 1;
        });
        const potentialAbuseIds = Object.keys(leaveCounts).filter(id => leaveCounts[id] > 3);
        const potentialAbuseUsers = await client_1.default.user.findMany({
            where: { id: { in: potentialAbuseIds } },
            select: { id: true, fullName: true },
        });
        return {
            attritionRisk: lowPerformers.map(p => ({ id: p.employee?.id, name: p.employee?.fullName })),
            potentialLeaveAbuse: potentialAbuseUsers.map(u => ({ id: u.id, name: u.fullName })),
        };
    }
}
exports.AnalyticsService = AnalyticsService;
