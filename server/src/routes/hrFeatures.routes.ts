import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '../types/permissions';
import {
    // Disciplinary
    listDisciplinaryCases,
    createDisciplinaryCase,
    updateDisciplinaryCase,
    deleteDisciplinaryCase,
    getMyDisciplinaryCases,
    acknowledgeDisciplinaryCase,
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
router.get('/disciplinary/mine', getMyDisciplinaryCases);
router.post('/disciplinary/:id/acknowledge', acknowledgeDisciplinaryCase);
router.get('/disciplinary', requirePermission(Permission.EMPLOYEE_HISTORY_READ), listDisciplinaryCases);
router.post('/disciplinary', requirePermission(Permission.EMPLOYEE_HISTORY_WRITE), createDisciplinaryCase);
router.patch('/disciplinary/:id', requirePermission(Permission.EMPLOYEE_HISTORY_WRITE), updateDisciplinaryCase);
router.delete('/disciplinary/:id', requirePermission(Permission.EMPLOYEE_HISTORY_WRITE), deleteDisciplinaryCase);

// ── Policy Library ───────────────────────────────────────────────────────────
router.get('/policies', listPolicies);
router.post('/policies', requirePermission(Permission.EMPLOYEE_WRITE), createPolicy);
router.patch('/policies/:id', requirePermission(Permission.EMPLOYEE_WRITE), updatePolicy);
router.delete('/policies/:id', requirePermission(Permission.EMPLOYEE_WRITE), deletePolicy);
router.post('/policies/:id/acknowledge', acknowledgePolicy);
router.get('/policies/:id/acknowledgments', requirePermission(Permission.EMPLOYEE_READ), getPolicyAcknowledgments);

// ── Probation ────────────────────────────────────────────────────────────────
router.get('/probation', requirePermission(Permission.EMPLOYEE_HISTORY_READ), listProbationRecords);
router.get('/probation/stats', requirePermission(Permission.EMPLOYEE_HISTORY_READ), getProbationStats);
router.post('/probation', requirePermission(Permission.EMPLOYEE_HISTORY_WRITE), createProbationRecord);
router.patch('/probation/:id', requirePermission(Permission.EMPLOYEE_HISTORY_WRITE), updateProbationRecord);

// ── Promotions ───────────────────────────────────────────────────────────────
router.get('/promotions', requirePermission(Permission.EMPLOYEE_HISTORY_READ), listPromotionRequests);
router.post('/promotions', requirePermission(Permission.EMPLOYEE_HISTORY_WRITE), createPromotionRequest);
router.patch('/promotions/:id', requirePermission(Permission.COMPENSATION_MANAGE), updatePromotionStatus);

export default router;
