"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHistoryStatus = exports.getHistoryByEmployee = exports.createHistory = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const createHistory = async (data) => {
    return client_1.default.employeeHistory.create({
        data: {
            organizationId: data.organizationId,
            employeeId: data.employeeId,
            loggedById: data.loggedById,
            type: data.type,
            title: data.title,
            description: data.description,
            change: data.description || data.title,
            severity: data.severity || 'LOW',
            status: data.status || 'OPEN'
        },
        include: { loggedBy: { select: { fullName: true, jobTitle: true } } }
    });
};
exports.createHistory = createHistory;
const getHistoryByEmployee = async (organizationId, employeeId) => {
    return client_1.default.employeeHistory.findMany({
        where: { employeeId, organizationId },
        orderBy: { createdAt: 'desc' },
        include: { loggedBy: { select: { fullName: true, id: true } } }
    });
};
exports.getHistoryByEmployee = getHistoryByEmployee;
const updateHistoryStatus = async (organizationId, id, status) => {
    return client_1.default.employeeHistory.updateMany({
        where: { id, organizationId },
        data: { status }
    });
};
exports.updateHistoryStatus = updateHistoryStatus;
