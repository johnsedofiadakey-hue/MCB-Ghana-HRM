import { Router } from 'express';
import { getMyTeam } from '../controllers/user.controller';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';

const router = Router();

// GET /api/team/list?supervisorId=...
router.get('/list', authenticate, requireRole(70), getMyTeam);

export default router;