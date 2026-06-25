import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { getOrgId } from './enterprise.controller';
import prisma from '../prisma/client';
import { PdfExportService } from '../services/pdf.service';

export class AnalyticsController {
  static async getDashboardMetrics(req: Request, res: Response) {
    try {
      const orgId = getOrgId(req);
      const organizationId = orgId || 'mcb-ghana-tenant';
      const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;

      const [headcount, avgPerformance, leaveUtilization] = await Promise.all([
        AnalyticsService.getHeadcount(organizationId, departmentId),
        AnalyticsService.getAvgPerformance(organizationId, departmentId),
        AnalyticsService.getLeaveUtilization(organizationId, departmentId),
      ]);

      return res.json({
        headcount,
        avgPerformance,
        leaveUtilization,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getSignals(req: Request, res: Response) {
    try {
      const orgId = getOrgId(req);
      const organizationId = orgId || 'mcb-ghana-tenant';

      const signals = await AnalyticsService.getPredictiveSignals(organizationId);

      return res.json(signals);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getExecutiveStats(req: Request, res: Response) {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const rank = user.rank || 50;
        const userId = user.id;

        const isExecutive = rank >= 80;
        
        // Scope queries based on executive vs manager
        const userWhere: any = { organizationId, status: 'ACTIVE', role: { not: 'DEV' } };
        if (!isExecutive) userWhere.supervisorId = userId;

        // Phase 1: employee scope (IDs needed to build subsequent where clauses)
        const [totalEmployees, scopedUsers] = await Promise.all([
            prisma.user.count({ where: userWhere }),
            isExecutive
                ? Promise.resolve([] as { id: string }[])
                : prisma.user.findMany({ where: userWhere, select: { id: true } }),
        ]);
        const employeeIds = scopedUsers.map(u => u.id);

        const leaveWhere: any = { organizationId };
        if (!isExecutive) leaveWhere.employeeId = { in: employeeIds };

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const today = new Date();
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        // Phase 2: all independent metrics in one parallel round-trip
        const [
            activeLeaves,
            pendingTasks,
            pendingKpis,
            pendingAppraisals,
            latestRun,
            clockIns,
            approvedLeavesDays,
            publicHolidays,
            lockedSheets,
            activeCycle,
            activeKpis,
            activeAppraisals,
            appraisalStages,
            team,
            directTeam,
            growth,
        ] = await Promise.all([
            prisma.leaveRequest.count({ where: { ...leaveWhere, status: 'APPROVED' } }),
            prisma.leaveRequest.count({ where: { ...leaveWhere, status: { in: ['MANAGER_REVIEW', 'HR_REVIEW', 'SUBMITTED'] } } }),
            prisma.kpiSheet.count({ where: { organizationId, reviewerId: isExecutive ? undefined : userId, status: { in: ['PENDING_APPROVAL', 'ACTIVE'] } } }),
            (prisma as any).appraisalPacket.count({ where: { organizationId, status: 'OPEN', OR: [{ supervisorId: userId }, { managerId: userId }, { hrReviewerId: userId }, { finalReviewerId: userId }] } }),
            isExecutive
                ? prisma.payrollRun.findFirst({ where: { organizationId, status: { in: ['APPROVED', 'PAID'] } }, orderBy: { createdAt: 'desc' }, select: { totalNet: true } })
                : Promise.resolve(null),
            prisma.attendanceLog.count({ where: { organizationId, clockIn: { gte: thirtyDaysAgo }, ...(isExecutive ? {} : { employeeId: { in: employeeIds } }) } }),
            prisma.leaveRequest.findMany({ where: { organizationId, status: 'APPROVED', startDate: { gte: thirtyDaysAgo } }, select: { leaveDays: true }, take: 500 }),
            prisma.publicHoliday.count({ where: { date: { gte: thirtyDaysAgo } } }),
            prisma.kpiSheet.groupBy({ by: ['employeeId'], where: { organizationId, status: { in: ['LOCKED', 'SUBMITTED'] }, ...(isExecutive ? {} : { employeeId: { in: employeeIds } }) }, _avg: { totalScore: true } }),
            prisma.appraisalCycle.findFirst({ where: { organizationId, status: { in: ['ACTIVE', 'OPEN'] } } }),
            prisma.kpiSheet.count({ where: { organizationId, status: 'ACTIVE' } }),
            (prisma as any).appraisalPacket.count({ where: { organizationId, status: 'OPEN' } }),
            (prisma as any).appraisalPacket.groupBy({ by: ['currentStage'], where: { organizationId, status: 'OPEN' }, _count: true }),
            prisma.user.findMany({ where: userWhere, orderBy: { rank: 'desc' }, take: 5, select: { id: true, fullName: true, jobTitle: true, status: true, avatarUrl: true } }),
            prisma.user.findMany({ where: { organizationId, supervisorId: userId, status: 'ACTIVE' }, orderBy: { rank: 'desc' }, select: { id: true, fullName: true, jobTitle: true, status: true, avatarUrl: true } }),
            isExecutive
                ? Promise.all(Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(today.getFullYear(), today.getMonth() - (6 - i), 1);
                    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                    return prisma.user.count({ where: { organizationId, status: { not: 'TERMINATED' }, joinDate: { lte: end }, role: { not: 'DEV' } } })
                        .then(value => ({ name: monthNames[d.getMonth()], value }));
                }))
                : Promise.resolve([] as { name: string; value: number }[]),
        ]);

        // Derive scalar metrics
        const payrollTotal = Number((latestRun as any)?.totalNet) || 0;

        let workingDays = 0;
        for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) workingDays++;
        }
        const totalApprovedLeaveDays = (approvedLeavesDays as { leaveDays: any }[]).reduce((s, r) => s + Number(r.leaveDays || 0), 0);
        const expectedDays = Math.max(1, totalEmployees * Math.max(1, workingDays - (publicHolidays as number)) - totalApprovedLeaveDays);
        const attendanceRate = Math.min(100, Math.round(((clockIns as number) / expectedDays) * 100 * 10) / 10);

        const avgScores = (lockedSheets as { _avg: { totalScore: any } }[]).map(s => Number(s._avg.totalScore) || 0);
        const teamPerf = avgScores.length ? Math.round((avgScores.reduce((a, b) => a + b, 0) / avgScores.length) * 10) / 10 : 0;

        const strategyPhases = [
            { label: 'corp_strategy', status: activeCycle ? 'active' : 'pending' },
            { label: 'operational', status: (activeKpis as number) > 0 ? 'active' : 'pending' },
            { label: 'execution', status: (activeAppraisals as number) > 0 ? 'active' : 'pending' },
        ];

        const hasSelf = (appraisalStages as any[]).some(s => s.currentStage === 'SELF_REVIEW');
        const hasManager = (appraisalStages as any[]).some(s => s.currentStage === 'MANAGER_REVIEW' || s.currentStage === 'HR_REVIEW');
        const hasFinal = (appraisalStages as any[]).some(s => s.currentStage === 'FINAL_SIGN_OFF');
        const growthPhases = [
            { label: 'self_review', status: hasSelf ? 'active' : ((activeAppraisals as number) > 0 && !hasSelf ? 'done' : 'pending') },
            { label: 'alignment', status: hasManager ? 'active' : ((activeAppraisals as number) > 0 && hasFinal ? 'done' : 'pending') },
            { label: 'final_verdict', status: hasFinal ? 'active' : 'pending' },
        ];

        const hasDirectReports = (directTeam as any[]).length > 0;
        let directTeamPerf = 0;
        if (hasDirectReports) {
            const directEmployeeIds = (directTeam as { id: string }[]).map(u => u.id);
            const directLockedSheets = await prisma.kpiSheet.groupBy({
                by: ['employeeId'],
                where: { organizationId, status: { in: ['LOCKED', 'SUBMITTED'] }, employeeId: { in: directEmployeeIds } },
                _avg: { totalScore: true },
            });
            const directAvgScores = directLockedSheets.map(s => Number(s._avg.totalScore) || 0);
            directTeamPerf = directAvgScores.length
                ? Math.round((directAvgScores.reduce((a, b) => a + b, 0) / directAvgScores.length) * 10) / 10
                : 0;
        }

        res.json({
            totalEmployees,
            activeLeaves,
            pendingTasks: (pendingTasks as number) + (pendingKpis as number) + (pendingAppraisals as number),
            payrollTotal,
            attendanceRate,
            growth,
            teamPerf,
            strategyPhases,
            growthPhases,
            team,
            directTeam,
            directTeamPerf,
            hasDirectReports,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
  }

  static async getDepartmentGrowth(req: Request, res: Response) {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';

        const departments = await prisma.department.findMany({
            where: { organizationId },
            include: { _count: { select: { employees: true } } }
        });

        const performance = departments.map(d => ({
            name: d.name,
            employees: d._count.employees,
            value: d._count.employees > 0 ? Math.min(100, 50 + d._count.employees * 5) : 50,
        }));

        res.json(performance);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
  }

  static async getPersonalStats(req: Request, res: Response) {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const userId = user.id;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const today = new Date();

        // All personal stat queries are independent — run in parallel
        const [sheets, clockIns, userRec, latestSheet, personalPacket, activeLeave] = await Promise.all([
            prisma.kpiSheet.findMany({
                where: { employeeId: userId, organizationId, status: { in: ['LOCKED', 'PENDING_APPROVAL', 'ACTIVE'] } },
                select: { totalScore: true },
            }),
            prisma.attendanceLog.count({
                where: { employeeId: userId, organizationId, clockIn: { gte: thirtyDaysAgo } },
            }),
            prisma.user.findFirst({
                where: { id: userId, organizationId },
                select: { leaveBalance: true, leaveAllowance: true },
            }),
            prisma.kpiSheet.findFirst({
                where: { employeeId: userId, organizationId },
                orderBy: [{ year: 'desc' }, { month: 'desc' }],
                include: { items: true },
            }),
            (prisma as any).appraisalPacket.findFirst({
                where: { employeeId: userId, organizationId },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.leaveRequest.findFirst({
                where: { employeeId: userId, status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } },
            }),
        ]);

        const perfScores = sheets.map(s => Number(s.totalScore) || 0);
        const overallPerformance = perfScores.length ? perfScores.reduce((a, b) => a + b, 0) / perfScores.length : 0;

        // Attendance rate: working days in the last 30 days (excluding weekends)
        let workingDays = 0;
        for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) workingDays++;
        }
        const attendanceRate = Math.min(100, (clockIns / Math.max(1, workingDays)) * 100);

        const activeGoals = latestSheet ? latestSheet.items.map((item: any) => ({
            name: item.name || item.description,
            progress: Number(item.targetValue) > 0 ? Math.min(100, Math.round((Number(item.actualValue) / Number(item.targetValue)) * 100)) : 0,
            color: 'var(--primary)',
        })).slice(0, 4) : [];

        const journeyPhases = [
            { label: 'self_review', status: personalPacket?.currentStage === 'SELF_REVIEW' ? 'active' : (personalPacket && personalPacket.currentStage !== 'SELF_REVIEW' ? 'done' : 'pending') },
            { label: 'alignment', status: (personalPacket?.currentStage === 'MANAGER_REVIEW' || personalPacket?.currentStage === 'HR_REVIEW') ? 'active' : (personalPacket && ['FINAL_SIGN_OFF', 'COMPLETED'].includes(personalPacket.currentStage) ? 'done' : 'pending') },
            { label: 'final_verdict', status: personalPacket?.currentStage === 'FINAL_SIGN_OFF' ? 'active' : (personalPacket?.status === 'COMPLETED' ? 'done' : 'pending') },
        ];

        res.json({
            overallPerformance: Math.round(overallPerformance * 10) / 10,
            attendanceRate: Math.round(attendanceRate * 10) / 10,
            leaveBalance: userRec?.leaveBalance || 0,
            leaveAllowance: userRec?.leaveAllowance || 0,
            activeGoals,
            journeyPhases,
            isOnLeave: !!activeLeave
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
  }

  static async downloadBoardReportPDF(req: Request, res: Response) {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        
        // Ensure only executive/director rank can generate board reports
        if ((user.rank || 0) < 80) {
            return res.status(403).json({ error: 'Access denied. Board reports are restricted to executive personnel.' });
        }

        // Aggregate necessary metrics for the Board Report
        const [totalEmployees, pendingLeaves, pendingAppraisals] = await Promise.all([
            prisma.user.count({ where: { organizationId, status: 'ACTIVE', role: { not: 'DEV' } } }),
            prisma.leaveRequest.count({ where: { organizationId, status: 'APPROVED' } }),
            (prisma as any).appraisalPacket.count({ where: { organizationId, status: 'OPEN' } })
        ]);

        const latestRun = await prisma.payrollRun.findFirst({
            where: { organizationId, status: { in: ['APPROVED', 'PAID'] } },
            orderBy: { createdAt: 'desc' },
            select: { totalNet: true }
        });
        const payrollTotal = Number(latestRun?.totalNet) || 0;

        // Fetch AI Insight (Heuristics or Gemini if wired into a broader analytic service)
        // Respect the organization-wide AI toggle
        const org = await prisma.organization.findUnique({
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

        const pdfBuffer = await PdfExportService.generateBrandedPdf(
            organizationId,
            'Executive Board Report',
            reportData,
            'BOARD_REPORT' as any
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Board_Report_Q${Math.ceil((new Date().getMonth() + 1) / 3)}_${new Date().getFullYear()}.pdf"`);
        return res.send(pdfBuffer);
    } catch (error: any) {
        console.error('[PDF] Board Report Error:', error);
        if (!res.headersSent) res.status(500).json({ message: 'Failed to generate Board Report PDF.' });
    }
  }
}
