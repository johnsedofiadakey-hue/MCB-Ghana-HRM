import prisma from '../prisma/client';
import { logAction } from './audit.service';

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

export const sendLeaveReminders = async () => {
  const threshold = hoursAgo(48);

  const pendingLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ['MANAGER_REVIEW', 'SUBMITTED', 'HR_REVIEW'] },
      createdAt: { lt: threshold }
    },
    include: { employee: { select: { fullName: true } } }
  });

  for (const leave of pendingLeaves) {
    await logAction(
      null,
      'LEAVE_APPROVAL_REMINDER',
      'LeaveRequest',
      leave.id,
      {
        employee: leave.employee?.fullName,
        status: leave.status,
        startDate: leave.startDate,
        endDate: leave.endDate
      }
    );
  }

  return pendingLeaves.length;
};

export const sendAppraisalReminders = async () => {
  const threshold = hoursAgo(72);

  const pendingPackets = await prisma.appraisalPacket.findMany({
    where: {
      status: 'OPEN',
      updatedAt: { lt: threshold }
    },
    include: {
      employee: { select: { fullName: true } },
      cycle: { select: { title: true } }
    }
  });

  for (const packet of pendingPackets) {
    await logAction(
      null,
      'APPRAISAL_REMINDER',
      'AppraisalPacket',
      packet.id,
      {
        employee: packet.employee?.fullName,
        stage: packet.currentStage,
        cycle: packet.cycle?.title
      }
    );
  }

  return pendingPackets.length;
};
