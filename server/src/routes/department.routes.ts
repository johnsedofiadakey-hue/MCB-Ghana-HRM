import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, DepartmentSchema } from '../middleware/validate.middleware';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/department.controller';

const router = Router();
router.use(authenticate);

router.get('/', getDepartments);
router.post('/', requireRole(75), validate(DepartmentSchema), createDepartment);
router.put('/:id', requireRole(75), validate(DepartmentSchema.partial()), updateDepartment);
router.patch('/:id', requireRole(75), validate(DepartmentSchema.partial()), updateDepartment);
router.delete('/:id', requireRole(80), deleteDepartment);

export default router;
