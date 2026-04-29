import { Request, Response } from 'express';
import prisma from '../prisma/client';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const formatChange = (current: number, previous: number) => {
  if (!previous) return '0%';
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(delta * 10) / 10;
  return `${rounded >= 0 ? '+' : ''}${rounded}%`;
};

const monthLabel = (year: number, month: number) => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('en-US', { month: 'short' });
};
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = user?.organizationId || 'mcb-ghana-tenant';
    const userRank = user?.rank || 0;
    const userDeptId = user?.departmentId;

    // 1. Resolve scoping logic based on rank
    let departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
    
    // Strict Scoping:
    // - Rank >= 85 (Director/MD/HR): See everything (default or selected dept)
    // - Rank 70-84 (Manager): See ONLY their own department
    // - Rank < 70 (Staff): See ONLY their own personal data (where applicable)
    
    if (userRank < 85) {
      departmentId = userDeptId; // Force department scoping for Managers and below
    }

    const isStaff = userRank < 70;

    // Filter for models where we join through the employee/user relation
    const deptFilter = departmentId ? { employee: { departmentId } } : {};
    // Filter for models where departmentId is a direct field
    const directDeptFilter = departmentId ? { departmentId } : {};

    // 2. Performance & Morale cycles
    const cycles = await prisma.appraisalCycle.findMany({
      where: { organizationId: orgId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    const currentCycleId = cycles[0]?.id;
    const previousCycleId = cycles[1]?.id;

    // 3. Performance Stats
    const currentPackets = currentCycleId 
      ? await prisma.appraisalPacket.findMany({
          where: { cycleId: currentCycleId, finalScore: { not: null }, ...deptFilter },
          select: { finalScore: true }
        })
      : [];
    
    const previousPackets = previousCycleId
      ? await prisma.appraisalPacket.findMany({
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
      ? await prisma.appraisalReview.findMany({
          where: { 
            packet: { cycleId: currentCycleId, ...deptFilter }, 
            reviewStage: 'SELF', 
            overallRating: { not: null } 
          },
          select: { overallRating: true }
        })
      : [];

    const previousSelfReviews = previousCycleId
      ? await prisma.appraisalReview.findMany({
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

    const [
      criticalIssues,
      openJobs,
      expenseAgg,
      personalExpenses,
      activeTickets,
      presentLogs,
      totalUsers
    ] = await Promise.all([
      // Leave Requests
      prisma.leaveRequest.count({
        where: { organizationId: orgId, status: { in: ['PENDING_RELIEVER', 'PENDING_MANAGER'] }, isArchived: false, ...deptFilter }
      }),
      // Open Job Positions
      prisma.jobPosition.count({ 
        where: { organizationId: orgId, status: 'OPEN', ...directDeptFilter } 
      }),
      // Pending Expenses
      prisma.expenseClaim.aggregate({ 
        where: { organizationId: orgId, status: 'PENDING', ...deptFilter }, 
        _sum: { amount: true } 
      }),
      // My Own Personal Pending Expenses
      prisma.expenseClaim.aggregate({
        where: { organizationId: orgId, employeeId: user.id, status: 'PENDING' },
        _sum: { amount: true }
      }),
      // Support Tickets
      prisma.supportTicket.count({ 
        where: { organizationId: orgId, status: 'OPEN', ...deptFilter } 
      }),
      // Attendance
      prisma.attendanceLog.count({ 
        where: { organizationId: orgId, status: 'PRESENT', date: { gte: thirtyDaysAgo }, ...deptFilter } 
      }),
      // User Count (for Rate calculation)
      prisma.user.count({ 
        where: { organizationId: orgId, isArchived: false, ...(isStaff ? { id: user.id } : directDeptFilter) } 
      })
    ]);

    // Calculate Attendance Rate
    const possibleWorkDays = 22;
    const totalPotentialLogs = totalUsers * possibleWorkDays;
    const attendanceRate = totalPotentialLogs > 0 
      ? Math.min(100, Math.round((presentLogs / totalPotentialLogs) * 100)) 
      : 0;

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
      headcount: totalUsers
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDashboardPerformance = async (req: Request, res: Response) => {
  try {
    const orgId = ((req as any).user?.organizationId) || 'mcb-ghana-tenant';
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
    const deptFilter = departmentId ? { employee: { departmentId } } : {};

    // Fetch last 6 completed cycles for the trend line
    const cycles = await prisma.appraisalCycle.findMany({
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
