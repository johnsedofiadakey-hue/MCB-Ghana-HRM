import { Router } from 'express';
import * as recruitmentController from '../controllers/recruitment.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, JobPositionSchema, CandidateApplicationSchema, InterviewScheduleSchema } from '../middleware/validate.middleware';
import { RoleRank } from '../types/roles';

const router = Router();

// Public / Internal Job Board (Anyone authenticated can view)
router.get('/jobs', authenticate, recruitmentController.getJobPositions);

// Public Application
router.post('/apply', validate(CandidateApplicationSchema), recruitmentController.applyForJob);

// Admin / HR Management (Rank 70+ like HR Manager, MD)
router.post('/jobs', authenticate, requireRole(RoleRank.HR_OFFICER), validate(JobPositionSchema), recruitmentController.createJobPosition);
router.patch('/jobs/:id', authenticate, requireRole(RoleRank.HR_OFFICER), recruitmentController.updateJobPosition);

router.get('/candidates', authenticate, requireRole(RoleRank.HR_OFFICER), recruitmentController.getCandidates);
router.patch('/candidates/:id/status', authenticate, requireRole(RoleRank.HR_OFFICER), recruitmentController.updateCandidateStatus);

router.post('/interviews/schedule', authenticate, requireRole(RoleRank.HR_OFFICER), validate(InterviewScheduleSchema), recruitmentController.scheduleInterview);
router.post('/interviews/feedback', authenticate, recruitmentController.submitInterviewFeedback);

export default router;
