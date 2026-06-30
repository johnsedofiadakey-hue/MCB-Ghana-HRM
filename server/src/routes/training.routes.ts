import { Router } from 'express';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';
import { validate, TrainingProgramSchema } from '../middleware/validate.middleware';
import { getPrograms, createProgram, enroll, markComplete, getMyTraining, exportTrainingCSV } from '../controllers/training.controller';

const router = Router();
const hrTrainingRoles = ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'MD', 'DEV'];
router.use(authenticate);

router.get('/my', getMyTraining);
router.get('/', getPrograms);
router.post('/enroll', enroll);
router.post('/complete', markComplete);

router.post('/', requireSpecificRole(hrTrainingRoles), validate(TrainingProgramSchema), createProgram);
router.get('/export/csv', requireSpecificRole(hrTrainingRoles), exportTrainingCSV);

export default router;
