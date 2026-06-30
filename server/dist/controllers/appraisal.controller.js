"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPerformanceTrend = exports.resetAppraisalDomain = exports.purgeOrphanPackets = exports.getCyclePackets = exports.resolveAppraisalDispute = exports.raiseAppraisalDispute = exports.deleteAppraisalPacket = exports.updateAppraisalPacket = exports.deleteAppraisalCycle = exports.updateAppraisalCycle = exports.cancelAppraisalPacket = exports.finalSignOff = exports.getFinalVerdictList = exports.getTeamPackets = exports.getMyPackets = exports.getPacketDetail = exports.submitAppraisalReview = exports.initAppraisalCycle = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const appraisal_service_1 = require("../services/appraisal.service");
const enterprise_controller_1 = require("./enterprise.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
// Local helper
const audit_service_1 = require("../services/audit.service");
const policy_service_1 = require("../services/policy.service");
const permissions_1 = require("../types/permissions");
const hierarchy_service_1 = require("../services/hierarchy.service");
const initAppraisalCycle = async (req, res) => {
    try {
        const userRole = req.user.role;
        if ((0, auth_middleware_1.getRoleRank)(userRole) < 85) {
            return res.status(403).json({ error: 'Only HR Managers or MD can initialize appraisal cycles' });
        }
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const result = await appraisal_service_1.AppraisalService.initCycle(organizationId, req.body);
        await (0, audit_service_1.logAction)(req.user.id, 'APPRAISAL_CYCLE_INIT', 'AppraisalCycle', result.cycle.id, {}, req.ip);
        return res.status(201).json(result);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
exports.initAppraisalCycle = initAppraisalCycle;
const submitAppraisalReview = async (req, res) => {
    try {
        const { packetId } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userId = req.user.id;
        const userRank = (0, auth_middleware_1.getRoleRank)(req.user.role);
        const userDeptId = req.user.departmentId;
        const review = await appraisal_service_1.AppraisalService.submitReview(packetId, userId, organizationId, { ...req.body, userRank, userDeptId });
        await (0, audit_service_1.logAction)(userId, 'APPRAISAL_REVIEW_SUBMITTED', 'AppraisalReview', review.id, { packetId }, req.ip);
        return res.json(review);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
exports.submitAppraisalReview = submitAppraisalReview;
const getPacketDetail = async (req, res) => {
    try {
        const { packetId } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userId = req.user.id;
        const userRole = req.user.role;
        const userRank = (0, auth_middleware_1.getRoleRank)(userRole);
        const canViewAll = (await policy_service_1.PolicyService.evaluatePolicy(userId, permissions_1.Permission.EMPLOYEE_HISTORY_READ)).allowed;
        const packet = await appraisal_service_1.AppraisalService.getPacketDetail(packetId, userId, organizationId, userRank, canViewAll);
        if (!packet)
            return res.status(404).json({ error: 'Appraisal packet not found' });
        return res.json(packet);
    }
    catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message });
    }
};
exports.getPacketDetail = getPacketDetail;
const getMyPackets = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userId = req.user.id;
        const packets = await appraisal_service_1.AppraisalService.getEmployeePackets(userId, organizationId);
        return res.json(packets);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getMyPackets = getMyPackets;
const getTeamPackets = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userId = req.user.id;
        const userRank = (0, auth_middleware_1.getRoleRank)(req.user.role);
        const canViewAll = (await policy_service_1.PolicyService.evaluatePolicy(userId, permissions_1.Permission.EMPLOYEE_HISTORY_READ)).allowed;
        console.log(`[AppraisalController] Fetching team packets: User=${userId}, Rank=${userRank}, Org=${organizationId}`);
        const packets = await appraisal_service_1.AppraisalService.getReviewerPackets(userId, organizationId, userRank, canViewAll);
        return res.json(packets);
    }
    catch (error) {
        console.error('[AppraisalController] CRITICAL FAILURE:', error);
        return res.status(500).json({
            error: error.message,
            stack: error.stack,
            hint: 'Check AppraisalService.getReviewerPackets for serialization or query errors'
        });
    }
};
exports.getTeamPackets = getTeamPackets;
const getFinalVerdictList = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const packets = await appraisal_service_1.AppraisalService.getFinalVerdictList(organizationId);
        return res.json(packets);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getFinalVerdictList = getFinalVerdictList;
