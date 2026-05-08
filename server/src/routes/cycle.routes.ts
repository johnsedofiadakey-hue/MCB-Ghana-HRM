import { Router } from 'express';
import * as cycleController from '../controllers/cycle.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', requireRole(80), cycleController.createCycle); // Director+
router.get('/', cycleController.getCycles);
router.patch('/:id/status', requireRole(80), cycleController.updateCycleStatus);
router.put('/:id', requireRole(80), cycleController.updateCycleStatus); // client uses PUT
router.delete('/:id', requireRole(80), cycleController.deleteCycle);

export default router;
