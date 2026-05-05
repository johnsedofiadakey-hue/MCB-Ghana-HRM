"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const appraisalController = __importStar(require("../controllers/appraisal.controller"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Initialize a new appraisal cycle (HR/MD)
router.post('/init', (0, auth_middleware_1.requireRole)(80), appraisalController.initAppraisalCycle);
// Get specific packet detail
router.get('/packet/:packetId', appraisalController.getPacketDetail);
// Submit a review (Self or Reviewer)
router.post('/review/:packetId', appraisalController.submitAppraisalReview);
// Get my own appraisal history (Packets)
router.get('/my-packets', appraisalController.getMyPackets);
// Get packets where I am a reviewer
router.get('/team-packets', (0, auth_middleware_1.requireRole)(70), appraisalController.getTeamPackets);
// Get packets awaiting final executive verdict (MD/Director)
router.get('/final-sign-off-list', (0, auth_middleware_1.requireRole)(80), appraisalController.getFinalVerdictList);
// Provide final executive sign-off
router.post('/final-sign-off', (0, auth_middleware_1.requireRole)(80), appraisalController.finalSignOff);
// Permanent Delete a packet (Director+)
router.delete('/:packetId', (0, auth_middleware_1.requireRole)(80), appraisalController.deleteAppraisalPacket);
// Appraisal Cycle Management (Director+)
router.get('/cycle/:cycleId/packets', (0, auth_middleware_1.requireRole)(75), appraisalController.getCyclePackets);
router.patch('/cycle/:id', (0, auth_middleware_1.requireRole)(80), appraisalController.updateAppraisalCycle);
router.delete('/cycle/:id', (0, auth_middleware_1.requireRole)(80), appraisalController.deleteAppraisalCycle);
// Update an active packet (MD/Director)
router.patch('/packet/:id', (0, auth_middleware_1.requireRole)(80), appraisalController.updateAppraisalPacket);
router.delete('/packet/:id', (0, auth_middleware_1.requireRole)(80), appraisalController.deleteAppraisalPacket);
// Dispute Management
router.post('/packet/:packetId/dispute', appraisalController.raiseAppraisalDispute);
router.post('/packet/:packetId/resolve', (0, auth_middleware_1.requireRole)(80), appraisalController.resolveAppraisalDispute);
// Data Integrity Purge (Ghost Cards Fix)
router.post('/purge-orphans', (0, auth_middleware_1.requireRole)(85), appraisalController.purgeOrphanPackets);
router.post('/ultimate-reset', (0, auth_middleware_1.requireRole)(90), appraisalController.resetAppraisalDomain);
// Performance Trend
router.get('/trend/:employeeId', appraisalController.getPerformanceTrend);
exports.default = router;
