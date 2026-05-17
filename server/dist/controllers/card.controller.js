"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardController = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const card_service_1 = require("../services/card.service");
const enterprise_controller_1 = require("./enterprise.controller");
const websocket_service_1 = require("../services/websocket.service");
class CardController {
    static async requestCard(req, res) {
        try {
            const { employeeId, cardNumber } = req.body;
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const organizationId = orgId || 'mcb-ghana-tenant';
            const user = req.user;
            if (!employeeId) {
                return res.status(400).json({ error: 'employeeId is required' });
            }
            // Find the employee by id (UUID), employeeCode, or email
            const targetUser = await client_1.default.user.findFirst({
                where: {
                    organizationId,
                    OR: [
                        { id: employeeId },
                        { employeeCode: employeeId },
                        { email: employeeId }
                    ]
                }
            });
            if (!targetUser) {
                return res.status(404).json({ error: `Employee not found with ID/Code/Email: ${employeeId}` });
            }
            // Auto-generate card number if empty
            let finalCardNumber = cardNumber;
            if (!finalCardNumber || finalCardNumber.trim() === '') {
                const rand = Math.floor(100000 + Math.random() * 900000);
                finalCardNumber = `MCB-GH-${rand}`;
            }
            const card = await client_1.default.card.create({
                data: {
                    organizationId,
                    userId: targetUser.id,
                    cardNumber: finalCardNumber,
                    status: 'REQUESTED',
                },
            });
            await client_1.default.cardLifecycleEvent.create({
                data: {
                    organizationId,
                    cardId: card.id,
                    state: 'REQUESTED',
                    reason: 'Initial request',
                    performedById: user.id,
                },
            });
            return res.status(201).json(card);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async activateCard(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const user = req.user;
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const organizationId = orgId || 'mcb-ghana-tenant';
            const card = await card_service_1.CardService.transitionState(id, 'ACTIVE', reason || 'Activated by admin', user.id, organizationId);
            const cardRecord = await client_1.default.card.findUnique({ where: { id }, select: { userId: true } });
            if (cardRecord?.userId) {
                await (0, websocket_service_1.notify)(cardRecord.userId, '💳 Card Activated', `Your access card has been activated.`, 'SUCCESS', '/profile');
            }
            return res.json(card);
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    static async suspendCard(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const user = req.user;
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const organizationId = orgId || 'mcb-ghana-tenant';
            const card = await card_service_1.CardService.transitionState(id, 'SUSPENDED', reason || 'Suspended by admin', user.id, organizationId);
            const cardRecord = await client_1.default.card.findUnique({ where: { id }, select: { userId: true } });
            if (cardRecord?.userId) {
                await (0, websocket_service_1.notify)(cardRecord.userId, '⚠️ Card Suspended', `Your access card has been suspended.`, 'WARNING', '/profile');
            }
            return res.json(card);
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    static async revokeCard(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const user = req.user;
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const organizationId = orgId || 'mcb-ghana-tenant';
            const card = await card_service_1.CardService.transitionState(id, 'REVOKED', reason || 'Revoked by admin', user.id, organizationId);
            const cardRecord = await client_1.default.card.findUnique({ where: { id }, select: { userId: true } });
            if (cardRecord?.userId) {
                await (0, websocket_service_1.notify)(cardRecord.userId, '🚫 Card Revoked', `Your access card has been revoked.`, 'ERROR', '/profile');
            }
            return res.json(card);
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    static async getCards(req, res) {
        try {
            const user = req.user;
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const whereOrg = orgId ? { organizationId: orgId } : {};
            const cards = await client_1.default.card.findMany({
                where: {
                    ...whereOrg,
                    ...(user.rank < 80 ? { userId: user.id } : {}), // Staff see only their cards, admins see all
                },
                include: {
                    user: { select: { fullName: true, employeeCode: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
            // Format for frontend mapping compatibility
            const formattedCards = cards.map(c => ({
                id: c.id,
                employeeId: c.user?.employeeCode || c.userId,
                cardNumber: c.cardNumber,
                status: c.status,
                issuedAt: c.status !== 'REQUESTED' ? c.updatedAt : null,
                employee: c.user ? { fullName: c.user.fullName } : undefined,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                organizationId: c.organizationId
            }));
            return res.json(formattedCards);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async updateCard(req, res) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;
            const user = req.user;
            const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
            if (!status)
                return res.status(400).json({ error: 'status is required' });
            const card = await card_service_1.CardService.transitionState(id, status, reason || `Status changed to ${status}`, user.id, organizationId);
            return res.json(card);
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    static async getCardHistory(req, res) {
        try {
            const { id } = req.params;
            const orgId = (0, enterprise_controller_1.getOrgId)(req);
            const whereOrg = orgId ? { organizationId: orgId } : {};
            const events = await client_1.default.cardLifecycleEvent.findMany({
                where: { cardId: id, ...whereOrg },
                include: {
                    performedBy: { select: { fullName: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
            return res.json(events);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.CardController = CardController;
