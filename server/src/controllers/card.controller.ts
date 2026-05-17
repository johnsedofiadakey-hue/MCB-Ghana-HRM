import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { CardService } from '../services/card.service';
import { getOrgId } from './enterprise.controller';
import { notify } from '../services/websocket.service';

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
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateCard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const user = (req as any).user;
      const organizationId = getOrgId(req) || 'mcb-ghana-tenant';

      if (!status) return res.status(400).json({ error: 'status is required' });

      const card = await CardService.transitionState(id, status, reason || `Status changed to ${status}`, user.id, organizationId);
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
}
