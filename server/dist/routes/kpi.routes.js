"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const enterprise_controller_1 = require("../controllers/enterprise.controller");
const migrate_departments_1 = require("../scripts/migrate_departments");
const kpi_controller_1 = require("../controllers/kpi.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Strategic Mandates
router.get('/department', enterprise_controller_1.listDepartmentKPIs);
router.get('/mandates', kpi_controller_1.getStrategicMandates);
router.get('/department-list', (0, auth_middleware_1.requireRole)(70), enterprise_controller_1.listDepartmentKPIsLegacy);
router.post('/repair-tenants', (0, auth_middleware_1.requireRole)(80), migrate_departments_1.migrateDepartmentsToTenant);
router.post('/assign-template', (0, auth_middleware_1.requireRole)(70), kpi_controller_1.assignFromTemplate);
// Employee
router.get('/my-sheets', kpi_controller_1.getMySheets);
router.patch('/update-progress', kpi_controller_1.updateKpiProgress);
router.post('/recall', kpi_controller_1.recallKpiSheet);
// Manager / MD / Supervisor
router.get('/assigned', kpi_controller_1.getSheetsIAssigned);
router.post('/assign', (0, auth_middleware_1.requireRole)(70), kpi_controller_1.createKpiSheet);
router.post('/review', (0, auth_middleware_1.requireRole)(70), kpi_controller_1.reviewKpiSheet);
// MD / HR Admin
router.get('/all', (0, auth_middleware_1.requireRole)(80), kpi_controller_1.getAllSheets);
router.delete('/:id', (0, auth_middleware_1.requireRole)(70), kpi_controller_1.deleteKpiSheet);
router.get('/summary/departmental', (0, auth_middleware_1.requireRole)(80), kpi_controller_1.getDepartmentalSummary);
router.get('/summary/individual', kpi_controller_1.getIndividualSummary);
router.get('/:id', kpi_controller_1.getSheetById);
exports.default = router;
