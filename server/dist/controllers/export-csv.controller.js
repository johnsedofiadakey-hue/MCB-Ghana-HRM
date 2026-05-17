"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPayrollCSV = exports.exportAttendanceCSV = exports.exportEmployeesCSV = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const data_mapper_1 = require("../utils/data-mapper");
// Quick CSV stringifier builder a flat array of objects
const jsonToCsv = (data) => {
    if (data.length === 0)
        return '';
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] ?? '')).join(','))
    ];
    return csvRows.join('\r\n');
};
const getOrgId = (req) => req.user?.organizationId || 'mcb-ghana-tenant';
const exportEmployeesCSV = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const users = await client_1.default.user.findMany({
            where: { organizationId: orgId, isArchived: false },
            include: { departmentObj: true, subUnit: true, supervisor: true }
        });
        const mapped = users.map(data_mapper_1.mapEmployee);
        const csv = jsonToCsv(mapped);
        res.header('Content-Type', 'text/csv');
        res.attachment('employees_export.csv');
        return res.send(csv);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.exportEmployeesCSV = exportEmployeesCSV;
const exportAttendanceCSV = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        // Default to last 30 days if no date param
        const startDate = req.query.start ? new Date(req.query.start) : new Date(Date.now() - 30 * 86400000);
        const logs = await client_1.default.attendanceLog.findMany({
            where: {
                organizationId: orgId,
                date: { gte: startDate }
            },
            include: { employee: true },
            orderBy: { date: 'desc' }
        });
        const mapped = logs.map(data_mapper_1.mapAttendance);
        const csv = jsonToCsv(mapped);
        res.header('Content-Type', 'text/csv');
        res.attachment('attendance_export.csv');
        return res.send(csv);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.exportAttendanceCSV = exportAttendanceCSV;
const exportPayrollCSV = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { runId } = req.query;
        const items = await client_1.default.payrollItem.findMany({
            where: {
                organizationId: orgId,
                ...(runId ? { runId: runId } : {})
            },
            include: { employee: { include: { departmentObj: true } }, run: true },
            orderBy: { createdAt: 'desc' }
        });
        // Manual map to fit schema fields (since Payroll schema above has `user`, not `employee`)
        const mapped = items.map(item => ({
            id: item.id,
            employeeName: item.employee?.fullName,
            month: item.run?.month,
            year: item.run?.year,
            netPay: item.netPay
            // Full mapping would use the data-mapper but we need to adjust standard schema here
        }));
        const csv = jsonToCsv(mapped);
        res.header('Content-Type', 'text/csv');
        res.attachment('payroll_export.csv');
        return res.send(csv);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.exportPayrollCSV = exportPayrollCSV;
