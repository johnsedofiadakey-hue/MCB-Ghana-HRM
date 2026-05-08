"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushBiometricLogs = exports.kioskPunch = exports.syncPunches = void 0;
const client_1 = __importDefault(require("../prisma/client"));
/**
 * Biometric Synchronization Controller
 * Handles batch uploads from physical devices or bridge scripts.
 */
const syncPunches = async (req, res) => {
    try {
        const { punches, organizationId: bodyOrgId } = req.body;
        // Multi-tenancy: prioritize orgId from auth user, fallback to body
        const userRole = req.user?.role;
        const organizationId = req.user?.organizationId || bodyOrgId || 'mcb-ghana-tenant';
        // Verification: Only Admin/MD/Developer can sync
        if (userRole && !['MD', 'DEV', 'HR', 'IT_ADMIN', 'IT_MANAGER'].includes(userRole)) {
            return res.status(403).json({ error: 'Access denied: Insufficient permissions for biometric sync.' });
        }
        if (!punches || !Array.isArray(punches)) {
            return res.status(400).json({ error: 'Invalid payload: "punches" array is required.' });
        }
        const results = {
            processed: 0,
            errors: 0,
            skipped: 0,
            details: []
        };
        for (const punch of punches) {
            try {
                const { biometricId, timestamp, type = 'PUNCH' } = punch;
                const punchDate = new Date(timestamp);
                const normalizedDate = new Date(punchDate);
                normalizedDate.setHours(0, 0, 0, 0);
                // 1. Find the employee
                const employee = await client_1.default.user.findFirst({
                    where: { biometricId: biometricId.toString(), organizationId }
                });
                if (!employee) {
                    results.skipped++;
                    results.details.push(`User not found for biometricId: ${biometricId}`);
                    continue;
                }
                // 2. Find or Create Attendance Log for the day
                const existingLog = await client_1.default.attendanceLog.findUnique({
                    where: {
                        employeeId_date: {
                            employeeId: employee.id,
                            date: normalizedDate
                        }
                    }
                });
                if (!existingLog) {
                    await client_1.default.attendanceLog.create({
                        data: {
                            organizationId,
                            employeeId: employee.id,
                            date: normalizedDate,
                            clockIn: punchDate,
                            source: 'BIOMETRIC',
                            status: 'PRESENT'
                        }
                    });
                }
                else {
                    const updateData = { source: 'BIOMETRIC' };
                    if (type === 'CHECKIN' || (!existingLog.clockIn && type === 'PUNCH')) {
                        updateData.clockIn = punchDate;
                    }
                    else if (type === 'CHECKOUT' || (existingLog.clockIn && type === 'PUNCH')) {
                        if (!existingLog.clockIn || punchDate > existingLog.clockIn) {
                            updateData.clockOut = punchDate;
                        }
                    }
                    await client_1.default.attendanceLog.update({
                        where: { id: existingLog.id },
                        data: updateData
                    });
                }
                results.processed++;
            }
            catch (err) {
                results.errors++;
                results.details.push(`Error processing punch for ${punch.biometricId}: ${err.message}`);
            }
        }
        return res.json({
            message: 'Sync completed',
            ...results
        });
    }
    catch (error) {
        console.error('[BiometricSync] Fatal error:', error);
        return res.status(500).json({ error: 'Internal Server Error during sync.' });
    }
};
exports.syncPunches = syncPunches;
const kioskPunch = async (req, res) => {
    try {
        const { employeeCode, type } = req.body;
        const organizationId = req.body.organizationId || 'mcb-ghana-tenant';
        if (!employeeCode || !type) {
            return res.status(400).json({ error: 'employeeCode and type (CHECKIN/CHECKOUT) are required.' });
        }
        const employee = await client_1.default.user.findFirst({
            where: { employeeCode, organizationId, status: 'ACTIVE' }
        });
        if (!employee) {
            return res.status(404).json({ error: 'Invalid Employee Code.' });
        }
        const punchDate = new Date();
        const normalizedDate = new Date(punchDate);
        normalizedDate.setHours(0, 0, 0, 0);
        const existingLog = await client_1.default.attendanceLog.findUnique({
            where: {
                employeeId_date: {
                    employeeId: employee.id,
                    date: normalizedDate
                }
            }
        });
        if (!existingLog) {
            if (type === 'CHECKOUT') {
                return res.status(400).json({ error: 'Cannot checkout without an active clock-in today.' });
            }
            await client_1.default.attendanceLog.create({
                data: {
                    organizationId,
                    employeeId: employee.id,
                    date: normalizedDate,
                    clockIn: punchDate,
                    source: 'KIOSK',
                    status: 'PRESENT'
                }
            });
            return res.json({ message: 'Successfully Clocked In', user: employee.fullName, timestamp: punchDate });
        }
        else {
            if (type === 'CHECKIN') {
                return res.status(400).json({ error: 'You are already clocked in for today.' });
            }
            if (existingLog.clockOut) {
                return res.status(400).json({ error: 'You have already clocked out for today.' });
            }
            await client_1.default.attendanceLog.update({
                where: { id: existingLog.id },
                data: { clockOut: punchDate, source: 'KIOSK' }
            });
            return res.json({ message: 'Successfully Clocked Out', user: employee.fullName, timestamp: punchDate, durationMinutes: Math.round((punchDate.getTime() - existingLog.clockIn.getTime()) / 60000) });
        }
    }
    catch (error) {
        console.error('[KioskPunch] error:', error);
        return res.status(500).json({ error: 'Kiosk malfunction.' });
    }
};
exports.kioskPunch = kioskPunch;
/**
 * Real-time Biometric Push Gateway
 * Specifically designed for hardware device webhooks (ADMS / Cloud Sync)
 */
