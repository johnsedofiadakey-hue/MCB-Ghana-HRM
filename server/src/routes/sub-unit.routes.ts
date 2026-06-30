import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '../types/permissions';
import { 
  getSubUnits, 
  createSubUnit, 
  updateSubUnit, 
  deleteSubUnit 
} from '../controllers/sub-unit.controller';

const router = Router();

router.use(authenticate);

router.get('/', getSubUnits);
router.post('/', requirePermission(Permission.EMPLOYEE_WRITE), createSubUnit);
router.patch('/:id', requirePermission(Permission.EMPLOYEE_WRITE), updateSubUnit);
router.delete('/:id', requirePermission(Permission.EMPLOYEE_WRITE), deleteSubUnit);

export default router;
