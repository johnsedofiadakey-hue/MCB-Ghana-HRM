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
const policy_service_1 = require("../services/policy.service");
const permissions_1 = require("../types/permissions");
const onboarding_events_service_1 = require("../services/onboarding-events.service");
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
                    productionStatus: 'DRAFT',
                    accessStatus: 'NOT_PROVISIONED',
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
            const card = await card_service_1.CardService.transitionAccessState(id, 'ACTIVE', reason || 'Activated by IT', user.id, organizationId);
            const cardRecord = await client_1.default.card.findFirst({ where: { id, organizationId }, select: { userId: true } });
            if (cardRecord?.userId) {
                await (0, onboarding_events_service_1.completeOnboardingTasksForEvent)({ organizationId, employeeId: cardRecord.userId, event: 'CARD_ACCESS_ACTIVATED', actorId: user.id });
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
            const card = await card_service_1.CardService.transitionAccessState(id, 'SUSPENDED', reason || 'Suspended by IT', user.id, organizationId);
            const cardRecord = await client_1.default.card.findFirst({ where: { id, organizationId }, select: { userId: true } });
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
            const card = await card_service_1.CardService.transitionAccessState(id, 'REVOKED', reason || 'Revoked by IT', user.id, organizationId);
            const cardRecord = await client_1.default.card.findFirst({ where: { id, organizationId }, select: { userId: true } });
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
            const organizationId = orgId || 'mcb-ghana-tenant';
            const canManageProduction = (await policy_service_1.PolicyService.evaluatePolicy(user.id, permissions_1.Permission.CARD_PRODUCTION)).allowed;
            const canManageAccess = (await policy_service_1.PolicyService.evaluatePolicy(user.id, permissions_1.Permission.CARD_ACCESS)).allowed;
            const cards = await client_1.default.card.findMany({
                where: {
                    organizationId,
                    ...(!canManageProduction && !canManageAccess ? { userId: user.id } : {}),
                },
                include: {
                    user: { select: { fullName: true, employeeCode: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
            // Format for frontend mapping compatibility
            const formattedCards = cards.map(c => ({
                id: c.id,
                userId: c.userId,
                employeeId: c.user?.employeeCode || c.userId,
                cardNumber: c.cardNumber,
                status: c.status,
                productionStatus: c.productionStatus,
                accessStatus: c.accessStatus,
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
            const { productionStatus } = req.body;
            const user = req.user;
            const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
            if (!productionStatus)
                return res.status(400).json({ error: 'productionStatus is required' });
            const card = await card_service_1.CardService.transitionProductionState(id, productionStatus, user.id, organizationId);
            if (productionStatus === 'ISSUED') {
                await (0, onboarding_events_service_1.completeOnboardingTasksForEvent)({ organizationId, employeeId: card.userId, event: 'ID_CARD_ISSUED', actorId: user.id });
            }
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
    static async getDesignSettings(req, res) {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const settings = await client_1.default.cardDesignSetting.findUnique({ where: { organizationId } });
        return res.json(settings || {
            organizationId,
            theme: 'DARK',
            primaryColor: '#0B4F9C',
            secondaryColor: '#F5A623',
            showPhone: true,
            showEmail: true,
            orientation: 'VERTICAL',
            showLogo: true,
            showQrCode: true,
            securityText: 'Terms of Use',
            backMessage: 'This card belongs to MCB Ghana. If found, please return it to the company.'
        });
    }
    static async updateDesignSettings(req, res) {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const user = req.user;
        const allowed = ['theme', 'logoUrl', 'primaryColor', 'secondaryColor', 'showPhone', 'showEmail', 'orientation', 'showLogo', 'showQrCode', 'backMessage', 'securityText'];
        const data = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
        const settings = await client_1.default.cardDesignSetting.upsert({
            where: { organizationId },
            create: { organizationId, ...data, updatedById: user.id },
            update: { ...data, updatedById: user.id },
        });
        return res.json(settings);
    }
}
exports.CardController = CardController;
