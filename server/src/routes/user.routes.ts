import { Router } from 'express';
import { authenticate, requireRole, authorize } from '../middleware/auth.middleware';
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
router.get('/:id/risk', authorize(['HR_OFFICER', 'HR_MANAGER', 'IT_MANAGER', 'MD']), getUserRiskProfile);
router.get('/:id/risk-profile', authorize(['HR_OFFICER', 'HR_MANAGER', 'IT_MANAGER', 'MD']), getUserRiskProfile); // alias

// Create (HR Manager / IT Manager / MD only)
router.post('/', authorize(['HR_MANAGER', 'IT_MANAGER', 'MD']), validate(CreateUserSchema), createEmployee);

// Update
// Allow self-edit; require rank 70+ to edit others
router.patch('/:id', (req, res, next) => {
  if ((req as any).user?.id === req.params.id) return next();
  return requireRole(70)(req, res, next);
}, updateEmployee);

// PUT alias for EmployeeProfile compatibility
router.put('/:id', requireRole(70), updateEmployee);

// Delete (Archive) - HR Manager / IT Manager / DEV only
router.delete('/:id', authorize(['HR_MANAGER', 'IT_MANAGER', 'DEV']), deleteEmployee);
router.delete('/:id/hard', authorize(['HR_MANAGER', 'IT_MANAGER', 'DEV']), hardDeleteEmployee);
router.post('/:id/restore', authorize(['HR_MANAGER', 'IT_MANAGER', 'DEV']), restoreEmployee);

// Role assignment (MD or Admin Managers 85+)
router.post('/assign-role', requireRole(85), assignRole);

router.post('/:id/upload-image', upload.single('avatar'), uploadImage);
router.post('/:id/avatar', uploadImage); // base64 path
router.post('/:id/signature', uploadSignature);

// Administrative reset (IT_MANAGER or MD >= 85)
router.post('/:id/reset-password', requireRole(85), resetEmployeePassword);

export default router;
