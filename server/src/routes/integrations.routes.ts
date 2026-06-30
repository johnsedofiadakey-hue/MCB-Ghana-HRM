import { Router } from 'express';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';
import { 
    listApiKeys, createApiKey, revokeApiKey,
    listWebhooks, createWebhook, deleteWebhook
} from '../controllers/integrations.controller';

const router = Router();

// Only top level tenant admins (Rank 90+) can manage integrations
router.use(authenticate);
router.use(requireSpecificRole(['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV']));

// API Keys
router.get('/keys', listApiKeys);
router.post('/keys', createApiKey);
router.delete('/keys/:id', revokeApiKey);

// Webhooks
router.get('/webhooks', listWebhooks);
router.post('/webhooks', createWebhook);
router.delete('/webhooks/:id', deleteWebhook);

export default router;
