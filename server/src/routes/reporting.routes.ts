import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/reporting.controller';
import { Permission } from '../types/permissions';

const router = Router();
router.use(authenticate);

// Get all reporting lines for an employee (accessible to the employee + their managers)
router.get('/employee/:employeeId', ctrl.getEmployeeReportingLines);

// Get all employees who report to the current user
router.get('/my-reports', ctrl.getMyDirectReports);

// Add a reporting line (Manager+ can do this)
router.post('/', requirePermission(Permission.EMPLOYEE_WRITE), ctrl.addReportingLine);

// Update a reporting line
router.patch('/:id', requirePermission(Permission.EMPLOYEE_WRITE), ctrl.updateReportingLine);

// Remove a reporting line
router.delete('/:id', requirePermission(Permission.EMPLOYEE_WRITE), ctrl.removeReportingLine);

export default router;
