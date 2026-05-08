import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import { getTemplates, createTemplate, startOnboarding, getMyOnboarding, completeTask, getAllOnboardingSessions } from '../controllers/onboarding.controller';

const router = Router();
router.use(authenticate);

router.get('/my', getMyOnboarding);
router.post('/task/complete', completeTask);

router.get('/templates', authorize(['HR_MANAGER', 'IT_MANAGER', 'DEV']), getTemplates);
router.post('/templates', authorize(['HR_MANAGER', 'IT_MANAGER', 'DEV']), createTemplate);
router.post('/start', authorize(['HR_MANAGER', 'IT_MANAGER', 'DEV']), startOnboarding);
router.get('/all', authorize(['HR_MANAGER', 'IT_MANAGER', 'DEV']), getAllOnboardingSessions);

export default router;