const finalSignOff = async (req, res) => {
    try {
        const { packetId, finalVerdict, finalScore, arbitrationLogic, assignedTargets } = req.body;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const user = req.user;
        // Only HR Manager or higher (Rank 85+) can perform final signoff
        if ((0, auth_middleware_1.getRoleRank)(user.role) < 85) {
            return res.status(403).json({ error: 'Only HR Managers or MD can perform final appraisal sign-off' });
        }
        const packet = await appraisal_service_1.AppraisalService.finalizePacket(packetId, user.id, organizationId, finalVerdict, finalScore, arbitrationLogic, assignedTargets);
        await (0, audit_service_1.logAction)(user.id, 'APPRAISAL_FINALIZED', 'AppraisalPacket', packet.id, { arbitrationLogic, targetCount: assignedTargets?.length || 0 }, req.ip);
        return res.json(packet);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
exports.finalSignOff = finalSignOff;
// Cancel/void an appraisal packet (Director+ only)
const cancelAppraisalPacket = async (req, res) => {
    try {
        const { packetId } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userRole = req.user.role;
        // BUG A1 FIX: Add explicit role guard
        if ((0, auth_middleware_1.getRoleRank)(userRole) < 80) {
            return res.status(403).json({ error: 'Only Directors or MD can cancel appraisal packets' });
        }
        const packet = await client_1.default.appraisalPacket.findUnique({
            where: { id: packetId, organizationId }
        });
        if (!packet)
            return res.status(404).json({ error: 'Packet not found' });
        await client_1.default.appraisalPacket.update({
            where: { id: packetId },
            data: { status: 'CANCELLED', currentStage: 'CANCELLED' }
        });
        await (0, audit_service_1.logAction)(req.user.id, 'APPRAISAL_CANCELLED', 'AppraisalPacket', packetId, {}, req.ip);
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.cancelAppraisalPacket = cancelAppraisalPacket;
const updateAppraisalCycle = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userRole = req.user.role;
        // BUG A2 FIX: Add explicit role guard
        if ((0, auth_middleware_1.getRoleRank)(userRole) < 85) {
            return res.status(403).json({ error: 'Only HR Managers or MD can update appraisal cycles' });
        }
        const cycle = await appraisal_service_1.AppraisalService.updateCycle(organizationId, id, req.body);
        return res.json(cycle);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.updateAppraisalCycle = updateAppraisalCycle;
const deleteAppraisalCycle = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userRole = req.user.role;
        // BUG A2 FIX: Add explicit role guard
        if ((0, auth_middleware_1.getRoleRank)(userRole) < 85) {
            return res.status(403).json({ error: 'Only HR Managers or MD can delete appraisal cycles' });
        }
        await appraisal_service_1.AppraisalService.deleteCycle(organizationId, id);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.deleteAppraisalCycle = deleteAppraisalCycle;
const updateAppraisalPacket = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userRole = req.user.role;
        // Only Director+ can modify active packets
        if ((0, auth_middleware_1.getRoleRank)(userRole) < 80) {
            return res.status(403).json({ error: 'Not authorised to modify appraisal packets' });
        }
        const packet = await appraisal_service_1.AppraisalService.updatePacket(organizationId, id, req.body);
        return res.json(packet);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.updateAppraisalPacket = updateAppraisalPacket;
const deleteAppraisalPacket = async (req, res) => {
    try {
        const id = req.params.id || req.params.packetId;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userRole = req.user.role;
        if ((0, auth_middleware_1.getRoleRank)(userRole) < 80) {
            return res.status(403).json({ error: 'Not authorised to delete appraisal packets' });
        }
        await appraisal_service_1.AppraisalService.deletePacket(organizationId, id);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.deleteAppraisalPacket = deleteAppraisalPacket;
const raiseAppraisalDispute = async (req, res) => {
    try {
        const { packetId } = req.params;
        const { reason } = req.body;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userId = req.user.id;
        const packet = await appraisal_service_1.AppraisalService.raiseDispute(packetId, userId, organizationId, reason);
        await (0, audit_service_1.logAction)(userId, 'APPRAISAL_DISPUTE_RAISED', 'AppraisalPacket', packetId, { reason }, req.ip);
        return res.json(packet);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
exports.raiseAppraisalDispute = raiseAppraisalDispute;
const resolveAppraisalDispute = async (req, res) => {
    try {
        const { packetId } = req.params;
        const { resolution, finalScore, finalVerdict } = req.body;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userId = req.user.id;
        // Only HR/MD (Rank 85+) can resolve
        if ((0, auth_middleware_1.getRoleRank)(req.user.role) < 85) {
            return res.status(403).json({ error: 'Not authorised to resolve appraisal disputes' });
        }
        const packet = await appraisal_service_1.AppraisalService.resolveDispute(packetId, userId, organizationId, resolution, finalScore, finalVerdict);
        await (0, audit_service_1.logAction)(userId, 'APPRAISAL_DISPUTE_RESOLVED', 'AppraisalPacket', packetId, { resolution, finalScore }, req.ip);
        return res.json(packet);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
exports.resolveAppraisalDispute = resolveAppraisalDispute;
const getCyclePackets = async (req, res) => {
    try {
        const { cycleId } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userRole = req.user.role;
        // Only Rank 80+ or HR can view cycle packets listing
        if ((0, auth_middleware_1.getRoleRank)(userRole) < 80) {
            return res.status(403).json({ error: 'Not authorised to view cycle packets' });
        }
        const packets = await appraisal_service_1.AppraisalService.getCyclePackets(organizationId, cycleId);
        return res.json(packets);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getCyclePackets = getCyclePackets;
const purgeOrphanPackets = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userRole = req.user.role;
        // Only HR Manager or MD (Rank 85+) can trigger purge
        if ((0, auth_middleware_1.getRoleRank)(userRole) < 85) {
            return res.status(403).json({ error: 'Not authorised to perform data purges' });
        }
        const result = await appraisal_service_1.AppraisalService.cleanupOrphanedPackets(organizationId);
        return res.json({
            success: true,
            message: result.message,
            count: result.count
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.purgeOrphanPackets = purgeOrphanPackets;
const resetAppraisalDomain = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userRole = req.user.role;
        // ONLY MD (Rank 90+) can perform a Factory Reset
        if ((0, auth_middleware_1.getRoleRank)(userRole) < 90) {
            return res.status(403).json({ error: 'CRITICAL ACCESS DENIED: Only the Managing Director can perform a Factory Reset.' });
        }
        const result = await appraisal_service_1.AppraisalService.ultimateReset(organizationId);
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.resetAppraisalDomain = resetAppraisalDomain;
const getPerformanceTrend = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const user = req.user;
        if (user.id !== employeeId) {
            const [peopleAccess, managedIds] = await Promise.all([
                policy_service_1.PolicyService.evaluatePolicy(user.id, permissions_1.Permission.EMPLOYEE_READ, { targetUserId: employeeId }),
                hierarchy_service_1.HierarchyService.getManagedEmployeeIds(user.id, organizationId),
            ]);
            if (!peopleAccess.allowed && !managedIds.includes(employeeId)) {
                return res.status(403).json({ error: 'Not authorised to view performance trends for this employee' });
            }
        }
        const trend = await appraisal_service_1.AppraisalService.getEmployeePerformanceTrend(employeeId, organizationId);
        return res.json(trend);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getPerformanceTrend = getPerformanceTrend;
