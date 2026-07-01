"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeScan = exports.exportAttendanceCSV = exports.getAllAttendance = exports.getMyAttendance = exports.clockOut = exports.clockIn = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const enterprise_controller_1 = require("./enterprise.controller");
const clockIn = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = req.user;
        const employeeId = user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingLog = await client_1.default.attendanceLog.findFirst({
            where: {
                employeeId,
                date: today,
                organizationId
            }
        });
        if (existingLog)
            return res.status(400).json({ error: 'Already clocked in for today.' });
        const log = await client_1.default.attendanceLog.create({
            data: {
                organizationId,
                employeeId,
                date: today,
                clockIn: new Date(),
                status: 'PRESENT'
            }
        });
        res.status(201).json(log);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.clockIn = clockIn;
const clockOut = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'mcb-ghana-tenant';
        const user = req.user;
        const employeeId = user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const log = await client_1.default.attendanceLog.findFirst({
            where: {
                employeeId,
                date: today,
                organizationId
            }
        });
        if (!log)
            return res.status(404).json({ error: 'No active clock-in found for today.' });
        if (log.clockOut)
            return res.status(400).json({ error: 'Already clocked out today.' });
        const updatedLog = await client_1.default.attendanceLog.update({
            where: { id: log.id },
            data: { clockOut: new Date() }
        });
        res.json(updatedLog);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.clockOut = clockOut;
const getMyAttendance = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const user = req.user;
        const employeeId = user.id;
        const logs = await client_1.default.attendanceLog.findMany({
            where: {
                employeeId,
                ...whereOrg
            },
            orderBy: { date: 'desc' },
            take: 30
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getMyAttendance = getMyAttendance;
const getAllAttendance = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const logs = await client_1.default.attendanceLog.findMany({
            where: whereOrg,
            include: { employee: { select: { fullName: true, departmentObj: true } } },
            orderBy: { date: 'desc' },
            take: 100
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAllAttendance = getAllAttendance;
const exportAttendanceCSV = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const logs = await client_1.default.attendanceLog.findMany({
            where: whereOrg,
            include: { employee: { select: { fullName: true, departmentObj: true } } },
            orderBy: { date: 'desc' },
            take: 1000
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
        let csv = 'Employee,Department,Date,Clock In,Clock Out,Status,Source\n';
        logs.forEach(log => {
            csv += `"${log.employee.fullName}","${log.employee.departmentObj?.name || ''}","${log.date.toLocaleDateString()}","${log.clockIn ? log.clockIn.toLocaleTimeString() : ''}","${log.clockOut ? log.clockOut.toLocaleTimeString() : ''}","${log.status}","${log.source}"\n`;
        });
        res.send(csv);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.exportAttendanceCSV = exportAttendanceCSV;
const nodeScan = async (req, res) => {
    try {
        const apiKey = req.headers['authorization'];
        if (!apiKey)
            return res.status(401).json({ error: 'Missing Hardware Node Key' });
        const org = await client_1.default.organization.findFirst({
            where: { attendanceApiKey: apiKey, attendanceScanningEnabled: true }
        });
        if (!org)
            return res.status(401).json({ error: 'Invalid or disabled Hardware Node Key' });
        const { employeeCode } = req.body;
        if (!employeeCode)
            return res.status(400).json({ error: 'Missing Employee Code' });
        const employee = await client_1.default.user.findFirst({
            where: { employeeCode, organizationId: org.id }
        });
        if (!employee)
            return res.status(404).json({ error: 'Employee not found' });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const log = await client_1.default.attendanceLog.findFirst({
            where: { employeeId: employee.id, date: today, organizationId: org.id }
        });
        const now = new Date();
        let result;
        if (!log) {
            result = await client_1.default.attendanceLog.create({
                data: {
                    organizationId: org.id,
                    employeeId: employee.id,
                    date: today,
                    clockIn: now,
                    source: 'HARDWARE_NODE',
                    status: 'PRESENT'
                }
            });
        }
        else if (!log.clockOut) {
            result = await client_1.default.attendanceLog.update({
                where: { id: log.id },
                data: { clockOut: now }
            });
        }
        else {
            return res.status(400).json({ error: 'Already clocked out.' });
        }
        res.json({
            success: true,
            employee: employee.fullName,
            time: now,
            type: !log ? 'CLOCK_IN' : 'CLOCK_OUT'
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.nodeScan = nodeScan;
