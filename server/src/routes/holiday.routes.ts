import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import { getHolidays, addHoliday, deleteHoliday, seedGhanaHolidays } from '../controllers/holiday.controller';

const router = Router();
router.use(authenticate);

router.get('/', getHolidays);
router.post('/', requireRole(80), addHoliday);
router.delete('/:id', requireRole(80), deleteHoliday);
router.post('/seed-ghana', requireRole(80), seedGhanaHolidays);

export default router;
