import prisma from '../prisma/client';

export class AnalyticsService {
  static async getHeadcount(organizationId: string, departmentId?: number) {
    return await prisma.user.count({
      where: {
        organizationId,
        isArchived: false,
        status: 'ACTIVE',
        ...(departmentId ? { departmentId } : {}),
      },
    });
  }

  static async getAvgPerformance(organizationId: string, departmentId?: number) {
    const sheets = await prisma.kpiSheet.findMany({
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

  static async getLeaveUtilization(organizationId: string, departmentId?: number) {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const leaves = await prisma.leaveRequest.findMany({
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

  static async getPredictiveSignals(organizationId: string) {
    // Attrition Risk: Low performance (< 50)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const lowPerformers = await prisma.kpiSheet.findMany({
      where: {
        organizationId,
        totalScore: { lt: 50 },
        isTemplate: false,
        createdAt: { gte: sixMonthsAgo },
      },
      include: { employee: { select: { id: true, fullName: true } } },
      take: 100,
    });

    // Leave Abuse Signal: Frequent short leaves (> 3 short leaves in 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const shortLeaves = await prisma.leaveRequest.findMany({
      where: {
        organizationId,
        status: 'APPROVED',
        leaveDays: { lt: 3 },
        startDate: { gte: threeMonthsAgo },
      },
      select: { employeeId: true },
      take: 500,
    });

    const leaveCounts: { [key: string]: number } = {};
    shortLeaves.forEach(l => {
      leaveCounts[l.employeeId] = (leaveCounts[l.employeeId] || 0) + 1;
    });

    const potentialAbuseIds = Object.keys(leaveCounts).filter(id => leaveCounts[id] > 3);
    const potentialAbuseUsers = await prisma.user.findMany({
      where: { id: { in: potentialAbuseIds } },
      select: { id: true, fullName: true },
    });

    return {
      attritionRisk: lowPerformers.map(p => ({ id: p.employee?.id, name: p.employee?.fullName })),
      potentialLeaveAbuse: potentialAbuseUsers.map(u => ({ id: u.id, name: u.fullName })),
    };
  }
}
