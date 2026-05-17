import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { exportTargetPdf, exportAppraisalPdf, exportLeavePdf, exportRoadmapPdf, exportEmployeePdf, exportEmployeesPdf } from '../controllers/export.controller';
import { exportEmployeesCSV, exportAttendanceCSV, exportPayrollCSV } from '../controllers/export-csv.controller';

const router = Router();

router.use(authenticate);

// PDF Export (existing)
router.get('/roadmap/pdf', exportRoadmapPdf);
router.get('/targets/pdf', exportRoadmapPdf);
router.get('/target/:id/pdf', exportTargetPdf);
router.get('/appraisal/:id/pdf', exportAppraisalPdf);
router.get('/leave/:id/pdf', exportLeavePdf);
router.get('/employee/:id/pdf', exportEmployeePdf);

// CSV Data Portability
router.get('/employees/csv', exportEmployeesCSV);
router.get('/employees/pdf', exportEmployeesPdf);
router.get('/attendance/csv', exportAttendanceCSV);
router.get('/payroll/csv', exportPayrollCSV);

export default router;
