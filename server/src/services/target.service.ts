import prisma from '../prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logAction } from './audit.service';
import { notify } from './websocket.service';
import { HierarchyService } from './hierarchy.service';

export class TargetService {
  /**
   * Create a new target (Department or Individual)
   */
  static async createTarget(data: any, originatorId: string, organizationId: string) {
    const { title, description, level, metrics, dueDate, departmentId, assigneeId, lineManagerId, reviewerId, type, weight, parentTargetId, contributionWeight, quarter, year } = data;
    const targetLevel = level || 'INDIVIDUAL';
    
    if (!title) throw new Error('Target title is required');
    if (targetLevel === 'INDIVIDUAL' && !assigneeId) throw new Error('Individual targets require an assignee');
    const referencedUsers = [originatorId, assigneeId, lineManagerId, reviewerId].filter((id): id is string => Boolean(id && id !== 'null'));
    const users = await prisma.user.findMany({ where: { organizationId, id: { in: referencedUsers } }, select: { id: true } });
    if (new Set(users.map(user => user.id)).size !== new Set(referencedUsers).size) throw new Error('One or more target participants are outside this organization');
    if (departmentId) {
      const department = await prisma.department.findFirst({ where: { id: Number(departmentId), organizationId }, select: { id: true } });
      if (!department) throw new Error('Target department is outside this organization');
    }
    if (parentTargetId) {
      const parent = await prisma.target.findFirst({ where: { id: parentTargetId, organizationId }, select: { id: true } });
      if (!parent) throw new Error('Parent target is outside this organization');
    }

    // Auto-assign lineManager if missing and level is INDIVIDUAL
    let finalLineManagerId = lineManagerId;
    if (targetLevel === 'INDIVIDUAL' && assigneeId && (!finalLineManagerId || finalLineManagerId === 'null')) {
      const assigneeUser = await prisma.user.findFirst({ where: { id: assigneeId, organizationId } });
      if (assigneeUser?.supervisorId) {
        finalLineManagerId = assigneeUser.supervisorId;
      }
    }
    if (finalLineManagerId && !users.some(user => user.id === finalLineManagerId)) {
      const manager = await prisma.user.findFirst({ where: { id: finalLineManagerId, organizationId }, select: { id: true } });
      if (!manager) throw new Error('Target line manager is outside this organization');
    }

    const target = await prisma.target.create({
      data: {
        organizationId,
        title,
        description,
        level: targetLevel,
        type: type || 'SINGLE',
        dueDate: dueDate ? new Date(dueDate) : null,
        quarter: quarter ? parseInt(String(quarter)) : null,
        year: year ? parseInt(String(year)) : null,
        originator: { connect: { id: originatorId } },
        assignee: (assigneeId && assigneeId !== '' && assigneeId !== 'null') ? { connect: { id: assigneeId } } : undefined,
        department: (departmentId && String(departmentId) !== '') ? { connect: { id: parseInt(String(departmentId)) } } : undefined,
        lineManager: (finalLineManagerId && finalLineManagerId !== '' && finalLineManagerId !== 'null') ? { connect: { id: finalLineManagerId } } : undefined,
        reviewer: (reviewerId && reviewerId !== '' && reviewerId !== 'null') 
          ? { connect: { id: reviewerId } } 
          : { connect: { id: finalLineManagerId || originatorId } },
        weight: parseFloat(String(weight)) || 1.0,
        contributionWeight: parseFloat(String(contributionWeight)) || 0,
        parentTarget: (parentTargetId && parentTargetId !== '' && parentTargetId !== 'null') ? { connect: { id: parentTargetId } } : undefined,
        status: 'ASSIGNED',
        metrics: {
          create: (metrics || []).map((m: any) => ({
            organizationId,
            title: m.title || 'Untitled Metric',
            description: m.description || '',
            metricType: m.metricType || 'NUMERICAL',
            targetValue: m.targetValue !== undefined && m.targetValue !== '' ? parseFloat(String(m.targetValue)) : null,
            unit: m.unit || '',
            weight: m.weight !== undefined && m.weight !== '' ? parseFloat(String(m.weight)) : 1.0
          }))
        }
      },
      include: { metrics: true }
    });

    // Notify Assignee
    if (assigneeId) {
      await notify(assigneeId, '🎯 New Target Assigned', `You have been assigned a new target: ${title}`, 'INFO', '/performance');
    }

    // Notify Line Manager if different from originator
    if (finalLineManagerId && finalLineManagerId !== originatorId) {
      await notify(finalLineManagerId, '🎯 Target Assigned to Your Team', `A new target "${title}" has been assigned to your direct report.`, 'INFO', '/team');
    }

    return target;
  }

