import { Router } from 'express';
import { authenticate, requireRole, requireSpecificRole } from '../middleware/auth.middleware';
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
  uploadMedicalCertificate,
  getLeaveById,
} from '../controllers/leave.controller';

const router = Router();
router.use(authenticate);

// Employee self-service
router.post('/apply', validate(LeaveRequestSchema), applyForLeave);
router.get('/my', getMyLeaves);
router.get('/:id/detail', getLeaveById);
router.get('/balance', getMyLeaveBalance);
router.get('/my-relief-requests', getMyReliefRequests);
router.get('/handover/history', getHandoverHistory);
router.get('/eligible-relievers', getEligibleRelievers);
router.delete('/:id/cancel', cancelLeave);
router.patch('/:id/medical-cert', uploadMedicalCertificate);

// MD-Only Administrative Controls
router.post('/balance/adjust', requireSpecificRole(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), adjustLeaveBalance);
router.post('/adjust-balance', requireSpecificRole(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), adjustLeaveBalance);
router.delete('/request/:id', requireSpecificRole(['MD', 'DEV']), deleteLeave);
router.delete('/handover/:id', requireSpecificRole(['MD', 'DEV']), deleteHandover);

// Manager / HR processing
router.get('/pending', requireRole(60), getPendingLeaves);
router.post('/process', requireRole(50), validate(LeaveActionSchema), processLeave);

// Admin view (rank 80+ ONLY)
router.get('/all', requireSpecificRole(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), getAllLeaves);

export default router;
