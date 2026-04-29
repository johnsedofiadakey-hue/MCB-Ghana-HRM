import { Request, Response } from 'express';
import { InboxService } from '../services/inbox.service';
import { getOrgId } from './enterprise.controller';

export const getInboxActions = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'mcb-ghana-tenant';
    const userId = (req as any).user.id;
    
    const actions = await InboxService.getActions(organizationId, userId);
    return res.json(actions);
  } catch (error: any) {
    console.error('Inbox Controller Error:', error);
    return res.status(500).json({ error: 'Failed to fetch action inbox' });
  }
};
