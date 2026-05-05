"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataRetentionReport = exports.anonymiseEmployee = exports.exportMyData = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
// Employee requests a copy of all their personal data
const exportMyData = async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        const [user, leaves, appraisals, payslips, notifications, onboarding, training] = await Promise.all([
            client_1.default.user.findUnique({
                where: { id: userId },
                select: {
                    id: true, fullName: true, email: true, jobTitle: true, gender: true,
                    dob: true, nationalId: true, contactNumber: true, address: true,
                    nextOfKinName: true, nextOfKinRelation: true, nextOfKinContact: true,
                    joinDate: true, status: true, role: true, employeeCode: true,
                    departmentObj: { select: { name: true } }
                    // salary excluded — employee can see in payslips, not raw field
                }
            }),
            client_1.default.leaveRequest.findMany({ where: { employeeId: userId }, select: { startDate: true, endDate: true, status: true, reason: true, leaveDays: true } }),
            client_1.default.appraisalPacket.findMany({ where: { employeeId: userId }, select: { status: true, currentStage: true, createdAt: true } }),
            client_1.default.payrollItem.findMany({ where: { employeeId: userId }, select: { run: { select: { period: true } }, grossPay: true, netPay: true, currency: true } }),
            client_1.default.notification.findMany({ where: { userId }, select: { title: true, message: true, type: true, createdAt: true } }),
            client_1.default.onboardingSession.findMany({ where: { employeeId: userId }, select: { template: { select: { name: true } }, progress: true, completedAt: true } }),
            client_1.default.trainingEnrollment.findMany({ where: { employeeId: userId }, select: { program: { select: { title: true } }, status: true, completedAt: true, score: true } })
        ]);
        await (0, audit_service_1.logAction)(userId, 'DATA_EXPORT_REQUEST', 'User', userId, { requestedAt: new Date().toISOString() }, req.ip);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="my-data-export-${new Date().toISOString().split('T')[0]}.json"`);
        res.json({
            exportedAt: new Date().toISOString(),
            notice: 'This export contains all personal data held about you in the HRM platform, in compliance with the Ghana Data Protection Act 2012.',
            personalDetails: user,
            leaveHistory: leaves,
            appraisalHistory: appraisals,
            payrollHistory: payslips,
            notifications,
            onboardingHistory: onboarding,
            trainingHistory: training
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.exportMyData = exportMyData;
// Anonymise a terminated employee record (MD/HR only)
// Replaces PII with anonymised tokens while keeping statistical data
const anonymiseEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        // @ts-ignore
        const actorId = req.user?.id;
        const employee = await client_1.default.user.findUnique({ where: { id: employeeId } });
        if (!employee)
            return res.status(404).json({ error: 'Employee not found' });
        if (employee.status !== 'TERMINATED') {
            return res.status(400).json({ error: 'Can only anonymise TERMINATED employees' });
        }
        const anonId = `ANON-${employeeId.slice(0, 8).toUpperCase()}`;
        await client_1.default.user.update({
            where: { id: employeeId },
            data: {
                fullName: anonId,
                email: `${anonId.toLowerCase()}@anonymised.internal`,
                nationalId: null,
                contactNumber: null,
                address: null,
                nextOfKinName: null,
                nextOfKinContact: null,
                nextOfKinRelation: null,
                dob: null,
                avatarUrl: null,
                gender: null,
                // Retain: role, department, jobTitle, joinDate for statistical purposes
            }
        });
        await (0, audit_service_1.logAction)(actorId, 'EMPLOYEE_ANONYMISED', 'User', employeeId, { anonId }, req.ip);
        res.json({ success: true, message: `Employee record anonymised as ${anonId}` });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.anonymiseEmployee = anonymiseEmployee;
// Data retention: list employees terminated over N months with full PII still intact
const getDataRetentionReport = async (req, res) => {
    try {
        const monthsThreshold = parseInt(req.query.months) || 24;
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - monthsThreshold);
        const stale = await client_1.default.user.findMany({
            where: {
                status: 'TERMINATED',
                updatedAt: { lt: cutoff },
                nationalId: { not: null } // Still has PII
            },
            select: {
                id: true, fullName: true, jobTitle: true, updatedAt: true,
                departmentObj: { select: { name: true } }
            }
        });
        res.json({
            threshold: `${monthsThreshold} months`,
            cutoffDate: cutoff,
            count: stale.length,
            employees: stale,
            recommendation: stale.length > 0 ? 'These records contain PII and should be reviewed for anonymisation.' : 'No action needed.'
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getDataRetentionReport = getDataRetentionReport;
