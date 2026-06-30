import { Router } from 'express';
import { authenticate, requireRole, requireSpecificRole } from '../middleware/auth.middleware';
import * as appraisalController from '../controllers/appraisal.controller';

const router = Router();
const appraisalAdminRoles = ['HR_DIRECTOR', 'HR_MANAGER', 'MD', 'DEV'];

router.use(authenticate);

// Initialize a new appraisal cycle (HR/MD)
router.post('/init', requireSpecificRole(appraisalAdminRoles), appraisalController.initAppraisalCycle);

// Get specific packet detail
router.get('/packet/:packetId', appraisalController.getPacketDetail);

// Submit a review (Self or Reviewer)
router.post('/review/:packetId', appraisalController.submitAppraisalReview);

// Get my own appraisal history (Packets)
router.get('/my-packets', appraisalController.getMyPackets);

// Get packets where I am a reviewer
router.get('/team-packets', requireRole(70), appraisalController.getTeamPackets);

// Get packets awaiting final executive verdict (MD/Director)
router.get('/final-sign-off-list', requireSpecificRole(appraisalAdminRoles), appraisalController.getFinalVerdictList);

// Provide final executive sign-off
router.post('/final-sign-off', requireSpecificRole(appraisalAdminRoles), appraisalController.finalSignOff);
router.post('/final-verdict', requireSpecificRole(appraisalAdminRoles), appraisalController.finalSignOff);

// Permanent Delete a packet (Director+)
router.delete('/:packetId', requireSpecificRole(appraisalAdminRoles), appraisalController.deleteAppraisalPacket);

// Appraisal Cycle Management (Director+)
router.get('/cycle/:cycleId/packets', requireSpecificRole(appraisalAdminRoles), appraisalController.getCyclePackets);
router.patch('/cycle/:id', requireSpecificRole(appraisalAdminRoles), appraisalController.updateAppraisalCycle);
router.delete('/cycle/:id', requireSpecificRole(appraisalAdminRoles), appraisalController.deleteAppraisalCycle);


// Update an active packet (MD/Director)
router.patch('/packet/:id', requireSpecificRole(appraisalAdminRoles), appraisalController.updateAppraisalPacket);
router.delete('/packet/:id', requireSpecificRole(appraisalAdminRoles), appraisalController.deleteAppraisalPacket);

// Dispute Management
router.post('/packet/:packetId/dispute', appraisalController.raiseAppraisalDispute);
router.post('/packet/:packetId/resolve', requireSpecificRole(appraisalAdminRoles), appraisalController.resolveAppraisalDispute);

// Data Integrity Purge (Ghost Cards Fix)
router.post('/purge-orphans', requireSpecificRole(appraisalAdminRoles), appraisalController.purgeOrphanPackets);
router.post('/ultimate-reset', requireSpecificRole(['MD', 'DEV']), appraisalController.resetAppraisalDomain);

// Performance Trend
router.get('/trend/:employeeId', appraisalController.getPerformanceTrend);

export default router;
