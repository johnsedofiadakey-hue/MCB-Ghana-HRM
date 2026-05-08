"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const export_controller_1 = require("../controllers/export.controller");
const export_csv_controller_1 = require("../controllers/export-csv.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// PDF Export (existing)
router.get('/roadmap/pdf', export_controller_1.exportRoadmapPdf);
router.get('/target/:id/pdf', export_controller_1.exportTargetPdf);
router.get('/appraisal/:id/pdf', export_controller_1.exportAppraisalPdf);
router.get('/leave/:id/pdf', export_controller_1.exportLeavePdf);
// CSV Data Portability
router.get('/employees/csv', export_csv_controller_1.exportEmployeesCSV);
router.get('/attendance/csv', export_csv_controller_1.exportAttendanceCSV);
router.get('/payroll/csv', export_csv_controller_1.exportPayrollCSV);
exports.default = router;