  /**
   * Cascade a Department target to individual staff members
   */
  static async cascadeTarget(parentTargetId: string, staffAssignments: any[], managerId: string, organizationId: string) {
    const parentTarget = await prisma.target.findUnique({
      where: { id: parentTargetId },
      include: { metrics: true }
    });

    if (!parentTarget || parentTarget.organizationId !== organizationId) throw new Error('Parent target not found');
    if (parentTarget.level !== 'DEPARTMENT') throw new Error('Only Department targets can be cascaded');
    const department = parentTarget.departmentId
      ? await prisma.department.findFirst({ where: { id: parentTarget.departmentId, organizationId }, select: { managerId: true } })
      : null;
    const canCascade = [parentTarget.originatorId, parentTarget.lineManagerId, parentTarget.reviewerId].includes(managerId) || department?.managerId === managerId;
    if (!canCascade) throw new Error('Only the owning manager may cascade this target');
    const managedEmployeeIds = await HierarchyService.getManagedEmployeeIds(managerId, organizationId);
    const assignmentIds = [...new Set((staffAssignments || []).map((assignment: any) => assignment.staffId).filter(Boolean))] as string[];
    const employees = await prisma.user.findMany({ where: { organizationId, id: { in: assignmentIds }, isArchived: false }, select: { id: true } });
    if (employees.length !== assignmentIds.length || assignmentIds.some(id => !managedEmployeeIds.includes(id))) {
      throw new Error('Targets may only be cascaded to employees in your reporting scope');
    }

    const createdTargets: any[] = [];
    const autoWeight = staffAssignments.length > 0 ? (100 / staffAssignments.length) : 0;

    for (const assignment of staffAssignments) {
      const { staffId, weightRatio = 1.0 } = assignment;
      
      // Check if this staff already has a cascaded target for this parent
      const existing = await prisma.target.findFirst({
        where: { parentTargetId, assigneeId: staffId, isArchived: false }
      });

      if (existing) continue;

      const newTarget = await prisma.target.create({
        data: {
          organizationId,
          title: `[CASCADED] ${parentTarget.title}`,
          description: parentTarget.description,
          level: 'INDIVIDUAL',
          parentTargetId: parentTarget.id,
          assigneeId: staffId,
          originatorId: managerId,
          lineManagerId: managerId,
          reviewerId: managerId,
          dueDate: parentTarget.dueDate,
          weight: Number(parentTarget.weight) * weightRatio,
          contributionWeight: autoWeight, // Auto-distribute contribution to parent
          status: 'ASSIGNED',
          metrics: {
            create: parentTarget.metrics.map(m => ({
              organizationId,
              title: m.title,
              description: m.description,
              metricType: m.metricType,
              targetValue: m.targetValue ? Number(m.targetValue) * weightRatio : null,
              unit: m.unit,
              weight: m.weight
            }))
          }
        }
      });
      createdTargets.push(newTarget);
      await notify(staffId, '🎯 Cascaded Target Assigned', `A departmental goal has been cascaded to you: ${parentTarget.title}`, 'INFO', '/performance');
    }

    return createdTargets;
  }

