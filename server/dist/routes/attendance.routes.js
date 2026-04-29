"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const attendance_controller_1 = require("../controllers/attendance.controller");
const biometric_controller_1 = require("../controllers/biometric.controller");
const router = (0, express_1.Router)();
router.post('/node-scan', attendance_controller_1.nodeScan);
router.use(auth_middleware_1.authenticate);
router.post('/clock-in', attendance_controller_1.clockIn);
router.post('/clock-out', attendance_controller_1.clockOut);
router.get('/me', attendance_controller_1.getMyAttendance);
router.get('/', (0, auth_middleware_1.requireRole)(70), attendance_controller_1.getAllAttendance);
// 🛡️ Biometric Sync (Rank 85+ or IT Admin)
router.post('/sync', (0, auth_middleware_1.requireRole)(85), biometric_controller_1.syncPunches);
router.post('/kiosk-punch', biometric_controller_1.kioskPunch);
exports.default = router;
