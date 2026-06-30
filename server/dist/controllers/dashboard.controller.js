"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardPerformance = exports.getDashboardStats = exports.canViewOrganizationDashboard = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const formatChange = (current, previous) => {
    if (!previous)
        return '0%';
    const delta = ((current - previous) / Math.abs(previous)) * 100;
    const rounded = Math.round(delta * 10) / 10;
    return `${rounded >= 0 ? '+' : ''}${rounded}%`;
};
const monthLabel = (year, month) => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString('en-US', { month: 'short' });
};
const canViewOrganizationDashboard = (role) => ['DEV', 'MD', 'HR_DIRECTOR', 'HR_MANAGER'].includes(String(role || '').toUpperCase());
exports.canViewOrganizationDashboard = canViewOrganizationDashboard;
const getDashboardStats = async (req, res) => {
    try {
        const user = req.user;
        const orgId = user?.organizationId || 'mcb-ghana-tenant';
        const userRank = user?.rank || 0;
        const userDeptId = user?.departmentId;
        // 1. Resolve scope through explicit organizational oversight. Department
        // heads do not inherit company-wide people analytics from numeric rank.
        let departmentId = req.query.departmentId ? parseInt(req.query.departmentId) : undefined;
        const organizationOversight = (0, exports.canViewOrganizationDashboard)(user?.role);
        if (!organizationOversight) {
            departmentId = userDeptId; // Force department scoping for Managers and below
        }
        const isStaff = userRank < 70;
        // Filter for models where we join through the employee/user relation
        const deptFilter = isStaff ? { employeeId: user.id } : (departmentId ? { employee: { departmentId } } : {});
        // Filter for models where departmentId is a direct field
        const directDeptFilter = departmentId ? { departmentId } : {};
        // 2. Performance & Morale cycles
        const cycles = await client_1.default.appraisalCycle.findMany({
            where: { organizationId: orgId, status: { in: ['ACTIVE', 'COMPLETED'] } },
            orderBy: { createdAt: 'desc' },
            take: 2,
        });
        const currentCycleId = cycles[0]?.id;
        const previousCycleId = cycles[1]?.id;
        // 3. Performance Stats
        const currentPackets = currentCycleId
            ? await client_1.default.appraisalPacket.findMany({
                where: { cycleId: currentCycleId, finalScore: { not: null }, ...deptFilter },
                select: { finalScore: true }
            })
            : [];
        const previousPackets = previousCycleId
            ? await client_1.default.appraisalPacket.findMany({
                where: { cycleId: previousCycleId, finalScore: { not: null }, ...deptFilter },
                select: { finalScore: true }
            })
            : [];
        const currentPerf = currentPackets.length
            ? currentPackets.reduce((sum, p) => sum + Number(p.finalScore || 0), 0) / currentPackets.length
            : 0;
        const previousPerf = previousPackets.length
            ? previousPackets.reduce((sum, p) => sum + Number(p.finalScore || 0), 0) / previousPackets.length
            : 0;
        // 4. Morale Stats (Self-Reviews)
        const currentSelfReviews = currentCycleId
            ? await client_1.default.appraisalReview.findMany({
                where: {
                    packet: { cycleId: currentCycleId, ...deptFilter },
                    reviewStage: 'SELF',
                    overallRating: { not: null }
                },
                select: { overallRating: true }
            })
            : [];
        const previousSelfReviews = previousCycleId
            ? await client_1.default.appraisalReview.findMany({
                where: {
                    packet: { cycleId: previousCycleId, ...deptFilter },
                    reviewStage: 'SELF',
                    overallRating: { not: null }
                },
                select: { overallRating: true }
            })
            : [];
        const currentMorale = currentSelfReviews.length
            ? currentSelfReviews.reduce((sum, r) => sum + Number(r.overallRating || 0), 0) / currentSelfReviews.length
            : currentPerf;
        const previousMorale = previousSelfReviews.length
            ? previousSelfReviews.reduce((sum, r) => sum + Number(r.overallRating || 0), 0) / previousSelfReviews.length
            : previousPerf;
        // 5. Aggregated Totals (Filtered by Dept)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [criticalIssues, openJobs, expenseAgg, personalExpenses, activeTickets, presentLogs, totalUsers] = await Promise.all([
            // Leave Requests
            client_1.default.leaveRequest.count({
                where: { organizationId: orgId, status: { in: ['PENDING_RELIEVER', 'PENDING_MANAGER'] }, isArchived: false, ...deptFilter }
            }),
            // Open Job Positions
            client_1.default.jobPosition.count({
                where: { organizationId: orgId, status: 'OPEN', ...directDeptFilter }
            }),
            // Pending Expenses
            client_1.default.expenseClaim.aggregate({
                where: { organizationId: orgId, status: 'PENDING', ...deptFilter },
                _sum: { amount: true }
            }),
            // My Own Personal Pending Expenses
            client_1.default.expenseClaim.aggregate({
                where: { organizationId: orgId, employeeId: user.id, status: 'PENDING' },
                _sum: { amount: true }
            }),
            // Support Tickets
            client_1.default.supportTicket.count({
                where: { organizationId: orgId, status: 'OPEN', ...deptFilter }
            }),
            // Attendance
            client_1.default.attendanceLog.count({
                where: { organizationId: orgId, status: 'PRESENT', date: { gte: thirtyDaysAgo }, ...deptFilter }
            }),
            // User Count (for Rate calculation)
            client_1.default.user.count({
                where: { organizationId: orgId, isArchived: false, ...(isStaff ? { id: user.id } : directDeptFilter) }
            })
        ]);
        // Calculate Attendance Rate
        const possibleWorkDays = 22;
        const totalPotentialLogs = totalUsers * possibleWorkDays;
        const attendanceRate = totalPotentialLogs > 0
            ? Math.min(100, Math.round((presentLogs / totalPotentialLogs) * 100))
            : 0;
        // Check if the current user is on leave (Out of Office)
        const today = new Date();
        const activeLeave = await client_1.default.leaveRequest.findFirst({
            where: {
                employeeId: user.id,
                status: 'APPROVED',
                startDate: { lte: today },
                endDate: { gte: today },
            },
        });
        res.json({
            avgPerformance: Math.round(currentPerf),
            performanceChange: formatChange(currentPerf, previousPerf),
            teamMorale: Math.round(currentMorale * 10) / 10,
            moraleChange: formatChange(currentMorale, previousMorale),
            criticalIssues,
            topPerformers: currentPackets.filter(p => Number(p.finalScore || 0) >= 85).length,
            openJobs,
            pendingExpenses: Number(expenseAgg._sum.amount || 0),
            myClaims: Number(personalExpenses._sum.amount || 0),
            activeTickets,
            attendanceRate,
            headcount: totalUsers,
            isOnLeave: !!activeLeave
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDashboardStats = getDashboardStats;
const getDashboardPerformance = async (req, res) => {
    try {
        const user = req.user;
        const orgId = user?.organizationId || 'mcb-ghana-tenant';
        const requestedDepartmentId = req.query.departmentId ? parseInt(req.query.departmentId) : undefined;
        const departmentId = (0, exports.canViewOrganizationDashboard)(user?.role) ? requestedDepartmentId : user?.departmentId;
        const deptFilter = (user?.rank || 0) < 70
            ? { employeeId: user.id }
            : (departmentId ? { employee: { departmentId } } : {});
        // Fetch last 6 completed cycles for the trend line
        const cycles = await client_1.default.appraisalCycle.findMany({
            where: { organizationId: orgId, status: { in: ['ACTIVE', 'COMPLETED'] } },
            include: {
                _count: { select: { packets: { where: { finalScore: { not: null }, ...deptFilter } } } },
                packets: {
                    where: { finalScore: { not: null }, ...deptFilter },
                    select: { finalScore: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 6
        });
        const data = cycles
            .map((cycle) => {
            const avg = cycle.packets.length
                ? cycle.packets.reduce((sum, p) => sum + Number(p.finalScore || 0), 0) / cycle.packets.length
                : 0;
            return {
                name: cycle.period || cycle.title.substring(0, 5),
                score: clamp(Math.round(avg * 10) / 10),
                target: 80
            };
        })
            .reverse();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDashboardPerformance = getDashboardPerformance;
