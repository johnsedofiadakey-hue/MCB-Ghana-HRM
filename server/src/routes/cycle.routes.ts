import { Router } from 'express';
import * as cycleController from '../controllers/cycle.controller';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
const appraisalAdminRoles = ['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV'];

router.post('/', requireSpecificRole(appraisalAdminRoles), cycleController.createCycle);
router.get('/', cycleController.getCycles);
router.patch('/:id/status', requireSpecificRole(appraisalAdminRoles), cycleController.updateCycleStatus);
router.put('/:id', requireSpecificRole(appraisalAdminRoles), cycleController.updateCycleStatus); // client uses PUT
router.delete('/:id', requireSpecificRole(appraisalAdminRoles), cycleController.deleteCycle);

export default router;
