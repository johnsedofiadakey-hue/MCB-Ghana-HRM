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
exports.exportLogsCSV = exports.getLogs = void 0;
const audit_service_1 = require("../services/audit.service");
const getLogs = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user?.organizationId || 'mcb-ghana-tenant';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const entity = req.query.entity;
        const userId = req.query.userId;
        const data = await (0, audit_service_1.getAuditLogs)(organizationId, page, limit, { entity, userId });
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getLogs = getLogs;
const exportLogsCSV = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq?.organizationId || 'mcb-ghana-tenant';
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prismaLocal = new PrismaClient();
        // Fetch last 5000 audit logs
        const logs = await prismaLocal.systemLog.findMany({
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
        await prismaLocal.$disconnect();
    }
    catch (error) {
        console.error('Audit CSV Export failed:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.exportLogsCSV = exportLogsCSV;
