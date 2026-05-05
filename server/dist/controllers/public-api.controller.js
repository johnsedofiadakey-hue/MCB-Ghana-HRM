"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTargets = exports.getAppraisals = exports.getPayroll = exports.getAttendance = exports.getEmployees = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const data_mapper_1 = require("../utils/data-mapper");
const getOrgId = (req) => req.user?.organizationId;
const getEmployees = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const users = await client_1.default.user.findMany({
            where: { organizationId: orgId, isArchived: false },
            include: { departmentObj: true, subUnit: true, supervisor: true }
        });
        return res.json(users.map(data_mapper_1.mapEmployee));
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
exports.getEmployees = getEmployees;
const getAttendance = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const startDate = req.query.start ? new Date(req.query.start) : new Date(Date.now() - 7 * 86400000); // Default to past 7 days
        const logs = await client_1.default.attendanceLog.findMany({
            where: {
                organizationId: orgId,
                date: { gte: startDate }
            },
            include: { employee: true },
            orderBy: { date: 'desc' },
            take: 1000 // Limit for API performance
        });
        return res.json(logs.map(data_mapper_1.mapAttendance));
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
exports.getAttendance = getAttendance;
const getPayroll = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        // This is a simplified payroll query just for demonstration
        // A production env would handle specific runs or employee queries
        const items = await client_1.default.payrollItem.findMany({
            where: { organizationId: orgId },
            include: { employee: { include: { departmentObj: true } }, run: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        // Quick mapper for payroll items since data-mapper expects `payroll` structure
        const mapped = items.map(item => ({
            id: item.id,
            employeeName: item.employee?.fullName,
            month: item.run?.month,
            year: item.run?.year,
            netPay: item.netPay
        }));
        return res.json(mapped);
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
exports.getPayroll = getPayroll;
const getAppraisals = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const appraisals = await client_1.default.appraisalPacket.findMany({
            where: { organizationId: orgId },
            include: { employee: { include: { departmentObj: true } }, cycle: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        return res.json(appraisals.map(data_mapper_1.mapAppraisal));
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
exports.getAppraisals = getAppraisals;
const getTargets = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const targets = await client_1.default.target.findMany({
            where: { organizationId: orgId, isArchived: false },
            include: { assignee: true, department: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        return res.json(targets.map(data_mapper_1.mapTarget));
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
exports.getTargets = getTargets;
