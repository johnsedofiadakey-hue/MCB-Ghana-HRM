import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { 
  getSubUnits, 
  createSubUnit, 
  updateSubUnit, 
  deleteSubUnit 
} from '../controllers/sub-unit.controller';

const router = Router();

router.use(authenticate);

router.get('/', getSubUnits);
router.post('/', requireRole(75), createSubUnit);
router.patch('/:id', requireRole(75), updateSubUnit);
router.delete('/:id', requireRole(75), deleteSubUnit);

export default router;
