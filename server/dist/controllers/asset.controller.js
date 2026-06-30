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
exports.deleteAsset = exports.returnAsset = exports.assignAsset = exports.getInventory = exports.createAsset = void 0;
const assetService = __importStar(require("../services/asset.service"));
const audit_service_1 = require("../services/audit.service");
const onboarding_events_service_1 = require("../services/onboarding-events.service");
const policy_service_1 = require("../services/policy.service");
const permissions_1 = require("../types/permissions");
const createAsset = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const asset = await assetService.createAsset(organizationId, req.body);
        await (0, audit_service_1.logAction)(user.id, 'CREATE_ASSET', 'Asset', asset.id, { serial: asset.serialNumber }, req.ip);
        res.status(201).json(asset);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createAsset = createAsset;
const getInventory = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const actorRole = userReq.role;
        const actorId = userReq.id;
        let assets = await assetService.getAllAssets(organizationId);
        // 🛡️ ASSET GOVERNANCE (Strict Role-Based Isolation):
        // - MD / IT_MANAGER / DEV can see all inventory.
        // - All other roles see only assets assigned to THEM personally.
        const isFullAccess = (await policy_service_1.PolicyService.evaluatePolicy(actorId, permissions_1.Permission.ASSET_MANAGE)).allowed;
        if (!isFullAccess) {
            assets = assets.filter(asset => asset.assignments.some(a => a.userId === actorId));
        }
        res.json(assets);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getInventory = getInventory;
const assignAsset = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const { assetId, userId, condition, signature } = req.body;
        const assignment = await assetService.assignAsset(organizationId, assetId, userId, condition, signature);
        await (0, onboarding_events_service_1.completeOnboardingTasksForEvent)({ organizationId, employeeId: userId, event: 'ASSET_ASSIGNED', actorId: userReq.id });
        await (0, audit_service_1.logAction)(userReq.id, 'ASSIGN_ASSET', 'Asset', assetId, { assignedTo: userId, signed: !!signature }, req.ip);
        res.json(assignment);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.assignAsset = assignAsset;
const returnAsset = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const { assetId, condition, signature } = req.body;
        const result = await assetService.returnAsset(organizationId, assetId, condition, signature);
        await (0, audit_service_1.logAction)(userReq.id, 'RETURN_ASSET', 'Asset', assetId, { condition, signed: !!signature }, req.ip);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.returnAsset = returnAsset;
const deleteAsset = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const assetId = req.params.id;
        await assetService.deleteAsset(organizationId, assetId);
        await (0, audit_service_1.logAction)(userReq.id, 'DELETE_ASSET', 'Asset', assetId, {}, req.ip);
        res.json({ success: true, message: 'Asset deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteAsset = deleteAsset;
