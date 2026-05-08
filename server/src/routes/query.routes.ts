import { Router } from 'express';
import { getEmployeeQueries, createQuery, updateQueryStatus } from '../controllers/query.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/employee/:id', getEmployeeQueries);
router.post('/employee/:id', createQuery);
router.patch('/:id/status', updateQueryStatus);

export default router;
