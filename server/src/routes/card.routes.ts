import { Router } from 'express';
import { CardController } from '../controllers/card.controller';
import { authenticate, requirePermission, requireAnyPermission } from '../middleware/auth.middleware';
import { Permission } from '../types/permissions';

const router = Router();

router.post('/cards', authenticate, requirePermission(Permission.CARD_PRODUCTION), CardController.requestCard);
router.patch('/cards/:id/activate', authenticate, requirePermission(Permission.CARD_ACCESS), CardController.activateCard);
router.patch('/cards/:id/suspend', authenticate, requirePermission(Permission.CARD_ACCESS), CardController.suspendCard);
router.patch('/cards/:id/revoke', authenticate, requirePermission(Permission.CARD_ACCESS), CardController.revokeCard);
router.put('/cards/:id', authenticate, requirePermission(Permission.CARD_PRODUCTION), CardController.updateCard);
router.get('/cards', authenticate, CardController.getCards);
router.get('/cards/:id/history', authenticate, requireAnyPermission([Permission.CARD_PRODUCTION, Permission.CARD_ACCESS]), CardController.getCardHistory);
router.get('/card-design-settings', authenticate, CardController.getDesignSettings);
router.put('/card-design-settings', authenticate, requirePermission(Permission.CARD_DESIGN), CardController.updateDesignSettings);

export default router;
