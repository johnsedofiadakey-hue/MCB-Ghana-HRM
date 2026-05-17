import { Router } from 'express';
import { 
  upsertCallCard, 
  getCallCardByEmployee, 
  getPublicCallCard, 
  submitConnection, 
  getEmployeeConnections 
} from '../controllers/callCard.controller';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';

const router = Router();
const itRoles = ['IT_MANAGER', 'IT_ADMIN', 'MD', 'DEV'];

// Public unauthenticated route accessed via physical QR or NFC tag
router.get('/public/call-cards/:id', getPublicCallCard);
router.post('/public/call-cards/:id/connect', submitConnection);

// Secure endpoints for employees & IT managers to manage call cards
router.post('/call-cards', authenticate, requireSpecificRole(itRoles), upsertCallCard);
router.post('/call-cards/upsert', authenticate, requireSpecificRole(itRoles), upsertCallCard);
router.get('/call-cards/employee/:employeeId', authenticate, getCallCardByEmployee);
router.get('/call-cards/connections', authenticate, getEmployeeConnections);

export default router;
