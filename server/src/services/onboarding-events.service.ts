import prisma from '../prisma/client';

export const completeOnboardingTasksForEvent = async (params: {
  organizationId: string;
  employeeId: string;
  event: string;
  actorId: string;
  evidenceUrl?: string;
}) => {
  const { organizationId, employeeId, event, actorId, evidenceUrl } = params;
  const items = await prisma.onboardingItem.findMany({
    where: {
      organizationId,
      autoCompleteEvent: event,
      status: { notIn: ['COMPLETED', 'VERIFIED'] },
      session: { employeeId },
    },
    select: { id: true, sessionId: true },
  });
  if (!items.length) return 0;

  await prisma.onboardingItem.updateMany({
    where: { id: { in: items.map((item) => item.id) }, organizationId },
    data: { status: 'COMPLETED', completedAt: new Date(), completedBy: actorId, evidenceUrl },
  });
  return items.length;
};
