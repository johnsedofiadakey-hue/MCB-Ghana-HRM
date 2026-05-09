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

// Create (HR Manager / IT Manager / MD only)
router.post('/', authorize(['HR_MANAGER', 'HR_DIRECTOR', 'IT_MANAGER', 'MD']), validate(CreateUserSchema), createEmployee);

// Update
// Allow self-edit; require rank 70+ to edit others
router.patch('/:id', (req, res, next) => {
  if ((req as any).user?.id === req.params.id) return next();
  return requireSpecificRole(['HR_MANAGER', 'HR_OFFICER', 'MD', 'DEV'])(req, res, next);
}, updateEmployee);

// PUT alias for EmployeeProfile compatibility
router.put('/:id', (req, res, next) => {
  if ((req as any).user?.id === req.params.id) return next();
  return requireSpecificRole(['HR_MANAGER', 'HR_OFFICER', 'MD', 'DEV'])(req, res, next);
}, updateEmployee);

// Delete (Archive) - Only HR and MD
router.delete('/:id', requireSpecificRole(['HR_MANAGER', 'HR_OFFICER', 'MD', 'DEV']), deleteEmployee);
router.delete('/:id/hard', requireSpecificRole(['HR_MANAGER', 'MD', 'DEV']), hardDeleteEmployee);
router.post('/:id/restore', requireSpecificRole(['HR_MANAGER', 'HR_OFFICER', 'MD', 'DEV']), restoreEmployee);

// Role assignment (Only HR and MD)
router.post('/assign-role', requireSpecificRole(['HR_MANAGER', 'MD', 'DEV']), assignRole);

router.post('/:id/upload-image', upload.single('avatar'), uploadImage);
router.post('/:id/avatar', uploadImage); // base64 path
router.post('/:id/signature', uploadSignature);

// Administrative reset (IT_MANAGER or MD >= 85)
router.post('/:id/reset-password', requireRole(85), resetEmployeePassword);

export default router;
