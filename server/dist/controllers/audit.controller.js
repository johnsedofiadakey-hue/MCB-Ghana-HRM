"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportLogsCSV = exports.getAuditUsers = exports.getLogs = void 0;
const audit_service_1 = require("../services/audit.service");
const client_1 = __importDefault(require("../prisma/client"));
const getLogs = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user?.organizationId || 'mcb-ghana-tenant';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const entity = req.query.entity;
        const userId = req.query.userId;
        const action = req.query.action;
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const data = await (0, audit_service_1.getAuditLogs)(organizationId, page, limit, { entity, userId, action, dateFrom, dateTo });
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getLogs = getLogs;
const getAuditUsers = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const users = await client_1.default.auditLog.findMany({
            where: { organizationId, userId: { not: null } },
            select: { userId: true, user: { select: { fullName: true, email: true } } },
            distinct: ['userId'],
            orderBy: { createdAt: 'desc' },
            take: 500,
        });
        res.json(users.filter(u => u.user).map(u => ({ id: u.userId, fullName: u.user.fullName, email: u.user.email })));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAuditUsers = getAuditUsers;
const exportLogsCSV = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq?.organizationId || 'mcb-ghana-tenant';
        // Fetch last 5000 audit logs
        const logs = await client_1.default.systemLog.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: 5000
        });
        const csvHeaders = ['Timestamp', 'Type/Action', 'Source', 'Operator ID', 'IP Address', 'Details'];
        const rows = logs.map(l => [
            new Date(l.createdAt).toISOString(),
            l.type || l.action || 'SYSTEM',
            l.source || 'N/A',
            l.operatorId || 'SYSTEM',
            l.ipAddress || '0.0.0.0',
            // Escape quotes and commas
            `"${(l.details || l.message || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = [csvHeaders.join(','), ...rows.map(r => r.join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit_trail_${new Date().toISOString().split('T')[0]}.csv"`);
        res.status(200).send(csvContent);
    }
    catch (error) {
        console.error('Audit CSV Export failed:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.exportLogsCSV = exportLogsCSV;
