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
exports.updateStatus = exports.getEmployeeRecords = exports.createRecord = void 0;
const historyService = __importStar(require("../services/history.service"));
const audit_service_1 = require("../services/audit.service");
const policy_service_1 = require("../services/policy.service");
const permissions_1 = require("../types/permissions");
const EMPLOYEE_VISIBLE_TYPES = ['COMMENDATION', 'GENERAL_NOTE'];
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const createRecord = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        if (!req.body.employeeId)
            return res.status(400).json({ message: 'employeeId is required' });
        const record = await historyService.createHistory({
            ...req.body,
            loggedById: user.id,
            organizationId
        });
        await (0, audit_service_1.logAction)(user.id, 'CREATE_HISTORY', 'EmployeeHistory', record.id, { type: record.type, employeeId: record.employeeId }, req.ip);
        res.status(201).json(record);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createRecord = createRecord;
const getEmployeeRecords = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const targetEmployeeId = req.params.employeeId;
        if (targetEmployeeId !== user.id) {
            const access = await policy_service_1.PolicyService.evaluatePolicy(user.id, permissions_1.Permission.EMPLOYEE_HISTORY_READ, {
                targetUserId: targetEmployeeId
            });
            if (!access.allowed)
                return res.status(403).json({ message: 'You cannot view this employee history' });
        }
        const records = await historyService.getHistoryByEmployee(organizationId, targetEmployeeId);
        if (targetEmployeeId === user.id) {
            return res.json(records.filter(r => r.type && EMPLOYEE_VISIBLE_TYPES.includes(r.type)));
        }
        return res.json(records);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getEmployeeRecords = getEmployeeRecords;
const updateStatus = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const status = String(req.body.status || '').toUpperCase();
        if (!ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
        }
        const record = await historyService.updateHistoryStatus(organizationId, req.params.id, status);
        await (0, audit_service_1.logAction)(user?.id, 'UPDATE_HISTORY_STATUS', 'EmployeeHistory', req.params.id, { status }, req.ip);
        res.json(record);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateStatus = updateStatus;
