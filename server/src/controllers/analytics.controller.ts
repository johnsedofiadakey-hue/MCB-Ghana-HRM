import { Request, Response } from 'express';
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