  /**
   * Reassign an existing cascaded target to a different employee
   */
  static async reassignTarget(targetId: string, newAssigneeId: string, managerId: string, organizationId: string) {
    const target = await prisma.target.findUnique({
      where: { id: targetId },
      include: { metrics: true }
    });

    if (!target || target.organizationId !== organizationId) throw new Error('Target not found');
    if (target.level !== 'INDIVIDUAL') throw new Error('Only individual/cascaded targets can be reassigned');

    const oldAssigneeId = target.assigneeId;

    return await prisma.$transaction(async (tx) => {
      // 1. Log the reassignment for audit
      await tx.targetUpdate.create({
        data: {
          organizationId,
          targetId: targetId,
          submittedById: managerId,
          value: 0,
          comment: `Target reassigned from ${oldAssigneeId} to ${newAssigneeId}. Progress reset.`
        }
      });

      // 2. Reset Metrics and update assignee
      await tx.targetMetric.updateMany({
        where: { targetId: targetId },
        data: { currentValue: 0 }
      });

      const updated = await tx.target.update({
        where: { id: targetId },
        data: {
          assigneeId: newAssigneeId,
          status: 'ASSIGNED',
          progress: 0,
          updatedAt: new Date()
        }
      });

      // 3. Notify parties
      if (oldAssigneeId) {
        await notify(oldAssigneeId, '🚫 Target Removed', `The target "${target.title}" has been reassigned to another team member.`, 'WARNING', '/performance');
      }
      await notify(newAssigneeId, '🎯 Target Reassigned to You', `You have taken over responsibility for: ${target.title}`, 'INFO', '/performance');

      return updated;
    });
  }

  /**
   * Staff acknowledges a target or requests clarification
   */
  static async acknowledge(targetId: string, userId: string, organizationId: string, status: 'ACKNOWLEDGED' | 'CLARIFICATION_REQUESTED', message?: string) {
    const target = await prisma.target.findUnique({
      where: { id: targetId }
    });

    if (!target || target.organizationId !== organizationId) throw new Error('Target not found');
    if (target.assigneeId !== userId) throw new Error('Not authorized to acknowledge this target');
    if (target.status !== 'ASSIGNED' && target.status !== 'CLARIFICATION_REQUESTED') throw new Error('Target is not in a state that allows acknowledgment');

    // Explicit acknowledgement record
    await prisma.targetAcknowledgement.create({
      data: {
        organizationId,
        target: { connect: { id: targetId } },
        user: { connect: { id: userId } },
        status: status,
        message: message
      }
    });

    // Update target status correctly
    const nextStatus = status === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED' : 'CLARIFICATION_REQUESTED';
    await prisma.target.update({
      where: { id: targetId },
      data: { status: nextStatus }
    });

    // Notify Originator
    await notify(target.originatorId, 
      status === 'ACKNOWLEDGED' ? '✅ Target Acknowledged' : '❓ Clarification Requested',
      `Staff ${userId} has ${status.toLowerCase()} the target: ${target.title}`, 
      status === 'ACKNOWLEDGED' ? 'SUCCESS' : 'WARNING', 
      '/team'
    );

    return target;
  }

