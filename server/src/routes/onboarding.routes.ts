import { Router } from 'express';
import { authenticate, requirePermission, requireSpecificRole } from '../middleware/auth.middleware';
import { Permission } from '../types/permissions';
import { getTemplates, createTemplate, startOnboarding, getMyOnboarding, completeTask, getAllOnboardingSessions, getDepartmentTasks, closeOnboarding } from '../controllers/onboarding.controller';

const router = Router();
router.use(authenticate);

router.get('/my', getMyOnboarding);
router.post('/task/complete', completeTask);
router.get('/department-tasks', getDepartmentTasks);

const canManageOnboarding = requireSpecificRole(['HR_DIRECTOR', 'HR_MANAGER', 'IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']);
router.get('/templates', canManageOnboarding, getTemplates);
router.post('/templates', canManageOnboarding, createTemplate);
router.post('/start', canManageOnboarding, startOnboarding);
router.get('/all', canManageOnboarding, getAllOnboardingSessions);
router.post('/:id/close', canManageOnboarding, closeOnboarding);

export default router;