const pushBiometricLogs = async (req, res) => {
    try {
        const { syncKey, logs } = req.body;
        // Verify System Sync Key
        const VALID_SYNC_KEY = 'NX-BIO-SYNC-8562-XK92';
        if (syncKey !== VALID_SYNC_KEY) {
            return res.status(401).json({ error: 'Invalid synchronization key.' });
        }
        if (!Array.isArray(logs)) {
            return res.status(400).json({ error: 'Invalid log format. Expected array of { biometricId, timestamp, type }.' });
        }
        console.log(`[Biometric Gateway] Received push request with ${logs.length} events.`);
        const results = await Promise.all(logs.map(async (log) => {
            const { biometricId, timestamp, type } = log; // type: 'CLOCK_IN' | 'CLOCK_OUT' | 'CHECKIN' | 'CHECKOUT'
            const punchDate = new Date(timestamp);
            const normalizedDate = new Date(punchDate);
            normalizedDate.setHours(0, 0, 0, 0);
            // 1. Find User by Biometric ID
            const user = await client_1.default.user.findFirst({
                where: { biometricId: String(biometricId), isArchived: false }
            });
            if (!user) {
                return { biometricId, status: 'SKIPPED', reason: 'Identity not recognized' };
            }
            // 2. Map Push Types to Schema Fields
            const isCheckIn = ['CLOCK_IN', 'CHECKIN'].includes(type);
            const isCheckOut = ['CLOCK_OUT', 'CHECKOUT'].includes(type);
            // 3. Upsert Attendance Record
            const existing = await client_1.default.attendanceLog.findUnique({
                where: { employeeId_date: { employeeId: user.id, date: normalizedDate } }
            });
            if (!existing) {
                // Initial log for the day
                await client_1.default.attendanceLog.create({
                    data: {
                        organizationId: user.organizationId,
                        employeeId: user.id,
                        date: normalizedDate,
                        clockIn: isCheckIn ? punchDate : undefined,
                        clockOut: isCheckOut ? punchDate : undefined,
                        source: 'HARDWARE_PUSH',
                        status: 'PRESENT'
                    }
                });
            }
            else {
                // Update existing log
                const data = { source: 'HARDWARE_PUSH' };
                if (isCheckIn)
                    data.clockIn = punchDate;
                if (isCheckOut)
                    data.clockOut = punchDate;
                await client_1.default.attendanceLog.update({
                    where: { id: existing.id },
                    data
                });
            }
            return { biometricId, employee: user.fullName, status: 'SYNCED' };
        }));
        res.json({
            status: 'SUCCESS',
            processed: results.length,
            details: results
        });
    }
    catch (error) {
        console.error('[Biometric Push] Critical fault:', error.stack);
        res.status(500).json({ error: 'Synchronization gateway malfunction.' });
    }
};
exports.pushBiometricLogs = pushBiometricLogs;
