
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, AnnouncementSchema } from '../middleware/validate.middleware';
import * as AnnouncementController from '../controllers/announcement.controller';

const router = Router();

router.post('/', authenticate, requireRole(70), validate(AnnouncementSchema), AnnouncementController.createAnnouncement);
router.get('/', authenticate, AnnouncementController.listAnnouncements);
router.delete('/:id', authenticate, requireRole(70), AnnouncementController.deleteAnnouncement);

export default router;
