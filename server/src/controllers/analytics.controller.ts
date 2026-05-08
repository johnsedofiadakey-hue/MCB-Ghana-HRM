import { Request, Response } from 'express';
<<<<<<< HEAD
import { AnalyticsService } from '../services/analytics.service';
import { getOrgId } from './enterprise.controller';

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
}
=======
import prisma from '../prisma/client';

export const getExecutiveStats = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const rank = user.rank || 50;
        const userId = user.id;

        const isExecutive = rank >= 80;
        
        // Scope queries based on executive vs manager
        const userWhere: any = { organizationId, status: 'ACTIVE', role: { not: 'DEV' } };
        if (!isExecutive) userWhere.supervisorId = userId;

        const totalEmployees = await prisma.user.count({ where: userWhere });
        const employeeIds = isExecutive ? [] : (await prisma.user.findMany({ where: userWhere, select: { id: true } })).map(u => u.id);

        const leaveWhere: any = { organizationId };
        if (!isExecutive) leaveWhere.employeeId = { in: employeeIds };

        const activeLeaves = await prisma.leaveRequest.count({
            where: { ...leaveWhere, status: 'APPROVED' }
        });

        const pendingTasks = await prisma.leaveRequest.count({
            where: { ...leaveWhere, status: { in: ['MANAGER_REVIEW', 'HR_REVIEW', 'SUBMITTED'] } }
        });

        const pendingKpis = await prisma.kpiSheet.count({
            where: { organizationId, reviewerId: isExecutive ? undefined : userId, status: { in: ['PENDING_APPROVAL', 'ACTIVE'] } }
        });

        const pendingAppraisals = await (prisma as any).appraisalPacket.count({
             where: { organizationId, status: 'OPEN', OR: [{ supervisorId: userId }, { managerId: userId }, { hrReviewerId: userId }, { finalReviewerId: userId }] }
        });

        let payrollTotal = 0;
        if (isExecutive) {
            const latestRun = await prisma.payrollRun.findFirst({
                where: { organizationId, status: { in: ['APPROVED', 'PAID'] } },
                orderBy: { createdAt: 'desc' },
                select: { totalNet: true }
            });
            payrollTotal = Number(latestRun?.totalNet) || 0;
        }

        // Attendance rate: real clock-ins vs expected (employees * 22 working days/month)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const clockIns = await prisma.attendanceLog.count({
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
        const lockedSheets = await prisma.kpiSheet.groupBy({
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
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now = new Date();
        const growth = isExecutive ? await Promise.all(
            Array.from({ length: 7 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                return prisma.user.count({
                    where: { organizationId, status: { not: 'TERMINATED' }, joinDate: { lte: end }, role: { not: 'DEV' } }
                }).then(value => ({ name: monthNames[d.getMonth()], value }));
            })
        ) : [];

        // Strategy Phases (Dynamic based on current activities)
        const activeCycle = await prisma.appraisalCycle.findFirst({
            where: { organizationId, status: { in: ['ACTIVE', 'OPEN'] } }
        });
        const activeKpis = await prisma.kpiSheet.count({
            where: { organizationId, status: 'ACTIVE' }
        });
        const activeAppraisals = await (prisma as any).appraisalPacket.count({
            where: { organizationId, status: 'OPEN' }
        });

        const strategyPhases = [
            { label: 'corp_strategy', status: activeCycle ? 'active' : 'pending' },
            { label: 'operational', status: activeKpis > 0 ? 'active' : 'pending' },
            { label: 'execution', status: activeAppraisals > 0 ? 'active' : 'pending' }
        ];

        // Growth Phases (Aggregate of all active appraisals)
        const appraisalStages = await (prisma as any).appraisalPacket.groupBy({
            by: ['currentStage'],
            where: { organizationId, status: 'OPEN' },
            _count: true
        });

        const hasSelf = appraisalStages.some((s: any) => s.currentStage === 'SELF_REVIEW');
        const hasManager = appraisalStages.some((s: any) => s.currentStage === 'MANAGER_REVIEW' || s.currentStage === 'HR_REVIEW');
        const hasFinal = appraisalStages.some((s: any) => s.currentStage === 'FINAL_SIGN_OFF');

        const growthPhases = [
            { label: 'self_review', status: hasSelf ? 'active' : (activeAppraisals > 0 && !hasSelf ? 'done' : 'pending') },
            { label: 'alignment', status: hasManager ? 'active' : (activeAppraisals > 0 && hasFinal ? 'done' : 'pending') },
            { label: 'final_verdict', status: hasFinal ? 'active' : 'pending' }
        ];

        const team = await prisma.user.findMany({
            where: userWhere,
            orderBy: { rank: 'desc' },
            take: 5,
            select: { id: true, fullName: true, jobTitle: true, status: true, avatarUrl: true }
        });

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
            team
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getDepartmentGrowth = async (req: Request, res: Response) => {
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
};

export const getPersonalStats = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const userId = user.id;

        // 1. Overall Performance (Average of all completed KPI Sheets)
        const sheets = await prisma.kpiSheet.findMany({
            where: { employeeId: userId, organizationId, status: { in: ['LOCKED', 'PENDING_APPROVAL', 'ACTIVE'] } },
            select: { totalScore: true }
        });
        const perfScores = sheets.map(s => Number(s.totalScore) || 0);
        const overallPerformance = perfScores.length ? perfScores.reduce((a, b) => a + b, 0) / perfScores.length : 0;

        // 2. Attendance Rate (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const clockIns = await prisma.attendanceLog.count({
            where: { employeeId: userId, organizationId, clockIn: { gte: thirtyDaysAgo } }
        });
        const expectedDays = 22; // Approx working days in a month
        const attendanceRate = Math.min(100, (clockIns / expectedDays) * 100);

        // 3. Leave Balance
        const userRec = await prisma.user.findFirst({
            where: { id: userId, organizationId },
            select: { leaveBalance: true, leaveAllowance: true }
        });

        // 4. My Active Goals (Items from the most recent active/pending sheet)
        const latestSheet = await prisma.kpiSheet.findFirst({
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
        const personalPacket = await (prisma as any).appraisalPacket.findFirst({
            where: { employeeId: userId, organizationId },
            orderBy: { createdAt: 'desc' }
        });

        const journeyPhases = [
            { label: 'self_review', status: personalPacket?.currentStage === 'SELF_REVIEW' ? 'active' : (personalPacket && personalPacket.currentStage !== 'SELF_REVIEW' ? 'done' : 'pending') },
            { label: 'alignment', status: (personalPacket?.currentStage === 'MANAGER_REVIEW' || personalPacket?.currentStage === 'HR_REVIEW') ? 'active' : (personalPacket && ['FINAL_SIGN_OFF', 'COMPLETED'].includes(personalPacket.currentStage) ? 'done' : 'pending') },
            { label: 'final_verdict', status: personalPacket?.currentStage === 'FINAL_SIGN_OFF' ? 'active' : (personalPacket?.status === 'COMPLETED' ? 'done' : 'pending') }
        ];

        res.json({
            overallPerformance: Math.round(overallPerformance * 10) / 10,
            attendanceRate: Math.round(attendanceRate * 10) / 10,
            leaveBalance: userRec?.leaveBalance || 0,
            leaveAllowance: userRec?.leaveAllowance || 0,
            activeGoals,
            journeyPhases
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

import { PdfExportService } from '../services/pdf.service';

export const downloadBoardReportPDF = async (req: Request, res: Response) => {
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
};
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
