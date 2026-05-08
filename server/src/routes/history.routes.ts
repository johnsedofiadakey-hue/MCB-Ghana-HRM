import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import * as historyController from '../controllers/history.controller';

const router = Router();

// Create Record: Admin, MD, Supervisors (for their team - logic to be added in controller or service? For now allow role)
router.post('/', authenticate, requireRole(70), historyController.createRecord);

// Get Records: Admin can see all? Or specific employee?
// Route: /api/history/:employeeId
router.get('/:employeeId', authenticate, historyController.getEmployeeRecords); // Add logic to ensure only authorized people can view

// Update Status (e.g. resolve query)
router.put('/:id/status', authenticate, requireRole(80), historyController.updateStatus);

export default router;
