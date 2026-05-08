import prisma from '../prisma/client';

export class CardService {
  static async transitionState(cardId: string, newState: string, reason: string | null, performedById: string, organizationId: string) {
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new Error('Card not found');

    const validTransitions: { [key: string]: string[] } = {
      'REQUESTED': ['ACTIVE', 'REVOKED'],
      'ACTIVE': ['SUSPENDED', 'REVOKED'],
      'SUSPENDED': ['ACTIVE', 'REVOKED'],
      'REVOKED': [], // Terminal state
    };

    const allowed = validTransitions[card.status]?.includes(newState);
    if (!allowed) {
      throw new Error(`Invalid state transition from ${card.status} to ${newState}`);
    }

    return await prisma.$transaction(async (tx) => {
      // Update card state
      const updatedCard = await tx.card.update({
        where: { id: cardId },
        data: { status: newState },
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
}
