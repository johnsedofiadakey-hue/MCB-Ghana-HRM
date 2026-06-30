"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
class CardService {
    static async transitionAccessState(cardId, newState, reason, performedById, organizationId) {
        const card = await client_1.default.card.findFirst({ where: { id: cardId, organizationId } });
        if (!card)
            throw new Error('Card not found');
        const validTransitions = {
            'NOT_PROVISIONED': ['ACTIVE', 'REVOKED'],
            'ACTIVE': ['SUSPENDED', 'REVOKED'],
            'SUSPENDED': ['ACTIVE', 'REVOKED'],
            'REVOKED': [], // Terminal state
        };
        const allowed = validTransitions[card.accessStatus]?.includes(newState);
        if (!allowed) {
            throw new Error(`Invalid access state transition from ${card.accessStatus} to ${newState}`);
        }
        return await client_1.default.$transaction(async (tx) => {
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
    static async transitionProductionState(cardId, newState, performedById, organizationId) {
        const card = await client_1.default.card.findFirst({ where: { id: cardId, organizationId } });
        if (!card)
            throw new Error('Card not found');
        const transitions = {
            DRAFT: ['READY_TO_PRINT'],
            READY_TO_PRINT: ['DRAFT', 'PRINTED'],
            PRINTED: ['ISSUED'],
            ISSUED: [],
        };
        if (!transitions[card.productionStatus]?.includes(newState)) {
            throw new Error(`Invalid production state transition from ${card.productionStatus} to ${newState}`);
        }
        return client_1.default.$transaction(async (tx) => {
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
exports.CardService = CardService;
