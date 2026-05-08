import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as aiController from '../controllers/ai.controller';

const router = Router();
router.use(authenticate);

// Generate insight verdicts based on context
router.post('/insight', requireRole(70), aiController.generateInsight);

// Conversational HR Assistant
router.post('/chat', requireRole(70), aiController.chat);

// ATS Resume Parsing Endpoint
router.post('/parse-resume', requireRole(70), aiController.parseResumeViaAI);

export default router;
