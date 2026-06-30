import { Router } from 'express';
import * as offboardingController from '../controllers/offboarding.controller';
import { authenticate, requireSpecificRole } from '../middleware/auth.middleware';

const router = Router();

// Templates
const hrRoles = ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'MD', 'DEV'];
const clearanceRoles = [...hrRoles, 'IT_MANAGER', 'IT_ADMIN'];
router.get('/templates', authenticate, requireSpecificRole(hrRoles), offboardingController.getTemplates);
router.post('/templates', authenticate, requireSpecificRole(hrRoles), offboardingController.createTemplate);

// Initiation & Status Update (Rank 70+ HR Manager/MD)
router.post('/initiate', authenticate, requireSpecificRole(hrRoles), offboardingController.initiateOffboarding);
router.get('/list', authenticate, requireSpecificRole(clearanceRoles), offboardingController.getOffboardingList);
router.get('/:id', authenticate, requireSpecificRole(clearanceRoles), offboardingController.getOffboardingDetails);
router.patch('/:id/complete', authenticate, requireSpecificRole(hrRoles), offboardingController.completeOffboarding);

// Clearance Tasks
router.post('/task/complete', authenticate, requireSpecificRole(clearanceRoles), offboardingController.completeClearanceTask);

// Exit Interview
router.patch('/:offboardingId/interview', authenticate, requireSpecificRole(hrRoles), offboardingController.updateExitInterview);

// Assets
router.post('/assets/return', authenticate, requireSpecificRole(clearanceRoles), offboardingController.trackAssetReturn);

// Administrative Deletion (MD Only)
router.delete('/:id', authenticate, requireSpecificRole(['HR_DIRECTOR', 'MD', 'DEV']), offboardingController.deleteOffboarding);

export default router;
