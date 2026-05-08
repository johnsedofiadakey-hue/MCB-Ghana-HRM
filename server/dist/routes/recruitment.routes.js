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
const recruitmentController = __importStar(require("../controllers/recruitment.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// Public / Internal Job Board (Anyone authenticated can view)
router.get('/jobs', auth_middleware_1.authenticate, recruitmentController.getJobPositions);
// Public Application
router.post('/apply', (0, validate_middleware_1.validate)(validate_middleware_1.CandidateApplicationSchema), recruitmentController.applyForJob);
// Admin / HR Management (Rank 70+ like HR Manager, MD)
router.post('/jobs', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(roles_1.RoleRank.HR_OFFICER), (0, validate_middleware_1.validate)(validate_middleware_1.JobPositionSchema), recruitmentController.createJobPosition);
router.patch('/jobs/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(roles_1.RoleRank.HR_OFFICER), recruitmentController.updateJobPosition);
router.get('/candidates', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(roles_1.RoleRank.HR_OFFICER), recruitmentController.getCandidates);
router.patch('/candidates/:id/status', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(roles_1.RoleRank.HR_OFFICER), recruitmentController.updateCandidateStatus);
router.post('/interviews/schedule', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(roles_1.RoleRank.HR_OFFICER), (0, validate_middleware_1.validate)(validate_middleware_1.InterviewScheduleSchema), recruitmentController.scheduleInterview);
router.post('/interviews/feedback', auth_middleware_1.authenticate, recruitmentController.submitInterviewFeedback);
exports.default = router;
