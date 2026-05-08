import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import * as appraisalController from '../controllers/appraisal.controller';

const router = Router();

router.use(authenticate);

// Initialize a new appraisal cycle (HR/MD)
router.post('/init', requireRole(80), appraisalController.initAppraisalCycle);

// Get specific packet detail
router.get('/packet/:packetId', appraisalController.getPacketDetail);

// Submit a review (Self or Reviewer)
router.post('/review/:packetId', appraisalController.submitAppraisalReview);

// Get my own appraisal history (Packets)
router.get('/my-packets', appraisalController.getMyPackets);

// Get packets where I am a reviewer
router.get('/team-packets', requireRole(70), appraisalController.getTeamPackets);

// Get packets awaiting final executive verdict (MD/Director)
router.get('/final-sign-off-list', requireRole(80), appraisalController.getFinalVerdictList);

// Provide final executive sign-off
router.post('/final-sign-off', requireRole(80), appraisalController.finalSignOff);

// Permanent Delete a packet (Director+)
router.delete('/:packetId', requireRole(80), appraisalController.deleteAppraisalPacket);

// Appraisal Cycle Management (Director+)
router.get('/cycle/:cycleId/packets', requireRole(75), appraisalController.getCyclePackets);
router.patch('/cycle/:id', requireRole(80), appraisalController.updateAppraisalCycle);
router.delete('/cycle/:id', requireRole(80), appraisalController.deleteAppraisalCycle);


// Update an active packet (MD/Director)
router.patch('/packet/:id', requireRole(80), appraisalController.updateAppraisalPacket);
router.delete('/packet/:id', requireRole(80), appraisalController.deleteAppraisalPacket);

// Dispute Management
router.post('/packet/:packetId/dispute', appraisalController.raiseAppraisalDispute);
router.post('/packet/:packetId/resolve', requireRole(80), appraisalController.resolveAppraisalDispute);

// Data Integrity Purge (Ghost Cards Fix)
router.post('/purge-orphans', requireRole(85), appraisalController.purgeOrphanPackets);
router.post('/ultimate-reset', requireRole(90), appraisalController.resetAppraisalDomain);

// Performance Trend
router.get('/trend/:employeeId', appraisalController.getPerformanceTrend);

export default router;


