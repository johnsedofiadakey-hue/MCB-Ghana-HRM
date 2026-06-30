import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { validate, DepartmentSchema } from '../middleware/validate.middleware';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/department.controller';
import { Permission } from '../types/permissions';

const router = Router();
router.use(authenticate);

router.get('/', getDepartments);
router.post('/', requirePermission(Permission.EMPLOYEE_WRITE), validate(DepartmentSchema), createDepartment);
router.put('/:id', requirePermission(Permission.EMPLOYEE_WRITE), validate(DepartmentSchema.partial()), updateDepartment);
router.patch('/:id', requirePermission(Permission.EMPLOYEE_WRITE), validate(DepartmentSchema.partial()), updateDepartment);
router.delete('/:id', requirePermission(Permission.EMPLOYEE_WRITE), deleteDepartment);

export default router;
