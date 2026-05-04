import { prisma, prismaClient } from '../prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logAction } from './audit.service';
import { notify } from './websocket.service';

/**
 * Appraisal stages in sequential order
 */
const APPRAISAL_STAGES = [
  'SELF_REVIEW',
  'MANAGER_REVIEW',
  'FINAL_REVIEW'
];

export class AppraisalService {
  /**
   * Initialize a new Appraisal Cycle and generate packets for employees
   */
  static async initCycle(organizationId: string, data: any) {
    let { title, period, startDate, endDate, employeeIds, cycleId } = data;

    // If cycleId provided, look up the cycle from the Cycle table and create an AppraisalCycle from it
    let cycle: any;
    if (cycleId) {
      const existingCycle = await prisma.cycle.findFirst({ where: { id: cycleId, organizationId } });
      if (!existingCycle) throw new Error('Cycle not found');
      title = title || existingCycle.name;
      period = period || `${new Date(existingCycle.startDate).getFullYear()}`;
      startDate = startDate || existingCycle.startDate;
      endDate = endDate || existingCycle.endDate;
    }

    if (!title) throw new Error('title is required');
    if (!startDate || !endDate) throw new Error('startDate and endDate are required');

    // Check if an appraisal cycle already exists for this period
    cycle = await prisma.appraisalCycle.findFirst({
      where: { organizationId, title, status: { not: 'ARCHIVED' } }
    });

    if (!cycle) {
      cycle = await prisma.appraisalCycle.create({
        data: {
          organizationId,
          title,
          period: String(period || new Date().getFullYear()),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'ACTIVE'
        }
      });
    }

    // If employeeIds is provided but empty, we select ALL eligible employees
    const employeeFilter = (employeeIds && employeeIds.length > 0) 
      ? { id: { in: employeeIds } } 
      : {};

    const employees = await prisma.user.findMany({
      where: {
        organizationId,
        isArchived: false,
        role: { notIn: ['DEV', 'MD'] }, // MD and DEV don't receive appraisal packets
        ...employeeFilter
      },
      include: {
        supervisor: true,
        departmentObj: { include: { manager: true } },
        managedReportingLines: {
           where: { type: 'DOTTED', effectiveTo: null },
           take: 1
        }
      }
    });

    return await prisma.$transaction(async (tx) => {
      let packetCount = 0;
      for (const emp of employees) {
        // Check if packet already exists for this employee in this cycle to avoid duplicates
        const existingPacket = await tx.appraisalPacket.findFirst({
          where: { cycleId: cycle.id, employeeId: emp.id, NOT: { status: 'CANCELLED' } }
        });
        if (existingPacket) continue;

        // Resolve reviewers for the packet cache (Hierarchy Fallback)
        const userRank = (emp as any).roleRank || 0;
        const supervisorId = emp.supervisorId;
        const matrixSupervisorId = (emp as any).managedReportingLines?.[0]?.managerId || null;
        let managerId = emp.departmentObj?.managerId || null;
        
        // If employee is high-ranked (Manager+), ensure their supervisor is a Director or higher
        let resolvedSupervisorId = supervisorId;
        if (userRank >= 70 && (!supervisorId || supervisorId === managerId)) {
           const topAuthority = await tx.user.findFirst({
              where: { organizationId, role: { in: ['DIRECTOR', 'MD', 'DEV'] }, id: { not: emp.id }, isArchived: false },
              orderBy: { role: 'desc' }
           });
           if (topAuthority) resolvedSupervisorId = topAuthority.id;
        }

        const hrReviewerId = (await tx.user.findFirst({ 
          where: { organizationId, role: { in: ['DIRECTOR', 'MD', 'HR'] }, id: { not: emp.id }, isArchived: false },
          orderBy: { role: 'asc' } 
        }))?.id || null;
        const finalReviewerId = (await tx.user.findFirst({ 
          where: { organizationId, role: { in: ['MD', 'DEV'] }, id: { not: emp.id }, isArchived: false }
        }))?.id || null;

        await tx.appraisalPacket.create({
          data: {
            organizationId,
            cycleId: cycle.id,
            employeeId: emp.id,
            currentStage: 'SELF_REVIEW',
            status: 'OPEN',
            supervisorId: resolvedSupervisorId,
            matrixSupervisorId,
            managerId,
            hrReviewerId,
            finalReviewerId
          }
        });
        packetCount++;
        await notify(emp.id, '📈 Appraisal Cycle Started', `The ${title} cycle has begun. Please complete your self-review.`, 'INFO', '/appraisals');
      }

      return { 
        message: `Appraisal cycle initialized for ${packetCount} employees.`, 
        cycle, 
        packetCount 
      };
    });
  }

