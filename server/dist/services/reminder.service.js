"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAppraisalReminders = exports.sendLeaveReminders = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("./audit.service");
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);
const sendLeaveReminders = async () => {
    const threshold = hoursAgo(48);
    const pendingLeaves = await client_1.default.leaveRequest.findMany({
        where: {
            status: { in: ['MANAGER_REVIEW', 'SUBMITTED', 'HR_REVIEW'] },
            createdAt: { lt: threshold }
        },
        include: { employee: { select: { fullName: true } } }
    });
    for (const leave of pendingLeaves) {
        await (0, audit_service_1.logAction)(null, 'LEAVE_APPROVAL_REMINDER', 'LeaveRequest', leave.id, {
            employee: leave.employee?.fullName,
            status: leave.status,
            startDate: leave.startDate,
            endDate: leave.endDate
        });
    }
    return pendingLeaves.length;
};
exports.sendLeaveReminders = sendLeaveReminders;
const sendAppraisalReminders = async () => {
    const threshold = hoursAgo(72);
    const pendingPackets = await client_1.default.appraisalPacket.findMany({
        where: {
            status: 'OPEN',
            updatedAt: { lt: threshold }
        },
        include: {
            employee: { select: { fullName: true } },
            cycle: { select: { title: true } }
        }
    });
    for (const packet of pendingPackets) {
        await (0, audit_service_1.logAction)(null, 'APPRAISAL_REMINDER', 'AppraisalPacket', packet.id, {
            employee: packet.employee?.fullName,
            stage: packet.currentStage,
            cycle: packet.cycle?.title
        });
    }
    return pendingPackets.length;
};
exports.sendAppraisalReminders = sendAppraisalReminders;
