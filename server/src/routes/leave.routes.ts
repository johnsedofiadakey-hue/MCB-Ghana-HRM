import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, LeaveRequestSchema, LeaveActionSchema } from '../middleware/validate.middleware';
import {
  applyForLeave,
  getMyLeaves,
  getMyLeaveBalance,
  getPendingLeaves,
  processLeave,
  cancelLeave,
  getAllLeaves,
  getMyReliefRequests,
  getEligibleRelievers,
  getHandoverHistory,
  deleteLeave,
  deleteHandover,
  adjustLeaveBalance,
} from '../controllers/leave.controller';

const router = Router();
router.use(authenticate);

// Employee self-service
router.post('/apply', validate(LeaveRequestSchema), applyForLeave);
router.get('/my', getMyLeaves);
router.get('/balance', getMyLeaveBalance);
router.get('/my-relief-requests', getMyReliefRequests);
router.get('/handover/history', getHandoverHistory);
router.get('/eligible-relievers', getEligibleRelievers);
router.delete('/:id/cancel', cancelLeave);

// MD-Only Administrative Controls
router.post('/balance/adjust', requireRole(80), adjustLeaveBalance);
router.delete('/request/:id', deleteLeave);
router.delete('/handover/:id', deleteHandover);

// Manager / HR processing
router.get('/pending', requireRole(60), getPendingLeaves);
router.post('/process', requireRole(50), validate(LeaveActionSchema), processLeave);

// Admin view (rank 80+ ONLY)
router.get('/all', requireRole(80), getAllLeaves);

export default router;
