import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { CardService } from '../services/card.service';
import { getOrgId } from './enterprise.controller';
import { notify } from '../services/websocket.service';
import { PolicyService } from '../services/policy.service';
import { Permission } from '../types/permissions';
import { completeOnboardingTasksForEvent } from '../services/onboarding-events.service';

export class CardController {
  static async requestCard(req: Request, res: Response) {
    try {
      const { employeeId, cardNumber } = req.body;
      const orgId = getOrgId(req);
      const organizationId = orgId || 'mcb-ghana-tenant';
      const user = (req as any).user;

      if (!employeeId) {
        return res.status(400).json({ error: 'employeeId is required' });
      }

      // Find the employee by id (UUID), employeeCode, or email
      const targetUser = await prisma.user.findFirst({
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

      const card = await prisma.card.create({
        data: {
          organizationId,
          userId: targetUser.id,
          cardNumber: finalCardNumber,
          status: 'REQUESTED',
          productionStatus: 'DRAFT',
          accessStatus: 'NOT_PROVISIONED',
        },
      });

      await prisma.cardLifecycleEvent.create({
        data: {
          organizationId,
          cardId: card.id,
          state: 'REQUESTED',
          reason: 'Initial request',
          performedById: user.id,
        },
      });

      return res.status(201).json(card);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async activateCard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const user = (req as any).user;
      const orgId = getOrgId(req);
      const organizationId = orgId || 'mcb-ghana-tenant';

      const card = await CardService.transitionAccessState(id, 'ACTIVE', reason || 'Activated by IT', user.id, organizationId);
      
      const cardRecord = await prisma.card.findFirst({ where: { id, organizationId }, select: { userId: true } });
      if (cardRecord?.userId) {
        await completeOnboardingTasksForEvent({ organizationId, employeeId: cardRecord.userId, event: 'CARD_ACCESS_ACTIVATED', actorId: user.id });
        await notify(cardRecord.userId, '💳 Card Activated', `Your access card has been activated.`, 'SUCCESS', '/profile');
      }

      return res.json(card);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async suspendCard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const user = (req as any).user;
      const orgId = getOrgId(req);
      const organizationId = orgId || 'mcb-ghana-tenant';

      const card = await CardService.transitionAccessState(id, 'SUSPENDED', reason || 'Suspended by IT', user.id, organizationId);
      
      const cardRecord = await prisma.card.findFirst({ where: { id, organizationId }, select: { userId: true } });
      if (cardRecord?.userId) {
        await notify(cardRecord.userId, '⚠️ Card Suspended', `Your access card has been suspended.`, 'WARNING', '/profile');
      }

      return res.json(card);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async revokeCard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const user = (req as any).user;
      const orgId = getOrgId(req);
      const organizationId = orgId || 'mcb-ghana-tenant';

      const card = await CardService.transitionAccessState(id, 'REVOKED', reason || 'Revoked by IT', user.id, organizationId);
      
      const cardRecord = await prisma.card.findFirst({ where: { id, organizationId }, select: { userId: true } });
      if (cardRecord?.userId) {
        await notify(cardRecord.userId, '🚫 Card Revoked', `Your access card has been revoked.`, 'ERROR', '/profile');
      }

      return res.json(card);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async getCards(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const orgId = getOrgId(req);
      const organizationId = orgId || 'mcb-ghana-tenant';
      const canManageProduction = (await PolicyService.evaluatePolicy(user.id, Permission.CARD_PRODUCTION)).allowed;
      const canManageAccess = (await PolicyService.evaluatePolicy(user.id, Permission.CARD_ACCESS)).allowed;

      const cards = await prisma.card.findMany({
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
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateCard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { productionStatus } = req.body;
      const user = (req as any).user;
      const organizationId = getOrgId(req) || 'mcb-ghana-tenant';

      if (!productionStatus) return res.status(400).json({ error: 'productionStatus is required' });

      const card = await CardService.transitionProductionState(id, productionStatus, user.id, organizationId);
      if (productionStatus === 'ISSUED') {
        await completeOnboardingTasksForEvent({ organizationId, employeeId: card.userId, event: 'ID_CARD_ISSUED', actorId: user.id });
      }
      return res.json(card);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async getCardHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = getOrgId(req);
      const whereOrg = orgId ? { organizationId: orgId } : {};

      const events = await prisma.cardLifecycleEvent.findMany({
        where: { cardId: id, ...whereOrg },
        include: {
          performedBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(events);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getDesignSettings(req: Request, res: Response) {
    const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
    const settings = await prisma.cardDesignSetting.findUnique({ where: { organizationId } });
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

  static async updateDesignSettings(req: Request, res: Response) {
    const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
    const user = (req as any).user;
    const allowed = ['theme', 'logoUrl', 'primaryColor', 'secondaryColor', 'showPhone', 'showEmail', 'orientation', 'showLogo', 'showQrCode', 'backMessage', 'securityText'];
    const data = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    const settings = await prisma.cardDesignSetting.upsert({
      where: { organizationId },
      create: { organizationId, ...data, updatedById: user.id },
      update: { ...data, updatedById: user.id },
    });
    return res.json(settings);
  }
}
