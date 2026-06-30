import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { getHolidays, addHoliday, deleteHoliday, seedGhanaHolidays } from '../controllers/holiday.controller';
import { Permission } from '../types/permissions';

const router = Router();
router.use(authenticate);

router.get('/', getHolidays);
router.post('/', requirePermission(Permission.LEAVE_HR_APPROVE), addHoliday);
router.delete('/:id', requirePermission(Permission.LEAVE_HR_APPROVE), deleteHoliday);
router.post('/seed-ghana', requirePermission(Permission.LEAVE_HR_APPROVE), seedGhanaHolidays);

export default router;
