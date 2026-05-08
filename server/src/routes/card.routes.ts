import { Router } from 'express';
import { CardController } from '../controllers/card.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/cards', CardController.requestCard);
router.patch('/cards/:id/activate', CardController.activateCard);
router.patch('/cards/:id/suspend', CardController.suspendCard);
router.patch('/cards/:id/revoke', CardController.revokeCard);
router.get('/cards', CardController.getCards);
router.get('/cards/:id/history', CardController.getCardHistory);

export default router;
