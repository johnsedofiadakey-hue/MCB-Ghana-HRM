import prisma from '../prisma/client';
import { getRoleRank } from '../middleware/auth.middleware';

export interface InboxAction {
  id: string;
  type: 'TARGET_ACK' | 'TARGET_REVIEW' | 'APPRAISAL_REVIEW' | 'LEAVE_RELIEF' | 'LEAVE_APPROVE';
  title: string;
  subtitle: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  link: string;
  data?: any;
  createdAt: Date;
}

export class InboxService {
  static async getActions(organizationId: string, userId: string): Promise<InboxAction[]> {
    const actions: InboxAction[] = [];

    // 1. Targets (Assignee Acknowledge)
    try {
      const pendingTargets = await prisma.target.findMany({
        where: { organizationId, assigneeId: userId, status: 'ASSIGNED' }
      });
      pendingTargets.forEach(t => {
        actions.push({
          id: `target-ack-${t.id}`,
          type: 'TARGET_ACK',
          title: 'Target Acknowledgement Required',
          subtitle: `Please acknowledge: ${t.title || 'New Target'}`,
          priority: 'MEDIUM',
          link: '/kpi/my-targets',
          createdAt: t.createdAt
        });
      });
    } catch (e) {
      console.error('[InboxService] Target fetch error:', e);
    }

    // 2. Appraisal Packets
    try {
      const appraisalPackets = await prisma.appraisalPacket.findMany({
        where: { organizationId, status: 'OPEN' }, // Status is OPEN for active packets
        include: { employee: true, cycle: true }
      });

      appraisalPackets.forEach(p => {
         let isReviewer = false;
         if (p.currentStage === 'SUPERVISOR_REVIEW' && p.employee.supervisorId === userId) isReviewer = true;
         if (p.currentStage === 'MANAGER' && (p as any).managerId === userId) isReviewer = true;
         // p for AppraisalPacket has hrReviewerId stored
         if (p.currentStage === 'HR' && (p as any).hrReviewerId === userId) isReviewer = true;

         if (isReviewer) {
           actions.push({
             id: `appraisal-${p.id}`,
             type: 'APPRAISAL_REVIEW',
             title: 'Appraisal Review Required',
             subtitle: `Review for ${p.employee?.fullName || 'Staff Member'} (${p.currentStage} stage)`,
             priority: 'HIGH',
             link: `/reviews/packet/${p.id}`,
             createdAt: p.updatedAt
           });
         }
      });
    } catch (e) {
      console.error('[InboxService] Appraisal fetch error:', e);
    }

    // 3. Leave Requests
    try {
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: { 
          organizationId, 
          status: { in: ['SUBMITTED', 'MANAGER_REVIEW', 'HR_REVIEW', 'MD_REVIEW'] } 
        },
        include: { employee: true }
      });

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      const userRank = getRoleRank(user?.role || 'STAFF');

      leaveRequests.forEach(l => {
        // 3a. Relief Request (Targeted to reliever)
        if (l.status === 'SUBMITTED' && l.relieverId === userId) {
          actions.push({
            id: `leave-relief-${l.id}`,
            type: 'LEAVE_RELIEF',
            title: 'Relief Request',
            subtitle: `${l.employee?.fullName || 'Staff Member'} requested you as a reliever.`,
            priority: 'MEDIUM',
            link: '/leave',
            createdAt: l.createdAt
          });
        }
        
        // 3b. Manager Review (Targeted to supervisor OR Department Manager)
        const isManagerAction = l.status === 'MANAGER_REVIEW' && (l.employee?.supervisorId === userId || userRank >= 70);
        
        // 3c. MD/Final Review (Targeted to MD Rank 90+)
        const isMDAction = l.status === 'MD_REVIEW' && userRank >= 90;
  
        // 3d. HR Review (Targeted to HR Rank 75+)
        const isHRAction = l.status === 'HR_REVIEW' && userRank >= 75;

        if (isManagerAction || isMDAction || isHRAction) {
          actions.push({
            id: `leave-approve-${l.id}`,
            type: 'LEAVE_APPROVE',
            title: 'Leave Approval Required',
            subtitle: `${l.employee?.fullName || 'Staff Member'} - Stage: ${l.status.replace('_', ' ')}`,
            priority: 'HIGH',
            link: '/leave',
            createdAt: l.createdAt
          });
        }
      });
    } catch (e) {
      console.error('[InboxService] Leave fetch error:', e);
    }

    return actions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
