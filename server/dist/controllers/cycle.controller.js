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
exports.deleteCycle = exports.updateCycleStatus = exports.getCycles = exports.createCycle = void 0;
const cycleService = __importStar(require("../services/cycle.service"));
const enterprise_controller_1 = require("./enterprise.controller");
const createCycle = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const cycle = await cycleService.createCycle(organizationId, req.body);
        res.status(201).json(cycle);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createCycle = createCycle;
const getCycles = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const cycles = await cycleService.getCycles(organizationId, req.query);
        res.json(cycles);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getCycles = getCycles;
const updateCycleStatus = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const { id } = req.params;
        const cycle = await cycleService.updateCycle(organizationId, id, req.body);
        res.json(cycle);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateCycleStatus = updateCycleStatus;
const deleteCycle = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const { id } = req.params;
        await cycleService.deleteCycle(organizationId, id);
        res.json({ success: true, message: 'Cycle deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteCycle = deleteCycle;
