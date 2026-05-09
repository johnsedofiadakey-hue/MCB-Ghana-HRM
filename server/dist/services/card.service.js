"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
class CardService {
    static async transitionState(cardId, newState, reason, performedById, organizationId) {
        const card = await client_1.default.card.findUnique({ where: { id: cardId } });
        if (!card)
            throw new Error('Card not found');
        const validTransitions = {
            'REQUESTED': ['ACTIVE', 'REVOKED'],
            'ACTIVE': ['SUSPENDED', 'REVOKED'],
            'SUSPENDED': ['ACTIVE', 'REVOKED'],
            'REVOKED': [], // Terminal state
        };
        const allowed = validTransitions[card.status]?.includes(newState);
        if (!allowed) {
            throw new Error(`Invalid state transition from ${card.status} to ${newState}`);
        }
        return await client_1.default.$transaction(async (tx) => {
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
exports.CardService = CardService;
