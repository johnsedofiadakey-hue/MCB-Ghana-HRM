import { Router } from 'express';
import * as orgchartController from '../controllers/orgchart.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '../types/permissions';

const router = Router();

router.use(authenticate);

router.get('/', orgchartController.getHierarchy);
router.post('/reassign', requirePermission(Permission.EMPLOYEE_WRITE), orgchartController.reassignSupervisor);

export default router;
