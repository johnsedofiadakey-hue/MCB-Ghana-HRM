import { Router } from 'express';
import { authenticate, requireRole, authorize, requireSpecificRole } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { validate, CreateUserSchema, UpdateUserSchema } from '../middleware/validate.middleware';
import {
  createEmployee, getAllEmployees, getEmployee,
  updateEmployee, deleteEmployee, hardDeleteEmployee,
  restoreEmployee,
  uploadImage, uploadSignature, getMyTeam, getSupervisors,
  assignRole, getUserRiskProfile, resetEmployeePassword
} from '../controllers/user.controller';

const router = Router();
router.use(authenticate);

// Read
router.get('/me/team', getMyTeam);
router.get('/supervisors', getSupervisors);
router.get('/', requireRole(50), getAllEmployees);
router.get('/:id', getEmployee);
router.get('/:id/risk', requireRole(80), getUserRiskProfile);
router.get('/:id/risk-profile', requireRole(80), getUserRiskProfile); // alias

const hrAdminRoles = ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'MD', 'SUPER_ADMIN', 'DEV'];
const hrSeniorRoles = ['HR_DIRECTOR', 'HR_MANAGER', 'HR_ADMIN', 'MD', 'SUPER_ADMIN', 'DEV'];

// Create (HR / IT Manager / MD only)
router.post('/', authorize(['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'MD', 'SUPER_ADMIN', 'DEV']), validate(CreateUserSchema), createEmployee);

// Update
// Allow self-edit; require rank 70+ to edit others
router.patch('/:id', (req, res, next) => {
  if ((req as any).user?.id === req.params.id) return next();
  return requireSpecificRole(hrAdminRoles)(req, res, next);
}, updateEmployee);

// PUT alias for EmployeeProfile compatibility
router.put('/:id', (req, res, next) => {
  if ((req as any).user?.id === req.params.id) return next();
  return requireSpecificRole(hrAdminRoles)(req, res, next);
}, updateEmployee);

// Delete (Archive) - Only HR and MD
router.delete('/:id', requireSpecificRole(hrAdminRoles), deleteEmployee);
router.delete('/:id/hard', requireSpecificRole(hrSeniorRoles), hardDeleteEmployee);
router.post('/:id/restore', requireSpecificRole(hrAdminRoles), restoreEmployee);

// Role assignment (Only HR and MD)
router.post('/assign-role', requireSpecificRole(hrSeniorRoles), assignRole);

router.post('/:id/upload-image', upload.single('avatar'), uploadImage);
router.post('/:id/avatar', uploadImage); // base64 path
router.post('/signature', uploadSignature);
router.post('/:id/signature', uploadSignature);

// Administrative reset (IT_MANAGER or MD >= 85)
router.post('/:id/reset-password', requireRole(85), resetEmployeePassword);

export default router;
