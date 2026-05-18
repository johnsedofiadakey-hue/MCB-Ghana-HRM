import { Router } from 'express';
import { CardController } from '../controllers/card.controller';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';

const router = Router();

const itRoles = ['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV'];

router.post('/cards', authenticate, requireSpecificRole(itRoles), CardController.requestCard);
router.patch('/cards/:id/activate', authenticate, requireSpecificRole(itRoles), CardController.activateCard);
router.patch('/cards/:id/suspend', authenticate, requireSpecificRole(itRoles), CardController.suspendCard);
router.patch('/cards/:id/revoke', authenticate, requireSpecificRole(itRoles), CardController.revokeCard);
router.put('/cards/:id', authenticate, requireSpecificRole(itRoles), CardController.updateCard);
router.get('/cards', authenticate, CardController.getCards);
router.get('/cards/:id/history', authenticate, requireSpecificRole(itRoles), CardController.getCardHistory);

export default router;