  /**
   * Update an existing target and its metrics
   */
  static async updateTarget(targetId: string, orgId: string, data: any) {
    const { title, description, dueDate, weight, contributionWeight, status, metrics, quarter, year } = data;

    const target = await prisma.target.findUnique({
      where: { id: targetId },
      include: { metrics: true }
    });

    if (!target || target.organizationId !== orgId) throw new Error('Target not found');

    return await prisma.$transaction(async (tx) => {
      // 1. Update metadata
      const updatedTarget = await tx.target.update({
        where: { id: targetId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(quarter !== undefined && { quarter: quarter !== null ? parseInt(String(quarter)) : null }),
          ...(year !== undefined && { year: year !== null ? parseInt(String(year)) : null }),
          ...(weight !== undefined && { weight: parseFloat(String(weight)) }),
          ...(contributionWeight !== undefined && { contributionWeight: parseFloat(String(contributionWeight)) }),
          ...(status !== undefined && { status }),
        }
      });

      // 2. Sync Metrics if provided
      if (metrics && Array.isArray(metrics)) {
        const incomingMetricIds = metrics.map(m => m.id).filter(Boolean);
        const existingMetricIds = target.metrics.map(m => m.id);

        // A. Delete removed metrics
        const metricsToDelete = existingMetricIds.filter(id => !incomingMetricIds.includes(id));
        if (metricsToDelete.length > 0) {
          await tx.targetMetric.deleteMany({
            where: { id: { in: metricsToDelete } }
          });
        }

        // B. Upsert metrics
        for (const m of metrics) {
          if (m.id) {
            // Update
            await tx.targetMetric.update({
              where: { id: m.id },
              data: {
                title: m.title,
                description: m.description,
                metricType: m.metricType,
                targetValue: m.targetValue !== undefined && m.targetValue !== '' ? parseFloat(String(m.targetValue)) : null,
                unit: m.unit,
                weight: m.weight !== undefined && m.weight !== '' ? parseFloat(String(m.weight)) : 1.0
              }
            });
          } else {
            // Create
            await tx.targetMetric.create({
              data: {
                organizationId: orgId,
                targetId: targetId,
                title: m.title || 'Untitled Metric',
                description: m.description || '',
                metricType: m.metricType || 'NUMERICAL',
                targetValue: m.targetValue !== undefined && m.targetValue !== '' ? parseFloat(String(m.targetValue)) : null,
                unit: m.unit || '',
                weight: m.weight !== undefined && m.weight !== '' ? parseFloat(String(m.weight)) : 1.0
              }
            });
          }
        }
      }

      return updatedTarget;
    });
  }

  /**
   * Submit a progress update for a metric
   */
  static async updateProgress(targetId: string, metricUpdates: any[], userId: string, organizationId: string, submitForReview: boolean = false) {
    const target = await prisma.target.findUnique({
      where: { id: targetId },
      include: { metrics: true }
    });

    if (!target || target.organizationId !== organizationId) throw new Error('Target not found');
    if (target.assigneeId !== userId) throw new Error('Not authorized to update this target');
    
    // Spec says: Progress updates allowed only if ACKNOWLEDGED or IN_PROGRESS
    if (!['ACKNOWLEDGED', 'IN_PROGRESS'].includes(target.status)) {
      if (target.status === 'UNDER_REVIEW') {
        throw new Error('This goal is currently under review and cannot be updated.');
      }
      throw new Error(`Cannot update progress when goal is ${target.status.toLowerCase()}`);
    }

    for (const update of metricUpdates) {
      const { metricId, value, comment } = update;
      
      const metric = target.metrics.find(m => m.id === metricId);
      if (!metric) continue;

      // Create update log
      await prisma.targetUpdate.create({
        data: {
          organizationId,
          targetId: targetId,
          metricId: metricId,
          submittedById: userId,
          value: parseFloat(String(value)),
          comment: comment
        }
      });

      // Update current value on the metric
      if (metricId) {
        await prisma.targetMetric.update({
          where: { id: metricId },
          data: { currentValue: parseFloat(String(value)) }
        });
      }
    }

    const newStatus = submitForReview ? 'UNDER_REVIEW' : 'IN_PROGRESS';
    const updatedTarget = await prisma.target.update({
      where: { id: targetId },
      data: { status: newStatus }
    });

    // ── SYNC PROGRESS ──
    await this.syncTargetProgress(targetId);

    if (submitForReview && target.reviewerId) {
      await notify(target.reviewerId, '🎯 Target Awaiting Review', `Target "${target.title}" has been submitted for review.`, 'INFO', '/team');
    } else if (target.lineManagerId && target.lineManagerId !== userId) {
      // Notify line manager of general progress update
      await notify(target.lineManagerId, '📈 Target Progress Update', `Staff member has updated progress on: ${target.title}`, 'INFO', '/team');
    }

    return updatedTarget;
  }

