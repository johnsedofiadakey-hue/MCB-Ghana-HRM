import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
    // Disciplinary
    listDisciplinaryCases,
    createDisciplinaryCase,
    updateDisciplinaryCase,
    deleteDisciplinaryCase,
    // Policy Library
    listPolicies,
    createPolicy,
    updatePolicy,
    deletePolicy,
    acknowledgePolicy,
    getPolicyAcknowledgments,
    // Probation
    listProbationRecords,
    createProbationRecord,
    updateProbationRecord,
    getProbationStats,
    // Promotions
    listPromotionRequests,
    createPromotionRequest,
    updatePromotionStatus,
} from '../controllers/hrFeatures.controller';

const router = Router();
router.use(authenticate);

// ── Disciplinary & Grievance ─────────────────────────────────────────────────
router.get('/disciplinary', listDisciplinaryCases);
router.post('/disciplinary', createDisciplinaryCase);
router.patch('/disciplinary/:id', updateDisciplinaryCase);
router.delete('/disciplinary/:id', deleteDisciplinaryCase);

// ── Policy Library ───────────────────────────────────────────────────────────
router.get('/policies', listPolicies);
router.post('/policies', createPolicy);
router.patch('/policies/:id', updatePolicy);
router.delete('/policies/:id', deletePolicy);
router.post('/policies/:id/acknowledge', acknowledgePolicy);
router.get('/policies/:id/acknowledgments', getPolicyAcknowledgments);

// ── Probation ────────────────────────────────────────────────────────────────
router.get('/probation', listProbationRecords);
router.get('/probation/stats', getProbationStats);
router.post('/probation', createProbationRecord);
router.patch('/probation/:id', updateProbationRecord);

// ── Promotions ───────────────────────────────────────────────────────────────
router.get('/promotions', listPromotionRequests);
router.post('/promotions', createPromotionRequest);
router.patch('/promotions/:id', updatePromotionStatus);

export default router;
