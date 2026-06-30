
import { Router } from 'express';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';
import { validate, AnnouncementSchema } from '../middleware/validate.middleware';
import * as AnnouncementController from '../controllers/announcement.controller';

const router = Router();
const communicationRoles = ['MARKETING_HEAD', 'HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'MD', 'DEV'];

router.post('/', authenticate, requireSpecificRole(communicationRoles), validate(AnnouncementSchema), AnnouncementController.createAnnouncement);
router.get('/', authenticate, AnnouncementController.listAnnouncements);
router.delete('/:id', authenticate, requireSpecificRole(communicationRoles), AnnouncementController.deleteAnnouncement);

export default router;