  /**
   * Reviewer scores or rejects a target
   */
  static async reviewTarget(targetId: string, reviewerId: string, organizationId: string, approved: boolean, feedback?: string, reviewerRank: number = 0) {
    const target = await prisma.target.findUnique({
      where: { id: targetId }
    });

    if (!target || target.organizationId !== organizationId) throw new Error('Goal not found');

    const isExplicitReviewer = target.reviewerId === reviewerId || target.lineManagerId === reviewerId;

    if (!isExplicitReviewer) {
      throw new Error('You do not have permission to review this goal');
    }

    if (target.status !== 'UNDER_REVIEW') throw new Error('This goal is not awaiting review');

    const newStatus = approved ? 'COMPLETED' : 'IN_PROGRESS';
    
    const updatedTarget = await prisma.target.update({
      where: { id: targetId },
      data: { status: newStatus }
    });

    // ── SYNC PROGRESS ──
    await this.syncTargetProgress(targetId);

    if (approved) {
      // 📜 Log to Employee History
      await prisma.employeeHistory.create({
        data: {
          organizationId,
          employeeId: target.assigneeId || '',
          title: 'Target Achieved',
          description: `Target "${target.title}" was completed and verified.`,
          type: 'PERFORMANCE',
          severity: 'SUCCESS',
          createdById: reviewerId
        }
      });
    }

    if (target.assigneeId) {
      await notify(target.assigneeId, 
        approved ? '🎉 Target Completed' : '🔄 Target Returned',
        approved ? `Your target "${target.title}" has been marked as completed.` : `Your target was returned for correction: ${feedback}`,
        approved ? 'SUCCESS' : 'WARNING',
        '/performance'
      );
    }

    return updatedTarget;
  }

  /**
   * Calculate strategic rollup for a parent target
   */
  static async getStrategicRollup(targetId: string, organizationId: string) {
    const parent = await (prisma as any).target.findFirst({
      where: { id: targetId, organizationId, isArchived: false },
      include: {
        childTargets: {
          // @ts-ignore
          where: { isArchived: false },
          // @ts-ignore
          include: { metrics: true }
        },
        metrics: true
      }
    });

    if (!parent) return null;

    // Calculate progress of children
    const childContributions = (parent.childTargets as any[]).map(child => {
      const progress = Number(child.progress || 0);
      const weight = Number(child.contributionWeight || 0);
      return {
        id: child.id,
        title: child.title,
        progress: progress,
        contributionWeight: weight,
        weightedProgress: (progress * weight) / 100
      };
    });

    const totalWeightedProgress = childContributions.reduce((acc, c) => acc + c.weightedProgress, 0);

    return {
      parentId: parent.id,
      parentTitle: parent.title,
      totalProgress: Math.min(100, totalWeightedProgress),
      breakdown: childContributions
    };
  }

