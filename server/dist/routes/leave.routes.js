"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const leave_controller_1 = require("../controllers/leave.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Employee self-service
router.post('/apply', (0, validate_middleware_1.validate)(validate_middleware_1.LeaveRequestSchema), leave_controller_1.applyForLeave);
router.get('/my', leave_controller_1.getMyLeaves);
router.get('/:id/detail', leave_controller_1.getLeaveById);
router.get('/balance', leave_controller_1.getMyLeaveBalance);
router.get('/my-relief-requests', leave_controller_1.getMyReliefRequests);
router.get('/handover/history', leave_controller_1.getHandoverHistory);
router.get('/eligible-relievers', leave_controller_1.getEligibleRelievers);
router.delete('/:id/cancel', leave_controller_1.cancelLeave);
router.patch('/:id/medical-cert', leave_controller_1.uploadMedicalCertificate);
// MD-Only Administrative Controls
router.post('/balance/adjust', (0, auth_middleware_1.requireSpecificRole)(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), leave_controller_1.adjustLeaveBalance);
router.post('/adjust-balance', (0, auth_middleware_1.requireSpecificRole)(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), leave_controller_1.adjustLeaveBalance);
router.delete('/request/:id', (0, auth_middleware_1.requireSpecificRole)(['MD', 'DEV']), leave_controller_1.deleteLeave);
router.delete('/handover/:id', (0, auth_middleware_1.requireSpecificRole)(['MD', 'DEV']), leave_controller_1.deleteHandover);
// Manager / HR processing
router.get('/pending', (0, auth_middleware_1.requireRole)(60), leave_controller_1.getPendingLeaves);
router.post('/process', (0, auth_middleware_1.requireRole)(50), (0, validate_middleware_1.validate)(validate_middleware_1.LeaveActionSchema), leave_controller_1.processLeave);
// Admin view (rank 80+ ONLY)
router.get('/all', (0, auth_middleware_1.requireSpecificRole)(['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV']), leave_controller_1.getAllLeaves);
exports.default = router;
