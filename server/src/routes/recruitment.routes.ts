import { Router } from 'express';
import * as recruitmentController from '../controllers/recruitment.controller';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';
import { validate, JobPositionSchema, CandidateApplicationSchema, InterviewScheduleSchema } from '../middleware/validate.middleware';

const router = Router();
const hrRecruitmentRoles = ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'MD', 'DEV'];

// Public / Internal Job Board (Anyone authenticated can view)
router.get('/jobs', authenticate, recruitmentController.getJobPositions);

// Public Application
router.post('/apply', validate(CandidateApplicationSchema), recruitmentController.applyForJob);

// Admin / HR Management (Rank 70+ like HR Manager, MD)
router.post('/jobs', authenticate, requireSpecificRole(hrRecruitmentRoles), validate(JobPositionSchema), recruitmentController.createJobPosition);
router.patch('/jobs/:id', authenticate, requireSpecificRole(hrRecruitmentRoles), recruitmentController.updateJobPosition);

router.get('/candidates', authenticate, requireSpecificRole(hrRecruitmentRoles), recruitmentController.getCandidates);
router.patch('/candidates/:id/status', authenticate, requireSpecificRole(hrRecruitmentRoles), recruitmentController.updateCandidateStatus);

router.post('/interviews/schedule', authenticate, requireSpecificRole(hrRecruitmentRoles), validate(InterviewScheduleSchema), recruitmentController.scheduleInterview);
router.post('/interviews', authenticate, requireSpecificRole(hrRecruitmentRoles), validate(InterviewScheduleSchema), recruitmentController.scheduleInterview);
router.post('/interviews/feedback', authenticate, recruitmentController.submitInterviewFeedback);

export default router;
