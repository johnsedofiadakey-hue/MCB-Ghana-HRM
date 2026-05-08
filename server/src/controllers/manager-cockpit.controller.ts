import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { HierarchyService } from '../services/hierarchy.service';
import { getOrgId } from './enterprise.controller';

export class ManagerCockpitController {
  static async getCockpitData(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const orgId = getOrgId(req);
      const organizationId = orgId || 'mcb-ghana-tenant';

      // Get all managed employees
      const managedIds = await HierarchyService.getManagedEmployeeIds(user.id, organizationId);

      if (managedIds.length === 0) {
        return res.json({
          spanOfControl: 0,
          healthSignals: {
            attendance: 'N/A',
            kpiProgress: 'N/A',
          },
          alerts: [],
          attritionRiskNodes: 0,
        });
      }

      // 1. Span of Control
      const spanOfControl = managedIds.length;

      // 2. Health Signals - Attendance (Today's presence)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const presentToday = await prisma.attendanceLog.count({
        where: {
          organizationId,
          employeeId: { in: managedIds },
          date: { gte: today },
          status: 'PRESENT',
        },
      });

      const attendanceRate = Math.round((presentToday / spanOfControl) * 100);

      // 3. Health Signals - KPI Progress (Average of latest sheets)
      const latestSheets = await prisma.kpiSheet.findMany({
        where: {
          organizationId,
          employeeId: { in: managedIds },
          isTemplate: false,
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['employeeId'],
        select: { totalScore: true },
      });

      const totalKpiScore = latestSheets.reduce((sum, sheet) => sum + Number(sheet.totalScore || 0), 0);
      const avgKpiProgress = latestSheets.length > 0 ? Math.round(totalKpiScore / latestSheets.length) : 0;

      // 4. Proactive Alerts
      const alerts: string[] = [];
      
      // Alert: Low attendance
      if (attendanceRate < 80) {
        alerts.push(`Team attendance is low today (${attendanceRate}%).`);
      }

      // Alert: Pending leave requests
      const pendingLeaves = await prisma.leaveRequest.count({
        where: {
          organizationId,
          employeeId: { in: managedIds },
          status: 'PENDING_MANAGER',
        },
      });
      if (pendingLeaves > 0) {
        alerts.push(`You have ${pendingLeaves} pending leave requests to approve.`);
      }

      // 5. Attrition Risk Nodes (Heuristic: Low score in latest appraisal or KPI)
      const atRiskCount = latestSheets.filter(sheet => Number(sheet.totalScore || 0) < 50).length;

      return res.json({
        spanOfControl,
        healthSignals: {
          attendance: `${attendanceRate}%`,
          kpiProgress: `${avgKpiProgress}%`,
        },
        alerts,
        attritionRiskNodes: atRiskCount,
      });
    } catch (error: any) {
      console.error('[Manager Cockpit] Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getOrgIntelligence(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const orgId = getOrgId(req);
      const organizationId = orgId || 'mcb-ghana-tenant';

      // Only admins/directors see full org intelligence
      if (user.rank < 80) {
        return res.status(403).json({ error: 'Access denied: Requires rank 80+' });
      }

      // 1. Average Span of Control
      const managers = await prisma.user.findMany({
        where: { organizationId, role: { in: ['MANAGER', 'SUPERVISOR', 'DIRECTOR'] } },
        select: { id: true },
      });

      let totalSpan = 0;
      for (const mgr of managers) {
        const managed = await HierarchyService.getManagedEmployeeIds(mgr.id, organizationId);
        totalSpan += managed.length;
      }
      const avgSpan = managers.length > 0 ? Math.round(totalSpan / managers.length) : 0;

      // 2. Bench Strength (Ready for promotion)
      // Heuristic: High KPI score (> 90) and not a manager yet
      const highPerformers = await prisma.kpiSheet.findMany({
        where: {
          organizationId,
          totalScore: { gte: 90 },
          isTemplate: false,
          employee: { role: { notIn: ['MANAGER', 'DIRECTOR', 'MD'] } },
        },
        distinct: ['employeeId'],
        include: { employee: { select: { fullName: true, jobTitle: true } } },
      });

      const benchStrength = highPerformers.map(p => ({
        name: p.employee?.fullName,
        title: p.employee?.jobTitle,
        score: p.totalScore,
      }));

      return res.json({
        avgSpanOfControl: avgSpan,
        benchStrength,
        totalManagers: managers.length,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