  static async updateCycle(organizationId: string, cycleId: string, data: any) {
    const { title, period, startDate, endDate, status } = data;
    return prisma.appraisalCycle.update({
      where: { id: cycleId, organizationId },
      data: {
        ...(title && { title }),
        ...(period && { period: String(period) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(status && { status })
      }
    });
  }

  static async deleteCycle(organizationId: string, cycleId: string) {
    const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId, organizationId } });
    if (!cycle) throw new Error('Appraisal cycle not found');

    return await prisma.$transaction(async (tx) => {
      // 1. Find all packets for this cycle
      const packets = await tx.appraisalPacket.findMany({
        where: { cycleId, organizationId },
        select: { id: true, employeeId: true }
      });
      const packetIds = packets.map((p: any) => p.id);
      const employeeIds = [...new Set(packets.map((p: any) => p.employeeId))];

      if (packetIds.length > 0) {
        // 2. Delete all reviews for these packets
        await tx.appraisalReview.deleteMany({
          where: { packetId: { in: packetIds } }
        });

        // 3. Purge Targets that were part of this period (Safely scoped by date)
        if (employeeIds.length > 0) {
          await tx.target.deleteMany({
            where: {
              organizationId,
              assigneeId: { in: employeeIds },
              dueDate: {
                gte: cycle.startDate,
                lte: cycle.endDate
              }
            }
          });
        }

        // 4. Wipe ALL Performance history entries related to this cycle (Improved Matching)
        await tx.employeeHistory.deleteMany({
          where: {
            organizationId,
            type: 'PERFORMANCE',
            OR: [
              { description: { contains: cycleId } },
              { description: { contains: cycle.title } },
              { title: { contains: cycle.title } }
            ]
          }
        });

        // 5. Delete the packets
        await tx.appraisalPacket.deleteMany({
          where: { id: { in: packetIds }, organizationId }
        });

        // 6. Absolute Legacy Scour (Ghost Prevention)
        const legacyCycles = await tx.reviewCycle.findMany({
          where: { organizationId, OR: [{ title: cycle.title }, { id: cycleId }] }
        });
        const legacyCycleIds = legacyCycles.map((lc: any) => lc.id);
        if (legacyCycleIds.length > 0) {
          const lReviews = await tx.performanceReviewV2.findMany({ where: { cycleId: { in: legacyCycleIds } } });
          const lReviewIds = lReviews.map((lr: any) => lr.id);
          if (lReviewIds.length > 0) {
            await tx.performanceScore.deleteMany({ where: { performanceReviewId: { in: lReviewIds } } });
            await tx.performanceReviewV2.deleteMany({ where: { id: { in: lReviewIds } } });
          }
          await tx.reviewCycle.deleteMany({ where: { id: { in: legacyCycleIds } } });
        }
      }

      // 7. Final Orphan Sweep (Domain Sanctity)
      await this.cleanupOrphanedPackets(organizationId);

      // 8. Delete the cycle itself
      return await tx.appraisalCycle.delete({
        where: { id: cycleId }
      });
    });
  }


  /**
   * Submit a review for a specific stage
   */
  static async submitReview(packetId: string, userId: string, organizationId: string, reviewData: any) {
    const packet = await prisma.appraisalPacket.findUnique({
      where: { id: packetId, organizationId },
      include: { employee: true }
    });

    if (!packet) throw new Error('Appraisal packet not found');
    
    // Permission check based on stage (Directors and MDs have global review rights)
    const currentStage = packet.currentStage;
    const userRank = reviewData.userRank || 0;
    const userDeptId = reviewData.userDeptId; // Passed from controller
    const isOwner = this.isStageOwner(packet, currentStage, userId, userRank, userDeptId);
    
    if (!isOwner) throw new Error(`You are not the authorized reviewer for the ${currentStage} stage.`);

    if (!reviewData.overallRating || Number(reviewData.overallRating) === 0) {
      throw new Error('A valid overall rating is required before finalization.');
    }
    if (!reviewData.summary || String(reviewData.summary).trim().length < 10) {
      throw new Error('Please provide a more detailed summary (at least 11 characters).');
    }

    // Whitelist safe fields only (prevent arbitrary field injection)
    const { overallRating, summary, strengths, weaknesses, achievements, developmentNeeds, responses } = reviewData;
    const safeData = {
      ...(overallRating !== undefined && { overallRating: Number(overallRating) }),
      ...(summary !== undefined && { summary: String(summary) }),
      ...(strengths !== undefined && { strengths: String(strengths) }),
      ...(weaknesses !== undefined && { weaknesses: String(weaknesses) }),
      ...(achievements !== undefined && { achievements: String(achievements) }),
      ...(developmentNeeds !== undefined && { developmentNeeds: String(developmentNeeds) }),
      ...(responses !== undefined && { responses: typeof responses === 'string' ? responses : JSON.stringify(responses) }),
    };

    // Create or Update the review layer
    const review = await prisma.appraisalReview.upsert({
      where: {
        packetId_reviewStage: {
          packetId,
          reviewStage: currentStage
        }
      },
      update: {
        ...safeData,
        status: 'SUBMITTED',
        submittedAt: new Date()
      },
      create: {
        organizationId,
        packetId,
        reviewerId: userId,
        reviewStage: currentStage,
        ...safeData,
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });

    // 📜 Log to Employee History
    await prisma.employeeHistory.create({
      data: {
        organizationId,
        employeeId: packet.employeeId,
        title: 'Appraisal Review Submitted',
        description: `A ${currentStage.replace('_', ' ').toLowerCase()} was submitted by ${userId}.`,
        type: 'PERFORMANCE',
        severity: 'INFO',
        createdById: userId
      }
    });

    // Advance to next stage logic
    await this.advancePacket(packetId, organizationId);

    // If Manager Review, Check for Gaps (>15% / 1 point)
    if (currentStage === 'MANAGER_REVIEW') {
      await this.checkForDisputeGaps(packetId, organizationId);
    }

    return review;
  }

  /**
   * Check for significant gaps between Self and Supervisor ratings
   */
  private static async checkForDisputeGaps(packetId: string, organizationId: string) {
    const packet = await prisma.appraisalPacket.findUnique({
      where: { id: packetId, organizationId },
      include: { reviews: true }
    });
    if (!packet) return;

    const selfReview = packet.reviews.find((r: any) => r.reviewStage === 'SELF_REVIEW');
    const managerReview = packet.reviews.find((r: any) => r.reviewStage === 'MANAGER_REVIEW');

    if (selfReview && managerReview) {
      const selfScore = Number(selfReview.overallRating) || 0;
      const managerScore = Number(managerReview.overallRating) || 0;
      const gap = Math.abs(selfScore - managerScore);

      // ── CONSENSUS FAST-TRACK ──────────────────────────────────────────────
      // If there is NO variation (0 gap), "write it off as accepted" (Auto-Complete)
      if (gap === 0 && selfScore > 0) {
        await prisma.appraisalPacket.update({
          where: { id: packetId },
          data: { 
            status: 'COMPLETED', 
            currentStage: 'COMPLETED',
            finalScore: selfScore,
            finalVerdict: 'Evaluation Accepted: The employee and manager reviews are identical, and the evaluation has been finalized.' 
          }
        });
        
        await notify(packet.employeeId, '✅ Appraisal Auto-Accepted', `Your evaluation was auto-accepted as there was no variation between your self-review and the manager's review.`, 'SUCCESS', '/performance/history');
        return; 
      }
      
      // If gap is > 15 points (on 0-100 scale)
      if (gap >= 15) {
        await prisma.appraisalPacket.update({
          where: { id: packetId },
          data: { 
            gapDetected: true, 
            disputeReason: 'A significant difference was found between the self-review and the manager review.' 
          }
        });
        
        // Notify HR
        if (packet.hrReviewerId) {
          await notify(packet.hrReviewerId, '⚖️ Appraisal Gap Flagged', `A significant rating gap was detected in ${packetId}. No formal dispute raised yet.`, 'INFO', `/reviews/packet/${packetId}`);
        }
      }

      // ── AI CALIBRATION SYNC ──────────────────────────────────────────────
      // Use Cortex AI to analyze the sentiment of the manager's review
      if (managerReview.summary) {
         try {
            const aiScore = await this.analyzeSentiment(managerReview.summary, managerScore);
            await prisma.appraisalReview.update({
               where: { id: managerReview.id },
               data: { aiCalibrationScore: aiScore }
            });
         } catch (e) { console.warn('[AppraisalService] AI Calibration failed:', e); }
      }
    }
  }

  /**
   * AI Sentiment Calibration: Checks if the written summary matches the numerical rating
   */
  private static async analyzeSentiment(summary: string, score: number): Promise<number> {
     const apiKey = process.env.GEMINI_API_KEY;
     if (!apiKey) return 100; // Skip if no AI key

     const genAI = new GoogleGenerativeAI(apiKey);
     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

     const prompt = `
        Analyze the relationship between a performance review comment and its score (0-100 scale).
        Comment: "${summary}"
        Numerical Score: ${score}
        
        Return a single number representing the "Calibration Score" (0-100).
        - 100: The tone perfectly matches the score.
        - 0: The tone and score are completely contradictory (e.g., glowing text but low score, or critical text but 100/100 score).
        
        Return ONLY the number.
     `;

     const result = await model.generateContent(prompt);
     const text = result.response.text().trim();
     return parseInt(text) || 100;
  }

  /**
   * KPI Pulse Sync: Pulls real-time target completion data for the appraisal period
   */
  static async syncKpiScores(packetId: string, organizationId: string) {
     const packet = await prisma.appraisalPacket.findUnique({
        where: { id: packetId, organizationId },
        include: { cycle: true }
     });
     if (!packet) return 0;

     const targets = await prisma.target.findMany({
        where: {
           organizationId,
           assigneeId: packet.employeeId,
           dueDate: { gte: packet.cycle.startDate, lte: packet.cycle.endDate },
           isArchived: false
        },
        include: { metrics: true }
     });

     if (targets.length === 0) return 0;

     let totalProgress = 0;
     targets.forEach(t => {
        const targetProgress = t.metrics.reduce((acc, m) => {
           const prog = (Number(m.currentValue || 0) / Number(m.targetValue || 1)) * 100;
           return acc + Math.min(100, prog);
        }, 0) / (t.metrics.length || 1);
        totalProgress += targetProgress;
     });

     const finalKpiScore = Math.round(totalProgress / targets.length);
     
     await prisma.appraisalPacket.update({
        where: { id: packetId },
        data: { kpiScore: finalKpiScore }
     });

     return finalKpiScore;
  }

  /**
   * Raise a formal dispute
   */
  static async raiseDispute(packetId: string, userId: string, organizationId: string, reason: string) {
    const packet = await prisma.appraisalPacket.findUnique({
      where: { id: packetId, organizationId }
    });
    if (!packet) throw new Error('Packet not found');
    if (packet.employeeId !== userId) throw new Error('Only the employee can raise a dispute.');

    return prisma.appraisalPacket.update({
      where: { id: packetId },
      data: {
        isDisputed: true,
        disputeReason: reason,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Resolve a dispute (HR/MD)
   */
  static async resolveDispute(packetId: string, userId: string, organizationId: string, resolution: string, finalScore?: number, finalVerdict?: string) {
    return prisma.appraisalPacket.update({
      where: { id: packetId, organizationId },
      data: {
        isDisputed: false,
        disputeResolution: resolution,
        disputeResolvedAt: new Date(),
        resolvedById: userId,
        currentStage: 'COMPLETED',
        status: 'COMPLETED',
        ...(finalScore !== undefined && { finalScore: Number(finalScore) }),
        ...(finalVerdict !== undefined && { finalVerdict: String(finalVerdict) }),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Internal: Move packet to next valid stage
   */
  private static async advancePacket(packetId: string, organizationId: string) {
    const packet = await prisma.appraisalPacket.findUnique({
      where: { id: packetId, organizationId },
      include: { employee: true, cycle: true }
    });

    if (!packet) return;

    const currentIndex = APPRAISAL_STAGES.indexOf(packet.currentStage);
    let nextIndex = currentIndex + 1;
    let nextStageFound = false;
    let nextStage = 'COMPLETED';

    while (nextIndex < APPRAISAL_STAGES.length) {
      const candidateStage = APPRAISAL_STAGES[nextIndex];
      const reviewerId = this.getReviewerForStage(packet, candidateStage);

      // Rule: Skip if no valid reviewer
      if (!reviewerId) {
        nextIndex++;
        continue;
      }

      // Rule: Collapse duplicates (if next reviewer is same as current)
      const currentReviewer = this.getReviewerForStage(packet, packet.currentStage);
      if (reviewerId === currentReviewer) {
        nextIndex++;
        continue;
      }

      nextStage = candidateStage;
      nextStageFound = true;
      break;
    }

    await prisma.appraisalPacket.update({
      where: { id: packetId },
      data: {
        currentStage: nextStage,
        status: nextStage === 'COMPLETED' ? 'COMPLETED' : 'OPEN'
      }
    });

    // ── FINALIZATION LOGIC ──
    if (nextStage === 'COMPLETED') {
      // 1. Notify Employee
      await notify(packet.employeeId, '🏆 Appraisal Cycle Completed', `Your appraisal cycle for "${packet.cycle.title}" has been finalized.`, 'SUCCESS', '/performance/history');
      
      // 2. Log to Employee History
      await prisma.employeeHistory.create({
        data: {
          organizationId,
          employeeId: packet.employeeId,
          title: 'Appraisal Cycle Completed',
          description: `The 2-step appraisal review process was completed and finalized.`,
          type: 'PERFORMANCE',
          severity: 'SUCCESS',
          createdById: 'SYSTEM'
        }
      });
    }

    // Notify next reviewer
    if (nextStageFound) {
      const nextReviewerId = this.getReviewerForStage(packet, nextStage);
      if (nextReviewerId) {
        await notify(nextReviewerId, '📋 Appraisal Review Pending', `You have a pending review for ${packet.employee.fullName}`, 'INFO', '/team/appraisals');
      }
    }
  }

  private static isStageOwner(packet: any, stage: string, userId: string, userRank: number = 0, reviewerDeptId?: number): boolean {
    // Global Oversight: Directors (80) and MDs (90) can review any stage if the packet is open
    if (userRank >= 80 && packet.status === 'OPEN') return true;

    if (stage === 'SELF_REVIEW') return packet.employeeId === userId;
    
    if (stage === 'MANAGER_REVIEW') {
      const isPrimary = packet.supervisorId === userId || packet.managerId === userId || packet.matrixSupervisorId === userId;
      // Departmental Fallback: Allow any Manager (70+) in the same department to review
      const isDeptManager = userRank >= 70 && packet.employee?.departmentId && reviewerDeptId === packet.employee?.departmentId;
      return isPrimary || isDeptManager;
    }

    if (stage === 'FINAL_REVIEW') {
      // Specifically check for assigned final reviewers or senior management (MD/Director/HR = 85+)
      return packet.finalReviewerId === userId || packet.hrReviewerId === userId || userRank >= 85; 
    }
    return false;
  }

  private static getReviewerForStage(packet: any, stage: string): string | null {
    if (stage === 'SELF_REVIEW') return packet.employeeId;
    if (stage === 'MANAGER_REVIEW') return packet.supervisorId || packet.managerId;
    if (stage === 'FINAL_REVIEW') return packet.finalReviewerId || packet.hrReviewerId;
    return null;
  }

  static async getPacketDetail(packetId: string, userId: string, organizationId: string, userRank: number = 0) {
    const start = Date.now();
    console.log(`[AppraisalSync] Fetching packet ${packetId} for user ${userId} in Org ${organizationId}`);
    
    try {
      // ⏱️ Query Timeout Wrapper (12.5s)
      const packet = await Promise.race([
        prisma.appraisalPacket.findUnique({
          where: { id: packetId, organizationId },
          include: {
            employee: { select: { id: true, fullName: true, avatarUrl: true, jobTitle: true, departmentId: true } },
            cycle: true,
            reviews: {
              include: { reviewer: { select: { fullName: true, avatarUrl: true } } },
              orderBy: { submittedAt: 'asc' }
            }
          }
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('The system connection timed out (12.5s). Please try again.')), 12500))
      ]);

      const elapsed = Date.now() - start;
      console.log(`[AppraisalSync] DB fetch completed in ${elapsed}ms`);

      if (!packet) {
        console.warn(`[AppraisalSync] Packet ${packetId} not found in Org ${organizationId}`);
        return null;
      }

      // 🔒 STRATEGIC PRIVACY LOGIC (Permanent Comment Redaction)
      // Rank 85+ (HR/Director/MD) bypasses all redaction for institutional oversight
      const isHighRank = userRank >= 85;

      if (!isHighRank) {
        const reviews = packet.reviews.map((r: any) => {
          const isMyReview = r.reviewerId === userId;
          
          if (!isMyReview) {
            // 🔒 Strict Redaction for non-HR/MD users
            const redactedReview = {
              ...r,
              summary: '[Blind Review: Visible to Management Only]',
              strengths: '[Hidden]',
              weaknesses: '[Hidden]',
              achievements: '[Hidden]',
              developmentNeeds: '[Hidden]',
              overallRating: null, // 🔒 Hide score too as requested
            };

            if (r.responses) {
              try {
                const data = JSON.parse(r.responses);
                if (data.competencyScores) {
                  data.competencyScores = data.competencyScores.map((cat: any) => ({
                    ...cat,
                    competencies: cat.competencies.map((comp: any) => ({
                      ...comp,
                      comment: '[Protected]',
                      score: null // 🔒 Hide individual scores too
                    }))
                  }));
                }
                redactedReview.responses = JSON.stringify(data);
              } catch (e) {
                redactedReview.responses = '{}';
              }
            }
            return redactedReview;
          }
          return r;
        });

        // ── BLIND REVIEW OVERRIDE ──
        // If manager hasn't submitted yet, they should still be in Blind Mode for ratings too
        const isManager = packet.supervisorId === userId || packet.managerId === userId || packet.matrixSupervisorId === userId;
        const hasManagerSubmitted = packet.reviews.some((r: any) => r.reviewerId === userId && r.reviewStage === 'MANAGER_REVIEW');
        
        if (isManager && !hasManagerSubmitted) {
            const blindReviews = reviews.map((r: any) => {
                if (r.reviewStage === 'SELF_REVIEW') {
                    return { ...r, overallRating: null };
                }
                return r;
            });
            return { ...packet, reviews: blindReviews };
        }

        // 🔒 Redact finalScore if present to ensure complete privacy
        return { ...packet, reviews, finalScore: null };
      }

      return packet;
    } catch (err: any) {
      console.error(`[AppraisalSync] Critical query failure for ${packetId}:`, err.message);
      throw err;
    }
  }

  static async getEmployeePackets(employeeId: string, organizationId: string) {
    return prisma.appraisalPacket.findMany({
      where: { employeeId, organizationId },
      include: {
        cycle: true,
        employee: { select: { fullName: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getEmployeePerformanceTrend(employeeId: string, organizationId: string) {
    const packets = await prisma.appraisalPacket.findMany({
      where: { 
        employeeId, 
        organizationId,
        status: 'COMPLETED',
        finalScore: { not: null }
      },
      include: {
        cycle: {
          select: { title: true, startDate: true }
        }
      },
      orderBy: { cycle: { startDate: 'asc' } }
    });

    return packets.map(p => ({
      cycleTitle: p.cycle.title,
      score: Number(p.finalScore || 0),
      date: p.cycle.startDate
    }));
  }

  static async getReviewerPackets(userId: string, organizationId: string, userRank: number = 0) {
    // If Director or MD, they see ALL open packets for their organization (Global Oversight)
    if (userRank >= 80) {
      return prisma.appraisalPacket.findMany({
        where: { 
          organizationId,
          status: { not: 'CANCELLED' }
        },
        include: {
          cycle: true,
          employee: { select: { fullName: true, avatarUrl: true, jobTitle: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });
    }

    return prisma.appraisalPacket.findMany({
      where: {
        organizationId,
        OR: [
          { supervisorId: userId },
          { matrixSupervisorId: userId },
          { managerId: userId },
          { hrReviewerId: userId },
          { finalReviewerId: userId }
        ]
      },
      include: {
        cycle: true,
        employee: { select: { fullName: true, avatarUrl: true, jobTitle: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Get packets awaiting final institutional sign-off (for MD/Director)
   */
  static async getFinalVerdictList(organizationId: string) {
    return prisma.appraisalPacket.findMany({
      where: {
        organizationId,
        currentStage: 'FINAL_REVIEW',
        status: 'OPEN'
      },
      include: {
        employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true } },
        cycle: true,
        reviews: {
          include: { reviewer: { select: { fullName: true } } }
        }
      },
      orderBy: { updatedAt: 'asc' }
    });
  }

  /**
   * Final Sign-off: Close the packet and set final status with optional MD score override
   */
  static async finalizePacket(packetId: string, userId: string, organizationId: string, finalVerdict?: string, finalScore?: number, arbitrationLogic?: string, assignedTargets: any[] = []) {
    const packet = await prisma.appraisalPacket.findUnique({
      where: { id: packetId, organizationId },
      include: { employee: true }
    });

    if (!packet) throw new Error('Packet not found');
    if (packet.currentStage !== 'FINAL_REVIEW') throw new Error('Packet is not in the final review stage');

    const updated = await prisma.appraisalPacket.update({
      where: { id: packetId },
      data: {
        currentStage: 'COMPLETED',
        status: 'COMPLETED',
        finalVerdict: finalVerdict || 'This evaluation has been officially completed and closed.',
        arbitrationLogic: arbitrationLogic || 'MD_CALIBRATION',
        ...(finalScore !== undefined && { finalScore: Number(finalScore) }),
        updatedAt: new Date()
      }
    });

    // 🎯 Process Assigned Growth Targets
    if (assignedTargets && assignedTargets.length > 0) {
      for (const t of assignedTargets) {
        const target = await prisma.target.create({
          data: {
            organizationId,
            title: `Growth: ${t.title}`,
            description: t.description,
            assigneeId: packet.employeeId,
            originatorId: userId,
            status: 'ASSIGNED',
            level: 'INDIVIDUAL',
            type: 'SINGLE',
            dueDate: new Date(new Date().setDate(new Date().getDate() + 90)), // 90 Days default
          }
        });

        // Requirement: Every goal must have a measurable result
        await prisma.targetMetric.create({
          data: {
            organizationId,
            targetId: target.id,
            title: t.metricTitle || `Target: ${t.title}`,
            description: t.metricDescription || t.description,
            metricType: t.metricType || 'NUMERICAL',
            targetValue: t.metricValue || 1,
            unit: t.metricUnit || 'units'
          }
        });
      }
    }

    // 📜 Log to Employee History
    await prisma.employeeHistory.create({
      data: {
        organizationId,
        employeeId: packet.employeeId,
        title: 'Appraisal Cycle Completed',
        description: `The appraisal cycle was finalized. Verdict: ${finalVerdict || 'Closed'}. ${assignedTargets.length} growth targets assigned.`,
        type: 'PERFORMANCE',
        severity: 'SUCCESS',
        createdById: userId
      }
    });

    return updated;
  }


  /**
   * Calculate a suggested institutional score based on 20/80 weight (Self/Manager)
   */
  static calculateSuggestedScore(reviews: any[]): number {
    const selfReview = reviews.find(r => r.reviewStage === 'SELF_REVIEW' && r.status === 'SUBMITTED');
    const managerReview = reviews.find(r => r.reviewStage === 'MANAGER_REVIEW' && r.status === 'SUBMITTED');

    if (!managerReview) return 0; // Cannot suggest without manage assessment

    const managerScore = Number(managerReview.overallRating) || 0;
    
    // If no self review, 100% manager weight
    if (!selfReview) return managerScore;

    const selfScore = Number(selfReview.overallRating) || 0;
    
    // 20/80 Weighting Rule
    const suggestion = (selfScore * 0.2) + (managerScore * 0.8);
    return Math.round(suggestion);
  }

  /**
   * Update an appraisal packet (admin/MD only)
   */
  static async updatePacket(organizationId: string, packetId: string, data: any) {
    const { supervisorId, managerId, matrixSupervisorId, hrReviewerId, finalReviewerId, currentStage, status, gapDetected } = data;
    
    return prisma.appraisalPacket.update({
      where: { id: packetId, organizationId },
      data: {
        ...(supervisorId !== undefined && { supervisorId }),
        ...(managerId !== undefined && { managerId }),
        ...(matrixSupervisorId !== undefined && { matrixSupervisorId }),
        ...(hrReviewerId !== undefined && { hrReviewerId }),
        ...(finalReviewerId !== undefined && { finalReviewerId }),
        ...(currentStage !== undefined && { currentStage }),
        ...(status !== undefined && { status }),
        ...(gapDetected !== undefined && { gapDetected }),
        updatedAt: new Date()
      }
    });
  }
  /**
   * Delete an appraisal packet and ALL associated reviews (hard purge)
   */
  static async deletePacket(organizationId: string, packetId: string) {
    const packet = await prisma.appraisalPacket.findFirst({
      where: { id: packetId, organizationId },
      include: { cycle: true }
    });
    if (!packet) throw new Error('Appraisal packet not found');

    return await prisma.$transaction(async (tx) => {
      // 1. Wipe all reviews for this packet
      await tx.appraisalReview.deleteMany({ where: { packetId } });

      // 2. Purge associated individual targets for this period
      if (packet.cycle) {
        await tx.target.deleteMany({
          where: {
            organizationId,
            assigneeId: packet.employeeId,
            dueDate: {
              gte: packet.cycle.startDate,
              lte: packet.cycle.endDate
            }
          }
        });
      }

      // 3. Wipe Performance history entries related to this specific packet
      await tx.employeeHistory.deleteMany({
        where: {
          organizationId,
          employeeId: packet.employeeId,
          type: 'PERFORMANCE',
          description: { contains: packetId }
        }
      });

      // 4. Delete the packet itself
      return await tx.appraisalPacket.delete({ 
        where: { id: packetId } 
      });
    });
  }


  /**
   * Get all packets for a specific cycle (MD/HR Oversight)
   */
  static async getCyclePackets(organizationId: string, cycleId: string) {
    return prisma.appraisalPacket.findMany({
      where: { organizationId, cycleId },
      include: {
        employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true } },
        reviews: {
          select: { reviewStage: true, status: true }
        }
      },
      orderBy: { employee: { fullName: 'asc' } }
    });
  }

  /**
   * NUCLEAR PURGE: Identify and eliminate orphaned packets
   * Find packets whose cycleId does not exist in the AppraisalCycle table.
   */
  /**
   * NUCLEAR PURGE: Identify and eliminate ALL ghost records across the appraisal domain
   * Finds orphans in both modern (V3) and legacy (V2) systems.
   */
  static async cleanupOrphanedPackets(organizationId: string) {
    console.log(`[AppraisalPurge] Initiating Comprehensive Domain Purge for: ${organizationId}`);
    
    // 1. Fetch all valid cycle references
    const activeModernCycles = await prisma.appraisalCycle.findMany({
      where: { organizationId },
      select: { id: true, title: true }
    });
    const activeLegacyCycles = await prisma.reviewCycle.findMany({
      where: { organizationId },
      select: { id: true }
    });

    const validModernIds = activeModernCycles.map(c => c.id);
    const validLegacyIds = activeLegacyCycles.map(c => c.id);
    const activeTitles = activeModernCycles.map(c => c.title);

    let totalPurged = 0;

    return await prisma.$transaction(async (tx) => {
      // A. WIPE MODERN ORPHANS (AppraisalPacket / AppraisalReview)
      const orphanPackets = await tx.appraisalPacket.findMany({
        where: { organizationId, cycleId: { notIn: validModernIds } },
        select: { id: true }
      });
      const orphanPacketIds = orphanPackets.map(o => o.id);
      
      if (orphanPacketIds.length > 0) {
        await tx.appraisalReview.deleteMany({ where: { packetId: { in: orphanPacketIds } } });
        const res = await tx.appraisalPacket.deleteMany({ where: { id: { in: orphanPacketIds } } });
        totalPurged += res.count;
        console.log(`[AppraisalPurge] Eliminated ${res.count} modern orphans.`);
      }

      // B. WIPE LEGACY ORPHANS (PerformanceReviewV2 / PerformanceScore)
      const orphanLegacy = await tx.performanceReviewV2.findMany({
        where: { organizationId, cycleId: { notIn: validLegacyIds } },
        select: { id: true }
      });
      const orphanLegacyIds = orphanLegacy.map(o => o.id);

      if (orphanLegacyIds.length > 0) {
        await tx.performanceScore.deleteMany({ where: { performanceReviewId: { in: orphanLegacyIds } } });
        const res = await tx.performanceReviewV2.deleteMany({ where: { id: { in: orphanLegacyIds } } });
        totalPurged += res.count;
        console.log(`[AppraisalPurge] Eliminated ${res.count} legacy orphans.`);
      }

      // C. WIPE HISTORY CLUTTER (Performance History linking to deleted cycles)
      const orphanHistory = await tx.employeeHistory.deleteMany({
        where: {
          organizationId,
          type: 'PERFORMANCE',
          AND: [
             { NOT: { OR: validModernIds.map(id => ({ description: { contains: id } })) } },
             { NOT: { OR: activeTitles.map(t => ({ description: { contains: t } })) } },
             { NOT: { OR: activeTitles.map(t => ({ title: { contains: t } })) } }
          ]
        }
      });
      console.log(`[AppraisalPurge] Refined performance history logs. Cleaned records: ${orphanHistory.count}`);

      // D. CLEAR STALE NOTIFICATIONS (Appraisal related)
      const staleNotifications = await tx.notification.deleteMany({
        where: {
          organizationId,
          link: { contains: '/reviews/packet/' },
          AND: [
            { NOT: { OR: validModernIds.map(id => ({ link: { contains: id } })) } }
          ]
        }
      });
      console.log(`[AppraisalPurge] Purged ${staleNotifications.count} stale notifications.`);

      return { 
        count: totalPurged, 
        message: `Nuclear Purge Complete. Total records eliminated: ${totalPurged}. Dashboard integrity restored.` 
      };
    });
  }

  /**
   * FACTORY RESET: Wipe EVERY appraisal record for the organization.
   * Total annihilation of Cycles, Packets, Reviews, History, and Scores.
   */
  static async ultimateReset(organizationId: string) {
    console.log(`[AppraisalFactoryReset] INITIATING TOTAL DOMAIN WIPE for organization: ${organizationId}`);
    
    return await (prismaClient as any).$transaction(async (tx: any) => {
      // 1. Wipe Modern System
      await tx.appraisalReview.deleteMany({}); // No where clause = Absolute Wipe
      await tx.appraisalPacket.deleteMany({});
      await tx.appraisalCycle.deleteMany({});

      // 2. Wipe Legacy System
      await tx.performanceScore.deleteMany({});
      await tx.performanceReviewV2.deleteMany({});
      await tx.reviewCycle.deleteMany({});

      // 3. Clear Domain Auxiliaries
      await tx.employeeHistory.deleteMany({
        where: { type: 'PERFORMANCE' }
      });

      await tx.notification.deleteMany({
        where: {
          OR: [
            { link: { contains: '/reviews/packet/' } },
            { link: { contains: '/appraisals' } },
            { title: { contains: 'Appraisal' } }
          ]
        }
      });

      console.log(`[AppraisalFactoryReset] Organization domain successfully zeroed out.`);
      return { success: true, message: 'Institutional Appraisal Reset Complete. All ghost records and active cycles have been eliminated.' };
    });
  }
}

