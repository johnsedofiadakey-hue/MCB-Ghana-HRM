import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/reporting.controller';

const router = Router();
router.use(authenticate);

// Get all reporting lines for an employee (accessible to the employee + their managers)
router.get('/employee/:employeeId', ctrl.getEmployeeReportingLines);

// Get all employees who report to the current user
router.get('/my-reports', ctrl.getMyDirectReports);

// Add a reporting line (Manager+ can do this)
router.post('/', requireRole(60), ctrl.addReportingLine);

// Update a reporting line
router.patch('/:id', requireRole(60), ctrl.updateReportingLine);

// Remove a reporting line
router.delete('/:id', requireRole(60), ctrl.removeReportingLine);

export default router;
