import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMyNotifications, markRead, getUnreadCount, markReadParam, markAllRead, deleteNotification } from '../controllers/notification.controller';

const router = Router();
router.use(authenticate);
router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/mark-read', markRead);
router.put('/read-all', markAllRead);
router.put('/:id/read', markReadParam);
router.delete('/:id', deleteNotification);
export default router;
