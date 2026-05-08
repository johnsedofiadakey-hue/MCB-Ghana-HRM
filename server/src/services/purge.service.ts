import prisma from '../prisma/client';

/**
 * PurgeService — Wipes all transactional / seeded data from the system.
 * Preserves: System-wide MD/DEV Users, Organization Settings.
 * Destroys: Transactional Data, Non-Admin Users, Departments, SubUnits.
 * Destroys: Targets, Appraisals, Leave Requests, Attendance, Payroll, Expenses, Loans, Notifications, Announcements.
 *
 * Intended for production onboarding / demo reset only.
 * Requires DEV or MD-level access and explicit confirmation.
 */
export class PurgeService {
  static async purgeTransactionalData(organizationId: string): Promise<{ wiped: Record<string, number> }> {
    const wiped: Record<string, number> = {};

    await prisma.$transaction(async (tx) => {

      // ── 1. PERFORMANCE: Targets (cascade handles metrics, updates, acknowledgements) ──
      const targetUpdates = await (tx as any).targetUpdate.deleteMany({ where: { organizationId } });
      wiped.targetUpdates = targetUpdates.count;

      const targetAcks = await (tx as any).targetAcknowledgement.deleteMany({ where: { organizationId } });
      wiped.targetAcknowledgements = targetAcks.count;

      const targetMetrics = await tx.targetMetric.deleteMany({ where: { organizationId } });
      wiped.targetMetrics = targetMetrics.count;

      // Delete child targets first, then parents
      await (tx as any).target.deleteMany({ where: { organizationId, parentTargetId: { not: null } } });
      const targets = await (tx as any).target.deleteMany({ where: { organizationId } });
      wiped.targets = targets.count;

      // ── 2. APPRAISALS ──
      const appraisalReviews = await (tx as any).appraisalReview.deleteMany({ where: { organizationId } });
      wiped.appraisalReviews = appraisalReviews.count;

      const appraisalPackets = await (tx as any).appraisalPacket.deleteMany({ where: { organizationId } });
      wiped.appraisalPackets = appraisalPackets.count;

      const appraisalCycles = await (tx as any).appraisalCycle.deleteMany({ where: { organizationId } });
      wiped.appraisalCycles = appraisalCycles.count;

      // ── 3. LEAVE REQUESTS ──
      const leaveRequests = await (tx as any).leaveRequest.deleteMany({ where: { organizationId } });
      wiped.leaveRequests = leaveRequests.count;

      // ── 4. ATTENDANCE ──
      const attendanceLogs = await (tx as any).attendanceLog.deleteMany({ where: { organizationId } });
      wiped.attendanceLogs = attendanceLogs.count;

      // ── 5. PAYROLL ──
      const payrollItems = await (tx as any).payrollItem.deleteMany({ where: { organizationId } });
      wiped.payrollItems = payrollItems.count;

      const payrollRuns = await (tx as any).payrollRun.deleteMany({ where: { organizationId } });
      wiped.payrollRuns = payrollRuns.count;

      // ── 6. FINANCE (Expenses & Loans) ──
      const expenses = await (tx as any).expenseClaim.deleteMany({ where: { organizationId } });
      wiped.expenses = expenses.count;

      const loans = await (tx as any).loan.deleteMany({ where: { organizationId } });
      wiped.loans = loans.count;

      // ── 7. NOTIFICATIONS & ANNOUNCEMENTS ──
      const notifications = await (tx as any).notification.deleteMany({ where: { organizationId } });
      wiped.notifications = notifications.count;

      const announcements = await (tx as any).announcement.deleteMany({ where: { organizationId } });
      wiped.announcements = announcements.count;

      // ── 7. RECRUITMENT (Universal ATS Purge) ──
      const offerLetters = await (tx as any).offerLetter.deleteMany({ where: { organizationId } });
      wiped.offerLetters = offerLetters.count;

      const interviewFeedback = await (tx as any).interviewFeedback.deleteMany({ where: { organizationId } });
      wiped.interviewFeedback = interviewFeedback.count;

      const interviewStages = await (tx as any).interviewStage.deleteMany({ where: { organizationId } });
      wiped.interviewStages = interviewStages.count;

      const candidates = await (tx as any).candidate.deleteMany({ where: { organizationId } });
      wiped.candidates = candidates.count;

      const jobPositions = await (tx as any).jobPosition.deleteMany({ where: { organizationId } });
      wiped.jobPositions = jobPositions.count;

      // ── 8. SUPPORT & HELPDESK ──
      const supportTickets = await (tx as any).supportTicket.deleteMany({ where: { organizationId } });
      wiped.supportTickets = supportTickets.count;

      const ticketComments = await (tx as any).ticketComment.deleteMany({ where: { organizationId } });
      wiped.ticketComments = ticketComments.count;

      // ── 9. OFFBOARDING & EXIT ──
      const exitInterviews = await (tx as any).exitInterview.deleteMany({ where: { organizationId } });
      wiped.exitInterviews = exitInterviews.count;

      const assetReturns = await (tx as any).assetReturn.deleteMany({ where: { organizationId } });
      wiped.assetReturns = assetReturns.count;

      const offboardingProcesses = await (tx as any).offboardingProcess.deleteMany({ where: { organizationId } });
      wiped.offboardingProcesses = offboardingProcesses.count;

      // ── 10. ONBOARDING & TRAINING ──
      const onboardingItems = await (tx as any).onboardingItem.deleteMany({ where: { organizationId } });
      wiped.onboardingItems = onboardingItems.count;

      const onboardingSessions = await (tx as any).onboardingSession.deleteMany({ where: { organizationId } });
      wiped.onboardingSessions = onboardingSessions.count;

      const trainingEnrollments = await (tx as any).trainingEnrollment.deleteMany({ where: { organizationId } });
      wiped.trainingEnrollments = trainingEnrollments.count;

      const trainingPrograms = await (tx as any).trainingProgram.deleteMany({ where: { organizationId } });
      wiped.trainingPrograms = trainingPrograms.count;

      // ── 11. ASSETS & BENEFITS ──
      const assetAssignments = await (tx as any).assetAssignment.deleteMany({ where: { organizationId } });
      wiped.assetAssignments = assetAssignments.count;

      const benefitEnrollments = await (tx as any).employeeBenefitEnrollment.deleteMany({ where: { organizationId } });
      wiped.benefitEnrollments = benefitEnrollments.count;

      // ── 12. ADMINISTRATIVE NOISE (Logs & Security) ──
      const auditLogs = await (tx as any).auditLog.deleteMany({ where: { organizationId } });
      wiped.auditLogs = auditLogs.count;

      const systemLogs = await (tx as any).systemLog.deleteMany({ where: { organizationId } });
      wiped.systemLogs = systemLogs.count;

      const apiUsage = await (tx as any).apiUsage.deleteMany({ where: { organizationId } });
      wiped.apiUsage = apiUsage.count;

      const securityEvents = await (tx as any).loginSecurityEvent.deleteMany({ where: { organizationId } });
      wiped.securityEvents = securityEvents.count;

      // ── 13. PERFORMANCE V2 & KPI SHEETS ──
      const performanceScores = await (tx as any).performanceScore.deleteMany({ where: { organizationId } });
      wiped.performanceScores = performanceScores.count;

      const performanceReviews = await (tx as any).performanceReviewV2.deleteMany({ where: { organizationId } });
      wiped.performanceReviews = performanceReviews.count;

      const employeeTargets = await (tx as any).employeeTarget.deleteMany({ where: { organizationId } });
      wiped.employeeTargets = employeeTargets.count;

      const teamTargets = await (tx as any).teamTarget.deleteMany({ where: { organizationId } });
      wiped.teamTargets = teamTargets.count;

      const departmentKpis = await (tx as any).departmentKPI.deleteMany({ where: { organizationId } });
      wiped.departmentKpis = departmentKpis.count;

      const kpiUpdates = await (tx as any).kpiUpdate.deleteMany({ where: { organizationId } });
      wiped.kpiUpdates = kpiUpdates.count;

      const kpiItems = await tx.kpiItem.deleteMany({ where: { organizationId } });
      wiped.kpiItems = kpiItems.count;

      const kpiSheets = await tx.kpiSheet.deleteMany({ where: { organizationId } });
      wiped.kpiSheets = kpiSheets.count;

      // Review Cycles
      const reviewCycles = await (tx as any).reviewCycle.deleteMany({ where: { organizationId } });
      wiped.reviewCycles = reviewCycles.count;

      const cycles = await (tx as any).cycle.deleteMany({ where: { organizationId } });
      wiped.cycles = cycles.count;

      // ── 14. EMPLOYEE METADATA & SECURITY ──
      const compHistory = await (tx as any).compensationHistory.deleteMany({ where: { organizationId } });
      wiped.compensationHistory = compHistory.count;

      const empDocs = await (tx as any).employeeDocument.deleteMany({ where: { organizationId } });
      wiped.employeeDocuments = empDocs.count;

      const empQueries = await (tx as any).employeeQuery.deleteMany({ where: { organizationId } });
      wiped.employeeQueries = empQueries.count;

      const handovers = await (tx as any).handoverRecord.deleteMany({ where: { organizationId } });
      wiped.handoverRecords = handovers.count;

      const resetTokens = await (tx as any).passwordResetToken.deleteMany({ where: { organizationId } });
      wiped.passwordResetTokens = resetTokens.count;

      const refreshTokens = await (tx as any).refreshToken.deleteMany({ where: { organizationId } });
      wiped.refreshTokens = refreshTokens.count;

      // ── 15. ORGANIZATIONAL STRUCTURE (Optional Purge) ──
      // Some clients want to keep departments, but a "clean purge" wipes them.
      const subUnits = await (tx as any).subUnit.deleteMany({ where: { organizationId } });
      wiped.subUnits = subUnits.count;

      const departments = await tx.department.deleteMany({ where: { organizationId } });
      wiped.departments = departments.count;

      // ── 16. THE SAFE PASS: USER PURGE ──
      // This is the most dangerous step. We MUST spare the MD and DEV accounts.
      const users = await tx.user.deleteMany({
        where: {
          organizationId,
          NOT: {
            role: {
              in: ['MD', 'DEV']
            }
          }
        }
      });
      wiped.users = users.count;

    }, { timeout: 60000 }); // Extended timeout for universal purge

    console.log(`[PurgeService] Global transactional data purge complete for org ${organizationId}:`, wiped);
    return { wiped };
  }
}
