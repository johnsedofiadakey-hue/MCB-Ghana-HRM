import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getInboxActions } from '../controllers/inbox.controller';

const router = Router();

router.get('/', authenticate, getInboxActions);

export default router;
