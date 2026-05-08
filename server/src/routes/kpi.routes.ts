import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { listDepartmentKPIsLegacy, listDepartmentKPIs } from '../controllers/enterprise.controller';
import { migrateDepartmentsToTenant } from '../scripts/migrate_departments';
import {
  createKpiSheet, getMySheets, getSheetsIAssigned, getSheetById,
  updateKpiProgress, reviewKpiSheet, recallKpiSheet, deleteKpiSheet, getAllSheets,
  getDepartmentalSummary, getIndividualSummary, getStrategicMandates, assignFromTemplate
} from '../controllers/kpi.controller';

const router = Router();
router.use(authenticate);

// Strategic Mandates
router.get('/department', listDepartmentKPIs);
router.get('/mandates', getStrategicMandates);
router.get('/department-list', requireRole(70), listDepartmentKPIsLegacy);
router.post('/repair-tenants', requireRole(80), migrateDepartmentsToTenant);
router.post('/assign-template', requireRole(70), assignFromTemplate);

// Employee
router.get('/my-sheets', getMySheets);
router.patch('/update-progress', updateKpiProgress);
router.post('/recall', recallKpiSheet);

// Manager / MD / Supervisor
router.get('/assigned', getSheetsIAssigned);
router.post('/assign', requireRole(70), createKpiSheet);
router.post('/review', requireRole(70), reviewKpiSheet);

// MD / HR Admin
router.get('/all', requireRole(80), getAllSheets);
router.delete('/:id', requireRole(70), deleteKpiSheet);
router.get('/summary/departmental', requireRole(80), getDepartmentalSummary);
router.get('/summary/individual', getIndividualSummary);
router.get('/:id', getSheetById);

export default router;
