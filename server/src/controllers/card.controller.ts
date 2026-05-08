import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { CardService } from '../services/card.service';
import { getOrgId } from './enterprise.controller';
import { notify } from '../services/websocket.service';

export class CardController {
  static async requestCard(req: Request, res: Response) {
    try {
      const { cardNumber } = req.body;
      const orgId = getOrgId(req);
      const organizationId = orgId || 'mcb-ghana-tenant';
      const user = (req as any).user;

      if (!cardNumber) {
        return res.status(400).json({ error: 'cardNumber is required' });
      }

      const card = await prisma.card.create({
        data: {
          organizationId,
          userId: user.id,
          cardNumber,
          status: 'REQUESTED',
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

      const card = await CardService.transitionState(id, 'ACTIVE', reason || 'Activated by admin', user.id, organizationId);
      
      const cardRecord = await prisma.card.findUnique({ where: { id }, select: { userId: true } });
      if (cardRecord?.userId) {
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

      const card = await CardService.transitionState(id, 'SUSPENDED', reason || 'Suspended by admin', user.id, organizationId);
      
      const cardRecord = await prisma.card.findUnique({ where: { id }, select: { userId: true } });
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

      const card = await CardService.transitionState(id, 'REVOKED', reason || 'Revoked by admin', user.id, organizationId);
      
      const cardRecord = await prisma.card.findUnique({ where: { id }, select: { userId: true } });
      if (cardRecord?.userId) {
        await notify(cardRecord.userId, '🚫 Card Revoked', `Your access card has been revoked.`, 'DANGER', '/profile');
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
      const whereOrg = orgId ? { organizationId: orgId } : {};

      const cards = await prisma.card.findMany({
        where: {
          ...whereOrg,
          ...(user.rank < 80 ? { userId: user.id } : {}), // Staff see only their cards, admins see all
        },
        include: {
          user: { select: { fullName: true, employeeCode: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(cards);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
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
}
