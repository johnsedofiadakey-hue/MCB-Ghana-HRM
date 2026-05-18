"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const user_controller_1 = require("../controllers/user.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Read
router.get('/me/team', user_controller_1.getMyTeam);
router.get('/supervisors', user_controller_1.getSupervisors);
router.get('/', (0, auth_middleware_1.requireRole)(50), user_controller_1.getAllEmployees);
router.get('/:id', user_controller_1.getEmployee);
router.get('/:id/risk', (0, auth_middleware_1.requireRole)(80), user_controller_1.getUserRiskProfile);
router.get('/:id/risk-profile', (0, auth_middleware_1.requireRole)(80), user_controller_1.getUserRiskProfile); // alias
const hrAdminRoles = ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'MD', 'SUPER_ADMIN', 'DEV'];
const hrSeniorRoles = ['HR_DIRECTOR', 'HR_MANAGER', 'HR_ADMIN', 'MD', 'SUPER_ADMIN', 'DEV'];
// Create (HR / IT Manager / MD only)
router.post('/', (0, auth_middleware_1.authorize)(['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'MD', 'SUPER_ADMIN', 'DEV']), (0, validate_middleware_1.validate)(validate_middleware_1.CreateUserSchema), user_controller_1.createEmployee);
// Update
// Allow self-edit; require rank 70+ to edit others
router.patch('/:id', (req, res, next) => {
    if (req.user?.id === req.params.id)
        return next();
    return (0, auth_middleware_1.requireSpecificRole)(hrAdminRoles)(req, res, next);
}, user_controller_1.updateEmployee);
// PUT alias for EmployeeProfile compatibility
router.put('/:id', (req, res, next) => {
    if (req.user?.id === req.params.id)
        return next();
    return (0, auth_middleware_1.requireSpecificRole)(hrAdminRoles)(req, res, next);
}, user_controller_1.updateEmployee);
// Delete (Archive) - Only HR and MD
router.delete('/:id', (0, auth_middleware_1.requireSpecificRole)(hrAdminRoles), user_controller_1.deleteEmployee);
router.delete('/:id/hard', (0, auth_middleware_1.requireSpecificRole)(hrSeniorRoles), user_controller_1.hardDeleteEmployee);
router.post('/:id/restore', (0, auth_middleware_1.requireSpecificRole)(hrAdminRoles), user_controller_1.restoreEmployee);
// Role assignment (Only HR and MD)
router.post('/assign-role', (0, auth_middleware_1.requireSpecificRole)(hrSeniorRoles), user_controller_1.assignRole);
router.post('/:id/upload-image', upload_middleware_1.upload.single('avatar'), user_controller_1.uploadImage);
router.post('/:id/avatar', user_controller_1.uploadImage); // base64 path
router.post('/signature', user_controller_1.uploadSignature);
router.post('/:id/signature', user_controller_1.uploadSignature);
// Administrative reset (IT_MANAGER or MD >= 85)
router.post('/:id/reset-password', (0, auth_middleware_1.requireRole)(85), user_controller_1.resetEmployeePassword);
exports.default = router;
