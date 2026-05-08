import { Router } from 'express';
import { initializePayment, handleWebhook, manualBillingOverride, getPaymentStatus, downloadReceipt } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public webhook
router.post('/webhook', handleWebhook);

// Protected routes
router.get('/status', authenticate, getPaymentStatus);
router.post('/initialize', authenticate, initializePayment);
router.get('/receipt/:id', authenticate, downloadReceipt);
router.post('/manual-override', authenticate, authorize(['DEV']), manualBillingOverride);


export default router;
