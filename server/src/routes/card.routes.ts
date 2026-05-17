import { Router } from 'express';
import { CardController } from '../controllers/card.controller';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

const itRoles = ['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV'];

router.post('/cards', requireSpecificRole(itRoles), CardController.requestCard);
router.patch('/cards/:id/activate', requireSpecificRole(itRoles), CardController.activateCard);
router.patch('/cards/:id/suspend', requireSpecificRole(itRoles), CardController.suspendCard);
router.patch('/cards/:id/revoke', requireSpecificRole(itRoles), CardController.revokeCard);
router.put('/cards/:id', requireSpecificRole(itRoles), CardController.updateCard);
router.get('/cards', CardController.getCards);
router.get('/cards/:id/history', requireSpecificRole(itRoles), CardController.getCardHistory);

export default router;
