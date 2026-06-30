
import { Request, Response } from 'express';
import { AnnouncementService } from '../services/announcement.service';

const getOrgId = (req: Request): string => (req as any).user?.organizationId || 'mcb-ghana-tenant';

export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = (req as any).user.id;
    const announcement = await AnnouncementService.create(orgId, userId, req.body);
    return res.status(201).json(announcement);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const listAnnouncements = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = (req as any).user.id;
    const announcements = await AnnouncementService.listForUser(orgId, userId);
    return res.json(announcements);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = (req as any).user.id;
    const role = (req as any).user.role;
    const { id } = req.params;

    await AnnouncementService.delete(id, orgId, userId, role);
    return res.json({ success: true, message: 'Announcement deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
