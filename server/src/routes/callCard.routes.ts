import { Router } from 'express';
import { 
  upsertCallCard, 
  getCallCardByEmployee, 
  getPublicCallCard, 
  submitConnection, 
  getEmployeeConnections 
} from '../controllers/callCard.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '../types/permissions';

const router = Router();

// Public unauthenticated route accessed via physical QR or NFC tag
router.get('/public/call-cards/:id', getPublicCallCard);
router.post('/public/call-cards/:id/connect', submitConnection);

// Marketing manages call cards; employees may read only their own card.
router.post('/call-cards', authenticate, requirePermission(Permission.CALL_CARD_MANAGE), upsertCallCard);
router.post('/call-cards/upsert', authenticate, requirePermission(Permission.CALL_CARD_MANAGE), upsertCallCard);
router.get('/call-cards/employee/:employeeId', authenticate, getCallCardByEmployee);
router.get('/call-cards/connections', authenticate, getEmployeeConnections);

export default router;
