import { Router } from 'express';
import { authenticate, requireRole, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '../types/permissions';
import { clockIn, clockOut, getMyAttendance, getAllAttendance, exportAttendanceCSV, nodeScan } from '../controllers/attendance.controller';
import { syncPunches, kioskPunch } from '../controllers/biometric.controller';

const router = Router();

router.post('/node-scan', nodeScan);

router.use(authenticate);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/me', getMyAttendance);
router.get('/', requireRole(70), getAllAttendance);
router.get('/csv', requireRole(70), exportAttendanceCSV);

// 🛡️ Biometric Sync (Rank 85+ or IT Admin)
router.post('/sync', requirePermission(Permission.ACCOUNT_PROVISION), syncPunches);
router.post('/kiosk-punch', kioskPunch);

export default router;
