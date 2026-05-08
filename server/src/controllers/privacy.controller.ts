/**
 * Data Privacy / Employee Rights Controller
 * Supports GDPR-style rights: data access, export, and anonymisation.
 * In Ghana: Data Protection Act 2012 (Act 843) applies.
 */
import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';

// Employee requests a copy of all their personal data
export const exportMyData = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;

    const [user, leaves, appraisals, payslips, notifications, onboarding, training] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, fullName: true, email: true, jobTitle: true, gender: true,
          dob: true, nationalId: true, contactNumber: true, address: true,
          nextOfKinName: true, nextOfKinRelation: true, nextOfKinContact: true,
          joinDate: true, status: true, role: true, employeeCode: true,
          departmentObj: { select: { name: true } }
          // salary excluded — employee can see in payslips, not raw field
        }
      }),
      prisma.leaveRequest.findMany({ where: { employeeId: userId }, select: { startDate: true, endDate: true, status: true, reason: true, leaveDays: true } }),
      (prisma as any).appraisalPacket.findMany({ where: { employeeId: userId }, select: { status: true, currentStage: true, createdAt: true } }),
      prisma.payrollItem.findMany({ where: { employeeId: userId }, select: { run: { select: { period: true } }, grossPay: true, netPay: true, currency: true } }),
      prisma.notification.findMany({ where: { userId }, select: { title: true, message: true, type: true, createdAt: true } }),
      prisma.onboardingSession.findMany({ where: { employeeId: userId }, select: { template: { select: { name: true } }, progress: true, completedAt: true } }),
      prisma.trainingEnrollment.findMany({ where: { employeeId: userId }, select: { program: { select: { title: true } }, status: true, completedAt: true, score: true } })
    ]);

    await logAction(userId, 'DATA_EXPORT_REQUEST', 'User', userId, { requestedAt: new Date().toISOString() }, req.ip);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="my-data-export-${new Date().toISOString().split('T')[0]}.json"`);

    res.json({
      exportedAt: new Date().toISOString(),
      notice: 'This export contains all personal data held about you in the HRM platform, in compliance with the Ghana Data Protection Act 2012.',
      personalDetails: user,
      leaveHistory: leaves,
      appraisalHistory: appraisals,
      payrollHistory: payslips,
      notifications,
      onboardingHistory: onboarding,
      trainingHistory: training
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Anonymise a terminated employee record (MD/HR only)
// Replaces PII with anonymised tokens while keeping statistical data
export const anonymiseEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    // @ts-ignore
    const actorId = req.user?.id;

    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (employee.status !== 'TERMINATED') {
      return res.status(400).json({ error: 'Can only anonymise TERMINATED employees' });
    }

    const anonId = `ANON-${employeeId.slice(0, 8).toUpperCase()}`;

    await prisma.user.update({
      where: { id: employeeId },
      data: {
        fullName: anonId,
        email: `${anonId.toLowerCase()}@anonymised.internal`,
        nationalId: null,
        contactNumber: null,
        address: null,
        nextOfKinName: null,
        nextOfKinContact: null,
        nextOfKinRelation: null,
        dob: null,
        avatarUrl: null,
        gender: null,
        // Retain: role, department, jobTitle, joinDate for statistical purposes
      }
    });

    await logAction(actorId, 'EMPLOYEE_ANONYMISED', 'User', employeeId, { anonId }, req.ip);

    res.json({ success: true, message: `Employee record anonymised as ${anonId}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Data retention: list employees terminated over N months with full PII still intact
export const getDataRetentionReport = async (req: Request, res: Response) => {
  try {
    const monthsThreshold = parseInt(req.query.months as string) || 24;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsThreshold);

    const stale = await prisma.user.findMany({
      where: {
        status: 'TERMINATED',
        updatedAt: { lt: cutoff },
        nationalId: { not: null } // Still has PII
      },
      select: {
        id: true, fullName: true, jobTitle: true, updatedAt: true,
        departmentObj: { select: { name: true } }
      }
    });

    res.json({
      threshold: `${monthsThreshold} months`,
      cutoffDate: cutoff,
      count: stale.length,
      employees: stale,
      recommendation: stale.length > 0 ? 'These records contain PII and should be reviewed for anonymisation.' : 'No action needed.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
