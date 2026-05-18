"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const analytics_service_1 = require("../services/analytics.service");
const enterprise_controller_1 = require("./enterprise.controller");
const client_1 = __importDefault(require("../prisma/client"));
const pdf_service_1 = require("../services/pdf.service");
class AnalyticsController {
    static async getDashboardMetrics(req, res) {
        try {
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const organizationId = orgId || 'mcb-ghana-tenant';
            const departmentId = req.query.departmentId ? parseInt(req.query.departmentId) : undefined;
            const [headcount, avgPerformance, leaveUtilization] = await Promise.all([
                analytics_service_1.AnalyticsService.getHeadcount(organizationId, departmentId),
                analytics_service_1.AnalyticsService.getAvgPerformance(organizationId, departmentId),
                analytics_service_1.AnalyticsService.getLeaveUtilization(organizationId, departmentId),
            ]);
            return res.json({
                headcount,
                avgPerformance,
                leaveUtilization,
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getSignals(req, res) {
        try {
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const organizationId = orgId || 'mcb-ghana-tenant';
            const signals = await analytics_service_1.AnalyticsService.getPredictiveSignals(organizationId);
            return res.json(signals);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getExecutiveStats(req, res) {
        try {
            const user = req.user;
            const organizationId = user.organizationId || 'mcb-ghana-tenant';
            const rank = user.rank || 50;
            const userId = user.id;
            const isExecutive = rank >= 80;
            // Scope queries based on executive vs manager
            const userWhere = { organizationId, status: 'ACTIVE', role: { not: 'DEV' } };
            if (!isExecutive)
                userWhere.supervisorId = userId;
            const totalEmployees = await client_1.default.user.count({ where: userWhere });
            const employeeIds = isExecutive ? [] : (await client_1.default.user.findMany({ where: userWhere, select: { id: true } })).map(u => u.id);
            const leaveWhere = { organizationId };
            if (!isExecutive)
                leaveWhere.employeeId = { in: employeeIds };
            const activeLeaves = await client_1.default.leaveRequest.count({
                where: { ...leaveWhere, status: 'APPROVED' }
            });
            const pendingTasks = await client_1.default.leaveRequest.count({
                where: { ...leaveWhere, status: { in: ['MANAGER_REVIEW', 'HR_REVIEW', 'SUBMITTED'] } }
            });
            const pendingKpis = await client_1.default.kpiSheet.count({
                where: { organizationId, reviewerId: isExecutive ? undefined : userId, status: { in: ['PENDING_APPROVAL', 'ACTIVE'] } }
            });
            const pendingAppraisals = await client_1.default.appraisalPacket.count({
                where: { organizationId, status: 'OPEN', OR: [{ supervisorId: userId }, { managerId: userId }, { hrReviewerId: userId }, { finalReviewerId: userId }] }
            });
            let payrollTotal = 0;
            if (isExecutive) {
                const latestRun = await client_1.default.payrollRun.findFirst({
                    where: { organizationId, status: { in: ['APPROVED', 'PAID'] } },
                    orderBy: { createdAt: 'desc' },
                    select: { totalNet: true }
                });
                payrollTotal = Number(latestRun?.totalNet) || 0;
            }
            // Attendance rate: real clock-ins vs expected (employees * 22 working days/month)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const clockIns = await client_1.default.attendanceLog.count({
                where: {
                    organizationId,
                    clockIn: { gte: thirtyDaysAgo },
                    ...(isExecutive ? {} : { employeeId: { in: employeeIds } })
                }
            });
            const expectedDays = totalEmployees * 22;
            const attendanceRate = expectedDays > 0
                ? Math.min(100, Math.round((clockIns / expectedDays) * 100 * 10) / 10)
                : 0;
            // Team Performance (Average of current team's latest locked sheet)
            const lockedSheets = await client_1.default.kpiSheet.groupBy({
                by: ['employeeId'],
                where: {
                    organizationId,
                    status: { in: ['LOCKED', 'SUBMITTED'] },
                    ...(isExecutive ? {} : { employeeId: { in: employeeIds } })
                },
                _avg: { totalScore: true }
            });
            const avgScores = lockedSheets.map(s => Number(s._avg.totalScore) || 0);
            const teamPerf = avgScores.length ? avgScores.reduce((a, b) => a + b, 0) / avgScores.length : 0;
            // Growth: real headcount per month (last 7 months) - Executives only
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const now = new Date();
            const growth = isExecutive ? await Promise.all(Array.from({ length: 7 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                return client_1.default.user.count({
                    where: { organizationId, status: { not: 'TERMINATED' }, joinDate: { lte: end }, role: { not: 'DEV' } }
                }).then(value => ({ name: monthNames[d.getMonth()], value }));
            })) : [];
            // Strategy Phases (Dynamic based on current activities)
            const activeCycle = await client_1.default.appraisalCycle.findFirst({
                where: { organizationId, status: { in: ['ACTIVE', 'OPEN'] } }
            });
            const activeKpis = await client_1.default.kpiSheet.count({
                where: { organizationId, status: 'ACTIVE' }
            });
            const activeAppraisals = await client_1.default.appraisalPacket.count({
                where: { organizationId, status: 'OPEN' }
            });
            const strategyPhases = [
                { label: 'corp_strategy', status: activeCycle ? 'active' : 'pending' },
                { label: 'operational', status: activeKpis > 0 ? 'active' : 'pending' },
                { label: 'execution', status: activeAppraisals > 0 ? 'active' : 'pending' }
            ];
            // Growth Phases (Aggregate of all active appraisals)
            const appraisalStages = await client_1.default.appraisalPacket.groupBy({
                by: ['currentStage'],
                where: { organizationId, status: 'OPEN' },
                _count: true
            });
            const hasSelf = appraisalStages.some((s) => s.currentStage === 'SELF_REVIEW');
            const hasManager = appraisalStages.some((s) => s.currentStage === 'MANAGER_REVIEW' || s.currentStage === 'HR_REVIEW');
            const hasFinal = appraisalStages.some((s) => s.currentStage === 'FINAL_SIGN_OFF');
            const growthPhases = [
                { label: 'self_review', status: hasSelf ? 'active' : (activeAppraisals > 0 && !hasSelf ? 'done' : 'pending') },
                { label: 'alignment', status: hasManager ? 'active' : (activeAppraisals > 0 && hasFinal ? 'done' : 'pending') },
                { label: 'final_verdict', status: hasFinal ? 'active' : 'pending' }
            ];
            const team = await client_1.default.user.findMany({
                where: userWhere,
                orderBy: { rank: 'desc' },
                take: 5,
                select: { id: true, fullName: true, jobTitle: true, status: true, avatarUrl: true }
            });
            // 🌟 Direct reports metrics for hybrid executive managers (e.g. IT Admin/Manager, HR Manager, Finance Manager)
            const directTeam = await client_1.default.user.findMany({
                where: { organizationId, supervisorId: userId, status: 'ACTIVE' },
                orderBy: { rank: 'desc' },
                select: { id: true, fullName: true, jobTitle: true, status: true, avatarUrl: true }
            });
            const hasDirectReports = directTeam.length > 0;
            let directTeamPerf = 0;
            if (hasDirectReports) {
                const directEmployeeIds = directTeam.map(u => u.id);
                const directLockedSheets = await client_1.default.kpiSheet.groupBy({
                    by: ['employeeId'],
                    where: {
                        organizationId,
                        status: { in: ['LOCKED', 'SUBMITTED'] },
                        employeeId: { in: directEmployeeIds }
                    },
                    _avg: { totalScore: true }
                });
                const directAvgScores = directLockedSheets.map(s => Number(s._avg.totalScore) || 0);
                directTeamPerf = directAvgScores.length ? directAvgScores.reduce((a, b) => a + b, 0) / directAvgScores.length : 0;
            }
            res.json({
                totalEmployees,
                activeLeaves,
                pendingTasks: pendingTasks + pendingKpis + pendingAppraisals,
                payrollTotal,
                attendanceRate,
                growth,
                teamPerf,
                strategyPhases,
                growthPhases,
                team,
                directTeam,
                directTeamPerf,
                hasDirectReports
            });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async getDepartmentGrowth(req, res) {
        try {
            const user = req.user;
            const organizationId = user.organizationId || 'mcb-ghana-tenant';
            const departments = await client_1.default.department.findMany({
                where: { organizationId },
                include: { _count: { select: { employees: true } } }
            });
            const performance = departments.map(d => ({
                name: d.name,
                employees: d._count.employees,
                value: d._count.employees > 0 ? Math.min(100, 50 + d._count.employees * 5) : 50,
            }));
            res.json(performance);
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async getPersonalStats(req, res) {
        try {
            const user = req.user;
            const organizationId = user.organizationId || 'mcb-ghana-tenant';
            const userId = user.id;
            // 1. Overall Performance (Average of all completed KPI Sheets)
            const sheets = await client_1.default.kpiSheet.findMany({
                where: { employeeId: userId, organizationId, status: { in: ['LOCKED', 'PENDING_APPROVAL', 'ACTIVE'] } },
                select: { totalScore: true }
            });
            const perfScores = sheets.map(s => Number(s.totalScore) || 0);
            const overallPerformance = perfScores.length ? perfScores.reduce((a, b) => a + b, 0) / perfScores.length : 0;
            // 2. Attendance Rate (Last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const clockIns = await client_1.default.attendanceLog.count({
                where: { employeeId: userId, organizationId, clockIn: { gte: thirtyDaysAgo } }
            });
            const expectedDays = 22; // Approx working days in a month
            const attendanceRate = Math.min(100, (clockIns / expectedDays) * 100);
            // 3. Leave Balance
            const userRec = await client_1.default.user.findFirst({
                where: { id: userId, organizationId },
                select: { leaveBalance: true, leaveAllowance: true }
            });
            // 4. My Active Goals (Items from the most recent active/pending sheet)
            const latestSheet = await client_1.default.kpiSheet.findFirst({
                where: { employeeId: userId, organizationId },
                orderBy: [{ year: 'desc' }, { month: 'desc' }],
                include: { items: true }
            });
            const activeGoals = latestSheet ? latestSheet.items.map(item => ({
                name: item.name || item.description,
                progress: Number(item.targetValue) > 0 ? Math.min(100, Math.round((Number(item.actualValue) / Number(item.targetValue)) * 100)) : 0,
                color: 'var(--primary)' // Dynamic theme color
            })).slice(0, 4) : []; // Limit to top 4 for dashboard
            // 5. Strategic & Growth Journeys
            const personalPacket = await client_1.default.appraisalPacket.findFirst({
                where: { employeeId: userId, organizationId },
                orderBy: { createdAt: 'desc' }
            });
            const journeyPhases = [
                { label: 'self_review', status: personalPacket?.currentStage === 'SELF_REVIEW' ? 'active' : (personalPacket && personalPacket.currentStage !== 'SELF_REVIEW' ? 'done' : 'pending') },
                { label: 'alignment', status: (personalPacket?.currentStage === 'MANAGER_REVIEW' || personalPacket?.currentStage === 'HR_REVIEW') ? 'active' : (personalPacket && ['FINAL_SIGN_OFF', 'COMPLETED'].includes(personalPacket.currentStage) ? 'done' : 'pending') },
                { label: 'final_verdict', status: personalPacket?.currentStage === 'FINAL_SIGN_OFF' ? 'active' : (personalPacket?.status === 'COMPLETED' ? 'done' : 'pending') }
            ];
            // 6. Check if user is currently on leave (Out of Office)
            const today = new Date();
            const activeLeave = await client_1.default.leaveRequest.findFirst({
                where: {
                    employeeId: userId,
                    status: 'APPROVED',
                    startDate: { lte: today },
                    endDate: { gte: today },
                },
            });
            res.json({
                overallPerformance: Math.round(overallPerformance * 10) / 10,
                attendanceRate: Math.round(attendanceRate * 10) / 10,
                leaveBalance: userRec?.leaveBalance || 0,
                leaveAllowance: userRec?.leaveAllowance || 0,
                activeGoals,
                journeyPhases,
                isOnLeave: !!activeLeave
            });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async downloadBoardReportPDF(req, res) {
        try {
            const user = req.user;
            const organizationId = user.organizationId || 'mcb-ghana-tenant';
            // Ensure only executive/director rank can generate board reports
            if ((user.rank || 0) < 80) {
                return res.status(403).json({ error: 'Access denied. Board reports are restricted to executive personnel.' });
            }
            // Aggregate necessary metrics for the Board Report
            const [totalEmployees, pendingLeaves, pendingAppraisals] = await Promise.all([
                client_1.default.user.count({ where: { organizationId, status: 'ACTIVE', role: { not: 'DEV' } } }),
                client_1.default.leaveRequest.count({ where: { organizationId, status: 'APPROVED' } }),
                client_1.default.appraisalPacket.count({ where: { organizationId, status: 'OPEN' } })
            ]);
            const latestRun = await client_1.default.payrollRun.findFirst({
                where: { organizationId, status: { in: ['APPROVED', 'PAID'] } },
                orderBy: { createdAt: 'desc' },
                select: { totalNet: true }
            });
            const payrollTotal = Number(latestRun?.totalNet) || 0;
            // Fetch AI Insight (Heuristics or Gemini if wired into a broader analytic service)
            // Respect the organization-wide AI toggle
            const org = await client_1.default.organization.findUnique({
                where: { id: organizationId },
                select: { isAiEnabled: true }
            });
            const insights = org?.isAiEnabled ? [
                { label: 'Operational Stability', description: 'System-wide uptime and headcount deployment are optimal.' },
                { label: 'Financial Health', description: 'Payroll growth is stable and aligned with departmental budgets.' }
            ] : [];
            const reportData = {
                totalEmployees,
                pendingLeaves,
                pendingAppraisals,
                payrollTotal,
                insights
            };
            const pdfBuffer = await pdf_service_1.PdfExportService.generateBrandedPdf(organizationId, 'Executive Board Report', reportData, 'BOARD_REPORT');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Board_Report_Q${Math.ceil((new Date().getMonth() + 1) / 3)}_${new Date().getFullYear()}.pdf"`);
            return res.send(pdfBuffer);
        }
        catch (error) {
            console.error('[PDF] Board Report Error:', error);
            if (!res.headersSent)
                res.status(500).json({ message: 'Failed to generate Board Report PDF.' });
        }
    }
}
exports.AnalyticsController = AnalyticsController;
