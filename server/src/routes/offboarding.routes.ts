import { Router } from 'express';
import * as offboardingController from '../controllers/offboarding.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { RoleRank } from '../types/roles';

const router = Router();

// Templates
router.get('/templates', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.getTemplates);
router.post('/templates', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.createTemplate);

// Initiation & Status Update (Rank 70+ HR Manager/MD)
router.post('/initiate', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.initiateOffboarding);
router.get('/list', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.getOffboardingList);
router.get('/:id', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.getOffboardingDetails);
router.patch('/:id/complete', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.completeOffboarding);

// Clearance Tasks
router.post('/task/complete', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.completeClearanceTask);

// Exit Interview
router.patch('/:offboardingId/interview', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.updateExitInterview);

// Assets
router.post('/assets/return', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.trackAssetReturn);

// Administrative Deletion (MD Only)
router.delete('/:id', authenticate, requireRole(85), offboardingController.deleteOffboarding);

export default router;
