import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { clockIn, clockOut, getMyAttendance, getAllAttendance, nodeScan } from '../controllers/attendance.controller';
import { syncPunches, kioskPunch } from '../controllers/biometric.controller';

const router = Router();

router.post('/node-scan', nodeScan);

router.use(authenticate);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/me', getMyAttendance);
router.get('/', requireRole(70), getAllAttendance);

// 🛡️ Biometric Sync (Rank 85+ or IT Admin)
router.post('/sync', requireRole(85), syncPunches);
router.post('/kiosk-punch', kioskPunch);

export default router;
