import prisma from '../prisma/client';

export class CardService {
  static async transitionAccessState(cardId: string, newState: string, reason: string | null, performedById: string, organizationId: string) {
    const card = await prisma.card.findFirst({ where: { id: cardId, organizationId } });
    if (!card) throw new Error('Card not found');

    const validTransitions: { [key: string]: string[] } = {
      'NOT_PROVISIONED': ['ACTIVE', 'REVOKED'],
      'ACTIVE': ['SUSPENDED', 'REVOKED'],
      'SUSPENDED': ['ACTIVE', 'REVOKED'],
      'REVOKED': [], // Terminal state
    };

    const allowed = validTransitions[card.accessStatus]?.includes(newState);
    if (!allowed) {
      throw new Error(`Invalid access state transition from ${card.accessStatus} to ${newState}`);
    }

    return await prisma.$transaction(async (tx) => {
      // Update card state
      const updatedCard = await tx.card.update({
        where: { id: cardId },
        data: { accessStatus: newState, status: newState, ...(newState === 'ACTIVE' ? { activatedAt: new Date() } : {}) },
      });

      // Log event
      await tx.cardLifecycleEvent.create({
        data: {
          organizationId,
          cardId,
          state: newState,
          reason,
          performedById,
        },
      });

      return updatedCard;
    });
  }

  static async transitionProductionState(cardId: string, newState: string, performedById: string, organizationId: string) {
    const card = await prisma.card.findFirst({ where: { id: cardId, organizationId } });
    if (!card) throw new Error('Card not found');
    const transitions: Record<string, string[]> = {
      DRAFT: ['READY_TO_PRINT'],
      READY_TO_PRINT: ['DRAFT', 'PRINTED'],
      PRINTED: ['ISSUED'],
      ISSUED: [],
    };
    if (!transitions[card.productionStatus]?.includes(newState)) {
      throw new Error(`Invalid production state transition from ${card.productionStatus} to ${newState}`);
    }
    return prisma.$transaction(async (tx) => {
      const updated = await tx.card.update({
        where: { id: card.id },
        data: {
          productionStatus: newState,
          ...(newState === 'PRINTED' ? { printedAt: new Date() } : {}),
          ...(newState === 'ISSUED' ? { issuedAt: new Date() } : {}),
        },
      });
      await tx.cardLifecycleEvent.create({
        data: { organizationId, cardId: card.id, state: `PRODUCTION_${newState}`, performedById },
      });
      return updated;
    });
  }
}
