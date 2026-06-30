import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '../types/permissions';
import { getTemplates, createTemplate, startOnboarding, getMyOnboarding, completeTask, getAllOnboardingSessions, getDepartmentTasks, closeOnboarding } from '../controllers/onboarding.controller';

const router = Router();
router.use(authenticate);

router.get('/my', getMyOnboarding);
router.post('/task/complete', completeTask);
router.get('/department-tasks', getDepartmentTasks);

router.get('/templates', requirePermission(Permission.ONBOARDING_MANAGE), getTemplates);
router.post('/templates', requirePermission(Permission.ONBOARDING_MANAGE), createTemplate);
router.post('/start', requirePermission(Permission.ONBOARDING_MANAGE), startOnboarding);
router.get('/all', requirePermission(Permission.ONBOARDING_MANAGE), getAllOnboardingSessions);
router.post('/:id/close', requirePermission(Permission.ONBOARDING_VERIFY), closeOnboarding);

export default router;