  /**
   * Archive a target (Soft Delete)
   */
  static async deleteTarget(targetId: string, orgId: string) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, organizationId: orgId },
      include: { childTargets: true }
    });

    if (!target) throw new Error('Target not found');

    // Recursively archive child targets
    for (const child of (target.childTargets || [])) {
      await this.deleteTarget(child.id, orgId);
    }

    return await (prisma as any).target.update({
      where: { id: targetId },
      data: { 
        isArchived: true, 
        archivedAt: new Date(),
        status: 'CANCELLED'
      }
    });
  }

  /**
   * Sync a target's progress from metrics OR children, then bubble up.
   */
  static async syncTargetProgress(targetId: string, visited: Set<string> = new Set()) {
    if (visited.has(targetId)) return;
    visited.add(targetId);

    const target = await (prisma as any).target.findUnique({
      where: { id: targetId },
      include: { 
        metrics: true, 
        childTargets: {
          // @ts-ignore
          where: { isArchived: false }
        } 
      }
    });

    if (!target || (target as any).isArchived) return;

    let progress = 0;

    // A. Composite Progress (from children)
    if (target.childTargets && (target.childTargets as any[]).length > 0) {
      let totalWeightedProgress = 0;
      (target.childTargets as any[]).forEach(child => {
        totalWeightedProgress += (Number(child.progress) * Number((child as any).contributionWeight || 0)) / 100;
      });
      progress = Math.min(100, totalWeightedProgress);
    } 
    // B. Direct Progress (from metrics)
    else if (target.metrics && (target.metrics as any[]).length > 0) {
      let totalProgress = 0;
      let totalWeight = 0;
      (target.metrics as any[]).forEach((m: any) => {
        if (m.targetValue && Number(m.targetValue) > 0) {
          const mProgress = Math.min(100, (Number(m.currentValue) / Number(m.targetValue)) * 100);
          totalProgress += mProgress * Number(m.weight || 1.0);
          totalWeight += Number(m.weight || 1.0);
        }
      });
      progress = totalWeight > 0 ? (totalProgress / totalWeight) : 0;
    }

    // Update target
    await (prisma as any).target.update({
      where: { id: targetId },
      data: { progress }
    });

    // Bubble Up
    if (target.parentTargetId) {
      await this.syncTargetProgress(target.parentTargetId, visited);
    }
  }

  /**
   * Global sync for all targets in an organization (Migration helper)
   * Optimized with batching to prevent memory exhaustion
   */
  static async syncAllTargets(organizationId: string) {
    const targets = await (prisma as any).target.findMany({
      where: { organizationId, isArchived: false },
      select: { id: true }
    });
    
    console.log(`[TargetService] Syncing progress for ${targets.length} targets in batches...`);
    
    const BATCH_SIZE = 50;
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      const visited = new Set<string>();
      await Promise.all(batch.map((t: any) => this.syncTargetProgress(t.id, visited)));
      
      // Small cooling period to allow GC and Event Loop to breathe
      if (i + BATCH_SIZE < targets.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    console.log(`[TargetService] Completed sync for ${targets.length} targets.`);
  }

  private static calculateTargetProgress(target: any): number {
    if (!target.metrics || target.metrics.length === 0) return Number(target.progress || 0);
    
    let totalProgress = 0;
    let totalWeight = 0;

    target.metrics.forEach((m: any) => {
      if (m.targetValue && Number(m.targetValue) > 0) {
        const progress = Math.min(100, (Number(m.currentValue) / Number(m.targetValue)) * 100);
        totalProgress += progress * Number(m.weight || 1.0);
        totalWeight += Number(m.weight || 1.0);
      }
    });

    return totalWeight > 0 ? totalProgress / totalWeight : 0;
  }

  /**
   * Cortex AI: Generates a SMART goal description based on a title and level
   */
  static async generateSmartDraft(title: string, level: string, department?: string): Promise<string> {
     const apiKey = process.env.GEMINI_API_KEY;
     if (!apiKey) return "AI drafting unavailable. Please set GEMINI_API_KEY.";

     const genAI = new GoogleGenerativeAI(apiKey);
     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

     const prompt = `
        As an expert HR consultant, convert this raw goal into a professional SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound).
        Goal Title: "${title}"
        Level: ${level}
        Department Context: ${department || 'General'}
        
        Provide a concise description (max 200 words) that includes:
        1. The specific outcome expected.
        2. How success will be measured.
        3. The institutional relevance.
        
        Tone: Professional, direct, and motivating.
        Return ONLY the drafted description text.
     `;

     const result = await model.generateContent(prompt);
     return result.response.text().trim();
  }

  /**
   * Risk Pulse: Analyzes confidence levels and progress to flag endangered goals
   */
  static async getRiskInsights(organizationId: string) {
     const endangered = await prisma.target.findMany({
        where: {
           organizationId,
           isArchived: false,
           status: { in: ['ACKNOWLEDGED', 'IN_PROGRESS'] },
           OR: [
              { confidenceLevel: 'BLOCKED' },
              { confidenceLevel: 'AT_RISK' },
              { progress: { lt: 20 } } // Low progress
           ]
        },
        include: { assignee: true, department: true }
     });

     return {
        endangeredCount: endangered.length,
        criticalBlockers: endangered.filter(t => t.confidenceLevel === 'BLOCKED'),
        atRisk: endangered.filter(t => t.confidenceLevel === 'AT_RISK'),
        insights: `There are ${endangered.length} targets currently flagged as high-risk. Institutional intervention is recommended for ${endangered.filter(t => t.confidenceLevel === 'BLOCKED').length} blocked initiatives.`
     };
  }
}
